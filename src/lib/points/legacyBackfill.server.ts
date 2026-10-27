import { creditReasonForBoard, planCreditBackfill } from '@lib/community/creditLedger'
import type { CommunityCreditAccount } from '@lib/constants/communityCredit'
import { NYC_COMMUNITY_BOARD_IDS } from '@lib/constants/nyc'
import { listStoredOpenBoardPosts } from '@lib/supabase/community.server'
import {
  getStoredCommunityCreditAccountStrict,
  isCommunityCreditStorageConfigured,
  saveStoredCommunityCreditAccount,
} from '@lib/supabase/communityCredit.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import type { CommunityPost } from '@/types/nyc'

/**
 * One-time legacy credit backfill for EVERY user, run before the points cutover (decision 2026-10-26).
 *
 * The legacy system only credits old posts / the school-verify bonus lazily, when a user opens their credit
 * page (`ensureCreditBackfill`). Users who never did would carry over a too-small balance at cutover
 * (`legacy:opening:{uid}`), so this job applies the same rules (`planCreditBackfill`) to everybody.
 *
 * Candidates = authors of open posts on earning boards ∪ profile folders in the avatar bucket (for the school
 * bonus), sorted by uid; processed in batches after `cursor`. Idempotent: the plan only adds what is missing,
 * so a second run changes nothing. Dry run computes the same plan without writing.
 */

export type LegacyBackfillUserResult = {
  uid: string
  /** points the backfill adds (0 = nothing to do) */
  added: number
  addedEntries: number
  balanceBefore: number
  balanceAfter: number
  hadAccount: boolean
  error?: string
}

export type LegacyBackfillBatch = {
  dryRun: boolean
  scanned: number
  candidatesTotal: number
  changedUsers: number
  addedPoints: number
  errors: number
  results: LegacyBackfillUserResult[]
  nextCursor: string | null
  done: boolean
}

const LIST_PAGE_SIZE = 1000
const CONCURRENCY = 5

/** Root folders of the avatar bucket = one per user (`{uid}/profile.json`), plus a few non-user prefixes. */
async function listProfileFolders(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return []
  const bucket = getSupabaseAvatarBucket()
  const folders: string[] = []
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: LIST_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Profile folder list failed (HTTP ${res.status})`)
    const items = (await res.json().catch(() => null)) as Array<{ name?: string; id?: string | null }> | null
    if (!items?.length) break
    // folders come back with id = null
    for (const item of items) if (item.id == null && item.name) folders.push(item.name)
    if (items.length < LIST_PAGE_SIZE) break
  }
  return folders
}

/** Open posts on boards that earned legacy credit, grouped by author uid (uses the 60 s post list cache). */
async function postsByAuthor(): Promise<Map<string, CommunityPost[]>> {
  const boards = NYC_COMMUNITY_BOARD_IDS.filter((id) => creditReasonForBoard(id) !== null)
  const lists = await Promise.all(boards.map((board) => listStoredOpenBoardPosts(board)))
  const out = new Map<string, CommunityPost[]>()
  const seen = new Set<string>()
  for (const post of lists.flat()) {
    if (!post.authorUid || seen.has(post.id)) continue
    seen.add(post.id)
    const list = out.get(post.authorUid)
    if (list) list.push(post)
    else out.set(post.authorUid, [post])
  }
  return out
}

function emptyAccount(uid: string): CommunityCreditAccount {
  return { uid, balance: 0, entries: [], bonusesClaimed: [], backfilledAt: null, updatedAt: Date.now() }
}

async function backfillOne(
  uid: string,
  posts: CommunityPost[],
  dryRun: boolean,
): Promise<LegacyBackfillUserResult | null> {
  const profile = await getSupabaseProfile(uid)
  // not a user folder (or a user with nothing to credit): skip without reading / writing anything
  if (!posts.length && !profile?.schoolEmailVerified) return null

  const stored = await getStoredCommunityCreditAccountStrict(uid)
  const current = stored ?? emptyAccount(uid)
  const { next, changed } = planCreditBackfill(current, posts, profile)
  const addedEntries = next.entries.length - current.entries.length
  const result: LegacyBackfillUserResult = {
    uid,
    added: next.balance - current.balance,
    addedEntries,
    balanceBefore: current.balance,
    balanceAfter: next.balance,
    hadAccount: Boolean(stored),
  }
  if (!changed) return result
  if (!dryRun) {
    await saveStoredCommunityCreditAccount({
      ...next,
      backfilledAt: next.backfilledAt ?? Date.now(),
      updatedAt: Date.now(),
    })
  }
  return result
}

export function isLegacyBackfillConfigured() {
  return isCommunityCreditStorageConfigured()
}

export async function runLegacyBackfillBatch(input: {
  cursor: string | null
  limit: number
  dryRun: boolean
}): Promise<LegacyBackfillBatch> {
  const [folders, authored] = await Promise.all([listProfileFolders(), postsByAuthor()])
  const candidates = [...new Set([...folders, ...authored.keys()])].sort()
  const after = input.cursor ?? ''
  const pending = candidates.filter((uid) => uid > after)
  const batch = pending.slice(0, input.limit)

  const results: LegacyBackfillUserResult[] = []
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY)
    const settled = await Promise.all(
      chunk.map(async (uid) => {
        try {
          return await backfillOne(uid, authored.get(uid) ?? [], input.dryRun)
        } catch (error) {
          return {
            uid,
            added: 0,
            addedEntries: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            hadAccount: false,
            error: (error as Error)?.message || String(error),
          } satisfies LegacyBackfillUserResult
        }
      }),
    )
    for (const item of settled) if (item) results.push(item)
  }

  const changed = results.filter((r) => r.addedEntries > 0)
  const last = batch[batch.length - 1]
  const done = pending.length <= batch.length
  return {
    dryRun: input.dryRun,
    scanned: batch.length,
    candidatesTotal: candidates.length,
    changedUsers: changed.length,
    addedPoints: changed.reduce((sum, r) => sum + r.added, 0),
    errors: results.filter((r) => r.error).length,
    // only users with something to add (or an error) are listed, to keep the response small
    results: results.filter((r) => r.addedEntries > 0 || r.error),
    nextCursor: done || !last ? null : last,
    done,
  }
}
