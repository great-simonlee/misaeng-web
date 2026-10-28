import type { CommunityCreditEntry } from '@lib/constants/communityCredit'
import { isStatusCommunityBoard } from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'

import { awardComment, awardProfileComplete, awardReferral, clawbackComment, handleVerificationCompleted, type VerificationKind } from './bonuses.server'
import { endPostBoost } from './boost.server'
import { addVerifiedComponent, clawbackPost, createOrRefreshClaim, getClaimByPost } from './claims.server'
import { getCutoverMs, getPointsEngineState, type PointsEngine } from './engine.server'
import { decodeHistoryCursor, getPointsBalance, getPointsHistory, ledgerNetForSource, type PointsHistoryItem } from './ledger.server'
import { legacyNetEarned } from './legacy.server'
import { nyMonthStart } from './time'

/**
 * THE entry point for the rest of the app. Every function routes to the legacy credit system
 * (src/lib/community/creditLedger.ts, Storage JSON) before cutover, and to the new ledger after it.
 * Event hooks never throw: failures are logged and reported as `{ ok: false }` so the user action that
 * triggered them (posting, commenting, verifying) is never broken by points. See WIRING.md for call sites.
 */

export type HookResult<L, N> =
  | { ok: true; engine: 'legacy'; result: L }
  | { ok: true; engine: 'ledger'; result: N }
  | { ok: false; engine: PointsEngine | null; error: string }

async function hook<L, N>(
  name: string,
  legacy: () => Promise<L>,
  ledger: (cutoverMs: number) => Promise<N>,
): Promise<HookResult<L, N>> {
  let engine: PointsEngine | null = null
  try {
    const state = await getPointsEngineState()
    engine = state.engine
    if (state.engine === 'ledger') {
      const cutoverMs = (await getCutoverMs()) ?? 0
      return { ok: true, engine: 'ledger', result: await ledger(cutoverMs) }
    }
    return { ok: true, engine: 'legacy', result: await legacy() }
  } catch (error) {
    console.error(`Points hook ${name} error:`, error)
    return { ok: false, engine, error: (error as Error)?.message || String(error) }
  }
}

const legacyLedger = () => import('@lib/community/creditLedger')

function legacyTimelineCount(post: CommunityPost): number | undefined {
  if (post.categoryId === 'job-review') return post.jobReviewTimeline?.length ?? 0
  if (isStatusCommunityBoard(post.categoryId)) return post.cptOptTimeline?.length ?? 0
  return undefined
}

// MARK: posts

/** After a community post is saved for the first time (POST /api/community). */
export function onPostCreated(input: { uid: string; post: CommunityPost }) {
  return hook(
    'onPostCreated',
    async () =>
      (await legacyLedger()).awardPostCredit({
        uid: input.uid,
        postId: input.post.id,
        boardId: input.post.categoryId,
        timelineCount: legacyTimelineCount(input.post),
      }),
    (cutoverMs) => createOrRefreshClaim(input.post, { cutoverMs }),
  )
}

/** After a post edit is saved (PATCH /api/community/[id]): legacy tops up timeline credit, ledger refreshes a pending claim. */
export function onPostUpdated(input: { uid: string; post: CommunityPost }) {
  return hook(
    'onPostUpdated',
    async () =>
      (await legacyLedger()).awardPostCredit({
        uid: input.uid,
        postId: input.post.id,
        boardId: input.post.categoryId,
        timelineCount: legacyTimelineCount(input.post),
      }),
    (cutoverMs) => createOrRefreshClaim(input.post, { cutoverMs }),
  )
}

/** A guest post got linked to an account (src/lib/community/guestLink.server.ts). */
export function onGuestPostLinked(input: { uid: string; post: CommunityPost; linkedAt?: number }) {
  return hook(
    'onGuestPostLinked',
    async () =>
      (await legacyLedger()).awardPostCredit({
        uid: input.uid,
        postId: input.post.id,
        boardId: input.post.categoryId,
        timelineCount: legacyTimelineCount(input.post),
      }),
    (cutoverMs) =>
      createOrRefreshClaim({ ...input.post, authorUid: input.uid }, { cutoverMs, eventAt: input.linkedAt ?? Date.now() }),
  )
}

