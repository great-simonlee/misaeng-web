import type { CommunityCreditAccount, CommunityCreditEarnReason, CommunityCreditEntry } from '@lib/constants/communityCredit'
import { getStoredCommunityCreditAccount, isCommunityCreditStorageConfigured } from '@lib/supabase/communityCredit.server'
import { TtlCache } from '@lib/supabase/listCache.server'

import { enc, pointsRest } from './rest.server'

/**
 * Read-only bridge to the legacy credit JSON (community-credits/{uid}.json) after cutover.
 * After cutover the JSON is never written again: its balance is carried over once into the ledger as one
 * 'adjust' row (`legacy:opening:{uid}`), and its entries are shown (read-only) in the merged history.
 */

const legacyCache = new TtlCache<CommunityCreditAccount | null>(5 * 60_000, 2000)

export function legacyOpeningKey(uid: string) {
  return `legacy:opening:${uid}`
}

/**
 * Whether the legacy JSON exists: true / false (404), throws on any other failure. The legacy reader returns an
 * empty account for every failure, which must not be mistaken for "no legacy balance" at carry-over time.
 */
async function legacyObjectExists(uid: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return false
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const preferred = process.env.SUPABASE_HOUSING_BUCKET?.trim() || 'housing'
  for (const bucket of [...new Set([preferred, 'avatars'])]) {
    const bucketRes = await fetch(`${url}/storage/v1/bucket/${bucket}`, { headers, signal: AbortSignal.timeout(8000) })
    if (!bucketRes.ok) continue
    // Same bucket choice as communityCredit.server.ts: the first bucket that exists
    const res = await fetch(`${url}/storage/v1/object/${bucket}/community-credits/${encodeURIComponent(uid)}.json`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000),
    })
    await res.arrayBuffer().catch(() => undefined)
    if (res.ok) return true
    // Storage answers a missing object with 404, or 400 + {"statusCode":"404"} on older versions
    if (res.status === 404 || res.status === 400) return false
    throw new Error(`Legacy credit read failed (HTTP ${res.status})`)
  }
  return false
}

/** The stored legacy account (null = none / Storage not configured). Never writes. Throws if the read failed. */
export function readLegacyAccount(uid: string): Promise<CommunityCreditAccount | null> {
  return legacyCache.get(uid, async () => {
    if (!isCommunityCreditStorageConfigured()) return null
    if (!(await legacyObjectExists(uid))) return null
    return getStoredCommunityCreditAccount(uid)
  })
}

/** Same rule as the legacy summary: if the stored balance disagrees with the entries, the entries win. */
export function legacyBalanceOf(account: CommunityCreditAccount | null): number {
  if (!account) return 0
  const computed = account.entries.reduce((sum, entry) => sum + entry.amount, 0)
  return computed === account.balance ? account.balance : computed
}

const openingDone = new Set<string>()

/**
 * Carries the legacy balance into the ledger on first access after cutover (idempotent, race-safe:
 * the unique idempotency key makes a concurrent second insert a no-op). Call before any balance read or spend.
 */
export async function ensureLegacyOpening(uid: string): Promise<void> {
  if (openingDone.has(uid)) return
  const key = legacyOpeningKey(uid)
  const existing = await pointsRest<{ id: string }[]>(`point_ledger?idempotency_key=eq.${enc(key)}&select=id`)
  if (!existing?.length) {
    // throws if Storage failed, so a transient error never records a 0 opening that hides a real balance
    const account = await readLegacyAccount(uid)
    const amount = legacyBalanceOf(account)
    await pointsRest('point_ledger?on_conflict=idempotency_key', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: JSON.stringify({
        user_id: uid,
        entry_type: 'adjust',
        amount,
        reason: 'legacy_opening',
        source_type: 'legacy',
        source_id: uid,
        idempotency_key: key,
        note: `Legacy credit balance carried over (${account?.entries.length ?? 0} entries)`,
      }),
    })
  }
  openingDone.add(uid)
  if (openingDone.size > 50_000) openingDone.clear()
}

/** Legacy one-time bonuses ('school-verify', 'first-post') the user already received. */
export async function legacyBonusesClaimed(uid: string): Promise<Set<string>> {
  const account = await readLegacyAccount(uid)
  return new Set(account?.bonusesClaimed ?? [])
}

/** Net legacy earnings for a source (earned − revoked), e.g. a comment id or `referral:{uid}`. */
export async function legacyNetEarned(
  uid: string,
  sourceId: string,
  reasons?: CommunityCreditEarnReason[],
): Promise<number> {
  const account = await readLegacyAccount(uid)
  if (!account) return 0
  let net = 0
  for (const entry of account.entries) {
    if (entry.sourceId !== sourceId) continue
    if (reasons && !reasons.includes(entry.reason as CommunityCreditEarnReason)) continue
    if (entry.kind === 'earn') net += entry.amount
    else if (entry.kind === 'revoke') net -= Math.abs(entry.amount)
  }
  return Math.max(0, net)
}

export type LegacyHistoryEntry = {
  id: string
  entryType: 'earn' | 'spend' | 'clawback' | 'adjust'
  amount: number
  reason: string
  label: string
  sourceId: string | null
  createdAt: string
  legacy: true
}

function legacyEntryType(kind: CommunityCreditEntry['kind']): LegacyHistoryEntry['entryType'] {
  if (kind === 'earn') return 'earn'
  if (kind === 'spend') return 'spend'
  if (kind === 'revoke') return 'clawback'
  return 'adjust'
}

/** Legacy entries made before cutover, newest first (shown read-only in the merged history). */
export async function legacyHistory(uid: string, cutoverMs: number | null): Promise<LegacyHistoryEntry[]> {
  const account = await readLegacyAccount(uid)
  if (!account) return []
  return account.entries
    .filter((entry) => cutoverMs === null || entry.createdAt < cutoverMs)
    .map((entry) => ({
      id: `legacy_${entry.id}`,
      entryType: legacyEntryType(entry.kind),
      amount: entry.amount,
      reason: `legacy.${entry.reason}`,
      label: entry.label,
      sourceId: entry.sourceId ?? null,
      createdAt: new Date(entry.createdAt).toISOString(),
      legacy: true as const,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1))
}