/** After the author deleted a post: takes back what it earned (legacy did the same) and ends its boost. */
export function onPostDeleted(input: { uid: string; postId: string }) {
  return hook(
    'onPostDeleted',
    async () =>
      (await legacyLedger()).revokeSourceCredit({
        uid: input.uid,
        sourceId: input.postId,
        reasons: ['food', 'status', 'job-review', 'review-bonus'],
      }),
    async () => {
      const result = await clawbackPost({ postId: input.postId, uid: input.uid, reason: 'post_deleted', actor: null, notify: false })
      // a deleted roommate post must not keep holding one of the board's top slots (no refund)
      await endPostBoost(input.postId).catch((error) => console.error('Points endPostBoost failed:', error))
      return result
    },
  )
}

/**
 * What deleting a post would take back, for the delete confirmation (GET /api/community/[id]/deletion-preview).
 * `clawback` = points already paid for the post (same sum onPostDeleted takes), `pendingCancel` = the unpaid
 * part of a pending review claim that deleting cancels. Read-only.
 */
export async function previewPostDeletion(input: { uid: string; postId: string }): Promise<{
  engine: PointsEngine
  clawback: number
  pendingCancel: number
}> {
  const reasons = ['food', 'status', 'job-review', 'review-bonus'] as const
  const state = await getPointsEngineState()
  if (state.engine !== 'ledger') {
    return {
      engine: state.engine,
      clawback: await legacyNetEarned(input.uid, input.postId, [...reasons]),
      pendingCancel: 0,
    }
  }
  const [net, extra, claim] = await Promise.all([
    ledgerNetForSource(input.uid, 'post', input.postId),
    legacyNetEarned(input.uid, input.postId, [...reasons]),
    getClaimByPost(input.postId),
  ])
  let pendingCancel = 0
  if (claim?.status === 'pending') {
    for (const [component, amount] of Object.entries(claim.requested)) {
      if (typeof claim.components[component as keyof typeof claim.components] === 'number') continue
      pendingCancel += Math.max(0, Math.trunc(amount ?? 0))
    }
  }
  return { engine: 'ledger', clawback: Math.max(0, net + extra), pendingCancel }
}

/**
 * Legacy "final result review bonus" (+20, POST /api/community/credit-reviews approve). After cutover the claim
 * decision (/api/internal/points/claims/[id]/decision) replaces it, so this does nothing on the ledger.
 */
export function awardForReviewBonus(input: { uid: string; postId: string }) {
  return hook(
    'awardForReviewBonus',
    async () => (await legacyLedger()).awardReviewBonusCredit(input),
    async () => ({ skipped: 'replaced_by_claims' as const }),
  )
}

/** Verification-documents hook (spec ch.5): a document for this post was approved → `verified` component. */
export function onReviewDocumentVerified(input: { postId: string; actor: string | null }) {
  return hook(
    'onReviewDocumentVerified',
    async () => ({ applied: false as const, reason: 'legacy' as const }),
    () => addVerifiedComponent(input.postId, input.actor),
  )
}

// MARK: comments

export function onCommentCreated(input: {
  uid: string
  commentId: string
  postId: string
  boardId: string | null
  postAuthorUid: string | null
  parentAuthorUid: string | null
  body: string
}) {
  return hook(
    'onCommentCreated',
    async () =>
      (await legacyLedger()).awardCommentCredit({
        uid: input.uid,
        commentId: input.commentId,
        postId: input.postId,
        boardId: input.boardId,
        postAuthorUid: input.postAuthorUid,
        parentAuthorUid: input.parentAuthorUid,
      }),
    () => awardComment(input),
  )
}

/** Call once per deleted comment (also for replies deleted with their parent), with that comment's author. */
export function onCommentDeleted(input: { uid: string; commentId: string }) {
  return hook(
    'onCommentDeleted',
    async () =>
      (await legacyLedger()).revokeSourceCredit({ uid: input.uid, sourceId: input.commentId, reasons: ['comment'] }),
    () => clawbackComment(input.uid, input.commentId),
  )
}

// MARK: account

/**
 * A verification completed: 'school_email' (code confirmed), 'work_email' (workplace approved by ERP),
 * 'instagram' (approved by ERP). `identifier` = the verified email / handle (used for the one-account check).
 * Legacy: school → +5 school-verify bonus (work / instagram had no legacy bonus).
 * Ledger: welcome / instagram reward, then referral reward for the referrer, then profile bonus.
 */
export function onVerificationCompleted(uid: string, kind: VerificationKind, identifier?: string | null) {
  return hook(
    'onVerificationCompleted',
    async () => (kind === 'school_email' ? (await legacyLedger()).awardSchoolVerifyCredit(uid) : null),
    () => handleVerificationCompleted(uid, kind, identifier),
  )
}

/** Call when a profile save turns the required fields from incomplete to complete. */
export function onProfileCompleted(uid: string) {
  return hook(
    'onProfileCompleted',
    async () => null,
    () => awardProfileComplete(uid),
  )
}

/** A user entered someone's referral code. Legacy pays the referrer at bind time; the ledger pays on verification. */
export function onReferralBound(input: { referrerUid: string; referredUid: string }) {
  return hook(
    'onReferralBound',
    async () => (await legacyLedger()).awardReferralBindCredit(input),
    () => awardReferral(input.referredUid),
  )
}

/** The referred user completed school/work verification (also done inside onVerificationCompleted). */
export function onReferralQualified(referredUid: string) {
  return hook(
    'onReferralQualified',
    async () => null,
    () => awardReferral(referredUid),
  )
}

// MARK: reads (used by /api/points/balance and /api/points/history)

export type PointsSummary = {
  engine: PointsEngine
  balance: number
  held: number
  available: number
  monthSpent: number
  freeUnlocksUsed: number | null
  activeHolds: { id: string; amount: number; sourceType: string; sourceId: string; createdAt: string }[]
}

export async function getPointsSummary(uid: string): Promise<PointsSummary> {
  const { engine } = await getPointsEngineState()
  if (engine === 'ledger') {
    const b = await getPointsBalance(uid)
    return { engine, ...b }
  }
  const { getCommunityCreditLedger } = await legacyLedger()
  const ledger = await getCommunityCreditLedger(uid, 100)
  const monthStart = nyMonthStart().getTime()
  const monthSpent = ledger.entries
    .filter((e) => e.kind === 'spend' && e.createdAt >= monthStart)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0)
  return {
    engine,
    balance: ledger.balance,
    held: 0,
    available: ledger.balance,
    monthSpent,
    freeUnlocksUsed: null,
    activeHolds: [],
  }
}

function legacyItem(entry: CommunityCreditEntry): PointsHistoryItem {
  return {
    id: `legacy_${entry.id}`,
    entryType: entry.kind === 'earn' ? 'earn' : entry.kind === 'spend' ? 'spend' : entry.kind === 'revoke' ? 'clawback' : 'adjust',
    amount: entry.amount,
    reason: `legacy.${entry.reason}`,
    sourceType: 'legacy',
    sourceId: entry.sourceId ?? null,
    createdAt: new Date(entry.createdAt).toISOString(),
    note: null,
    legacy: true,
    legacyLabel: entry.label,
  }
}

export async function getPointsHistoryFor(
  uid: string,
  cursor: string | null,
  limit = 30,
): Promise<{ engine: PointsEngine; items: PointsHistoryItem[]; nextCursor: string | null }> {
  const { engine } = await getPointsEngineState()
  if (engine === 'ledger') return { engine, ...(await getPointsHistory(uid, cursor, limit)) }

  const parsed = decodeHistoryCursor(cursor)
  if (!parsed) throw new Error('Invalid cursor')
  const { getCommunityCreditLedger } = await legacyLedger()
  const ledger = await getCommunityCreditLedger(uid, 100)
  const all = ledger.entries
    .map(legacyItem)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1))
  const pos = parsed.g
  const rest = pos ? all.filter((i) => i.createdAt < pos.t || (i.createdAt === pos.t && i.id < pos.id)) : all
  const size = Math.min(Math.max(Math.trunc(limit) || 30, 1), 100)
  const items = rest.slice(0, size)
  const last = items[items.length - 1]
  const nextCursor =
    rest.length > size && last
      ? Buffer.from(JSON.stringify({ g: { t: last.createdAt, id: last.id } }), 'utf8').toString('base64url')
      : null
  return { engine, items, nextCursor }
}

export { isPointsLedgerActive, getPointsEngineState } from './engine.server'
export type { VerificationKind } from './bonuses.server'
