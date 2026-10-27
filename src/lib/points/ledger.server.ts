import { getCutoverMs } from './engine.server'
import { pointsErrors } from './errors'
import { ensureLegacyOpening, legacyHistory, type LegacyHistoryEntry } from './legacy.server'
import { enc, pointsRest, pointsRpc, type PointsRpcResult } from './rest.server'
import { nyMonthStart } from './time'

/**
 * New ledger operations (supabase/points.sql). Callers must check `isPointsLedgerActive()` first
 * (the facade does). Every op that depends on the balance carries the legacy balance over first.
 */

export type PointsState = { balance: number; held: number; available: number }

function stateOf(result: PointsRpcResult | null | undefined): PointsState {
  return {
    balance: Math.trunc(result?.balance ?? 0),
    held: Math.trunc(result?.held ?? 0),
    available: Math.trunc(result?.available ?? 0),
  }
}

export async function getPointsState(uid: string): Promise<PointsState> {
  await ensureLegacyOpening(uid)
  return stateOf(await pointsRpc<PointsRpcResult>('point_state', { p_user_id: uid }))
}

export type PointsBalance = PointsState & {
  /** points spent this month (America/New_York) */
  monthSpent: number
  freeUnlocksUsed: number
  activeHolds: { id: string; amount: number; sourceType: string; sourceId: string; createdAt: string }[]
}

export async function getPointsBalance(uid: string): Promise<PointsBalance> {
  const state = await getPointsState(uid)
  const since = nyMonthStart().toISOString()
  const [spends, freeUnlocks, holds] = await Promise.all([
    pointsRest<{ amount: number }[]>(
      `point_ledger?user_id=eq.${enc(uid)}&entry_type=eq.spend&created_at=gte.${enc(since)}&select=amount`,
    ),
    pointsRest<{ post_id: string }[]>(`content_unlocks?user_id=eq.${enc(uid)}&method=eq.free_quota&select=post_id`),
    pointsRest<{ id: string; amount: number; source_type: string; source_id: string; created_at: string }[]>(
      `point_holds?user_id=eq.${enc(uid)}&status=eq.held&select=id,amount,source_type,source_id,created_at&order=created_at.desc`,
    ),
  ])
  return {
    ...state,
    monthSpent: (spends ?? []).reduce((sum, row) => sum - row.amount, 0),
    freeUnlocksUsed: freeUnlocks?.length ?? 0,
    activeHolds: (holds ?? []).map((h) => ({
      id: h.id,
      amount: h.amount,
      sourceType: h.source_type,
      sourceId: h.source_id,
      createdAt: h.created_at,
    })),
  }
}

// MARK: history (ledger rows merged with legacy entries made before cutover)

export type PointsHistoryItem = {
  id: string
  entryType: 'earn' | 'spend' | 'hold' | 'release' | 'clawback' | 'adjust'
  amount: number
  /** ledger reason ('review.base', 'comment', ...) or 'legacy.<legacy reason>' */
  reason: string
  sourceType: string | null
  sourceId: string | null
  createdAt: string
  note: string | null
  legacy: boolean
  /** legacy entries keep their stored (Korean) label */
  legacyLabel?: string
}

type LedgerRow = {
  id: string
  entry_type: PointsHistoryItem['entryType']
  amount: number
  reason: string
  source_type: string | null
  source_id: string | null
  created_at: string
  note: string | null
}

/** Per-list resume positions, so the two sorted lists merge without skipping or repeating. */
type HistoryCursor = { l?: { t: string; id: string }; g?: { t: string; id: string } }

function encodeCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeHistoryCursor(raw: string | null | undefined): HistoryCursor | null {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as HistoryCursor
    const ok = (p?: { t: string; id: string }) => !p || (typeof p.t === 'string' && typeof p.id === 'string')
    return parsed && typeof parsed === 'object' && ok(parsed.l) && ok(parsed.g) ? parsed : null
  } catch {
    return null
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function olderThan(item: { createdAt: string; id: string }, pos: { t: string; id: string }) {
  return item.createdAt < pos.t || (item.createdAt === pos.t && item.id < pos.id)
}

export async function getPointsHistory(
  uid: string,
  cursorRaw: string | null,
  limitRaw = 30,
): Promise<{ items: PointsHistoryItem[]; nextCursor: string | null }> {
  const cursor = decodeHistoryCursor(cursorRaw)
  if (!cursor) throw new Error('Invalid cursor')
  const limit = Math.min(Math.max(Math.trunc(limitRaw) || 30, 1), 100)
  await ensureLegacyOpening(uid)

  let ledgerFilter = ''
  if (cursor.l) {
    const t = enc(cursor.l.t)
    ledgerFilter = UUID.test(cursor.l.id)
      ? `&or=${enc(`(created_at.lt.${cursor.l.t},and(created_at.eq.${cursor.l.t},id.lt.${cursor.l.id}))`)}`
      : `&created_at=lt.${t}`
  }
  const [rows, legacyAll] = await Promise.all([
    pointsRest<LedgerRow[]>(
      `point_ledger?user_id=eq.${enc(uid)}&reason=neq.legacy_opening${ledgerFilter}` +
        `&select=id,entry_type,amount,reason,source_type,source_id,created_at,note&order=created_at.desc,id.desc&limit=${limit + 1}`,
    ),
    getCutoverMs().then((ms) => legacyHistory(uid, ms)),
  ])

  const ledger: PointsHistoryItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    entryType: r.entry_type,
    amount: r.amount,
    reason: r.reason,
    sourceType: r.source_type,
    sourceId: r.source_id,
    createdAt: r.created_at,
    note: r.note,
    legacy: false,
  }))
  const legacy: PointsHistoryItem[] = legacyAll
    .filter((entry: LegacyHistoryEntry) => !cursor.g || olderThan(entry, cursor.g))
    .map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      amount: entry.amount,
      reason: entry.reason,
      sourceType: 'legacy',
      sourceId: entry.sourceId,
      createdAt: entry.createdAt,
      note: null,
      legacy: true,
      legacyLabel: entry.label,
    }))

  const items: PointsHistoryItem[] = []
  let li = 0
  let gi = 0
  let lastL = cursor.l
  let lastG = cursor.g
  while (items.length < limit && (li < ledger.length || gi < legacy.length)) {
    const a = ledger[li]
    const b = legacy[gi]
    const takeLedger = a && (!b || Date.parse(a.createdAt) >= Date.parse(b.createdAt))
    if (takeLedger) {
      items.push(a)
      lastL = { t: a.createdAt, id: a.id }
      li += 1
    } else {
      items.push(b)
      lastG = { t: b.createdAt, id: b.id }
      gi += 1
    }
  }
  const more = li < ledger.length || gi < legacy.length
  return { items, nextCursor: more ? encodeCursor({ l: lastL, g: lastG }) : null }
}

// MARK: writes

export type EarnInput = {
  uid: string
  amount: number
  reason: string
  sourceType: string
  sourceId: string
  key: string
  cap?: { reasons: string[]; window: 'day' | 'month'; mode: 'sum' | 'count'; limit: number } | null
  createdBy?: string | null
  note?: string | null
}

export type EarnResult = PointsState & { ok: boolean; duplicate: boolean; amount: number; capped: boolean }

export async function earnPoints(input: EarnInput): Promise<EarnResult> {
  if (input.amount <= 0) return { ok: false, duplicate: false, amount: 0, capped: false, balance: 0, held: 0, available: 0 }
  await ensureLegacyOpening(input.uid)
  const result = await pointsRpc<PointsRpcResult>('earn_points', {
    p_user_id: input.uid,
    p_amount: input.amount,
    p_reason: input.reason,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_idempotency_key: input.key,
    p_cap_reasons: input.cap ? input.cap.reasons : null,
    p_cap_window: input.cap ? input.cap.window : null,
    p_cap_mode: input.cap ? input.cap.mode : 'sum',
    p_cap_limit: input.cap ? input.cap.limit : null,
    p_created_by: input.createdBy ?? null,
    p_note: input.note ?? null,
  })
  return {
    ...stateOf(result),
    ok: Boolean(result?.ok),
    duplicate: Boolean(result?.duplicate),
    amount: Math.trunc(result?.amount ?? 0),
    capped: result?.error === 'cap',
  }
}

function throwForRpcError(result: PointsRpcResult): never {
  if (result.error === 'insufficient') throw pointsErrors.insufficient(result.required ?? 0, result.available ?? 0)
  if (result.error === 'monthly_cap') throw pointsErrors.monthlyCap()
  if (result.error === 'disabled' || result.error === 'invalid_amount') throw pointsErrors.disabled()
  throw new Error(`Points operation failed: ${result.error ?? 'unknown'}`)
}

export async function spendPoints(input: {
  uid: string
  amount: number
  reason: string
  sourceType: string
  sourceId: string
  key: string
  monthlyCap?: number | null
  createdBy?: string | null
  note?: string | null
}): Promise<PointsState & { ledgerId: string; duplicate: boolean }> {
  await ensureLegacyOpening(input.uid)
  const result = await pointsRpc<PointsRpcResult>('spend_points', {
    p_user_id: input.uid,
    p_amount: input.amount,
    p_reason: input.reason,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_idempotency_key: input.key,
    p_monthly_cap: input.monthlyCap ?? null,
    p_created_by: input.createdBy ?? null,
    p_note: input.note ?? null,
  })
  if (!result?.ok) throwForRpcError(result ?? { ok: false })
  return { ...stateOf(result), ledgerId: String(result.ledger_id ?? ''), duplicate: Boolean(result.duplicate) }
}

export async function holdPoints(input: {
  uid: string
  amount: number
  sourceType: string
  sourceId: string
  key: string
  createdBy?: string | null
  note?: string | null
}): Promise<PointsState & { holdId: string; duplicate: boolean }> {
  await ensureLegacyOpening(input.uid)
  const result = await pointsRpc<PointsRpcResult>('hold_points', {
    p_user_id: input.uid,
    p_amount: input.amount,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_idempotency_key: input.key,
    p_created_by: input.createdBy ?? null,
    p_note: input.note ?? null,
  })
  if (!result?.ok) throwForRpcError(result ?? { ok: false })
  return { ...stateOf(result), holdId: String(result.hold_id ?? ''), duplicate: Boolean(result.duplicate) }
}

export async function captureHold(holdId: string, reason: string, actor?: string | null, note?: string | null) {
  const result = await pointsRpc<PointsRpcResult>('capture_hold', {
    p_hold_id: holdId,
    p_reason: reason,
    p_created_by: actor ?? null,
    p_note: note ?? null,
  })
  if (!result?.ok) throw new Error(`capture_hold failed: ${result?.error ?? 'unknown'}`)
  return { ...stateOf(result), ledgerId: String(result.ledger_id ?? ''), duplicate: Boolean(result.duplicate) }
}

export async function releaseHold(holdId: string, actor?: string | null, note?: string | null) {
  const result = await pointsRpc<PointsRpcResult>('release_hold', {
    p_hold_id: holdId,
    p_created_by: actor ?? null,
    p_note: note ?? null,
  })
  if (!result?.ok) throw new Error(`release_hold failed: ${result?.error ?? 'unknown'}`)
  return { ...stateOf(result), duplicate: Boolean(result.duplicate) }
}

export type UnlockOutcome = PointsState & {
  unlocked: true
  method: 'free_period' | 'free_quota' | 'points' | 'subscription'
  charged: number
  already: boolean
  freeRemaining: number | null
}

export async function unlockPostRpc(input: {
  uid: string
  postId: string
  paywallEnabled: boolean
  cost: number
  freeQuota: number
  freeQuotaAllowed: boolean
}): Promise<UnlockOutcome> {
  await ensureLegacyOpening(input.uid)
  const result = await pointsRpc<PointsRpcResult>('unlock_post', {
    p_user_id: input.uid,
    p_post_id: input.postId,
    p_paywall_enabled: input.paywallEnabled,
    p_cost: input.cost,
    p_free_quota: input.freeQuota,
    p_free_quota_allowed: input.freeQuotaAllowed,
  })
  if (!result?.ok) throwForRpcError(result ?? { ok: false })
  return {
    ...stateOf(result),
    unlocked: true,
    method: (result.method as UnlockOutcome['method']) ?? 'points',
    charged: Math.trunc(result.charged ?? 0),
    already: Boolean(result.already),
    freeRemaining: typeof result.free_remaining === 'number' ? result.free_remaining : null,
  }
}

/**
 * Takes back what a source earned (all components), or at most `amount`. `extraEarned` adds legacy JSON
 * earnings for the same source (e.g. a comment credited before cutover and deleted after it).
 * Returns the clawed-back amount (positive), 0 if there was nothing left to take.
 */
export async function clawbackSource(input: {
  uid: string
  sourceType: string
  sourceId: string
  key: string
  reason?: string
  amount?: number | null
  extraEarned?: number
  createdBy?: string | null
  note?: string | null
}): Promise<PointsState & { clawedBack: number; duplicate: boolean }> {
  await ensureLegacyOpening(input.uid)
  const result = await pointsRpc<PointsRpcResult>('clawback_source', {
    p_user_id: input.uid,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_idempotency_key: input.key,
    p_reason: input.reason ?? 'clawback.admin',
    p_amount: input.amount ?? null,
    p_extra_earned: input.extraEarned ?? 0,
    p_created_by: input.createdBy ?? null,
    p_note: input.note ?? null,
  })
  if (!result?.ok && result?.error !== 'nothing_to_clawback') {
    throw new Error(`clawback_source failed: ${result?.error ?? 'unknown'}`)
  }
  return {
    ...stateOf(result),
    clawedBack: result?.ok ? Math.abs(Math.trunc(result.amount ?? 0)) : 0,
    duplicate: Boolean(result?.duplicate),
  }
}

/** Net earned (earn + clawback rows) for a source in the ledger. */
export async function ledgerNetForSource(uid: string, sourceType: string, sourceId: string): Promise<number> {
  const rows = await pointsRest<{ amount: number }[]>(
    `point_ledger?user_id=eq.${enc(uid)}&source_type=eq.${enc(sourceType)}&source_id=eq.${enc(sourceId)}` +
      `&entry_type=in.(earn,clawback)&select=amount`,
  )
  return (rows ?? []).reduce((sum, row) => sum + row.amount, 0)
}

/** Whether a ledger row with this idempotency key exists. */
export async function ledgerKeyExists(key: string): Promise<boolean> {
  const rows = await pointsRest<{ id: string }[]>(`point_ledger?idempotency_key=eq.${enc(key)}&select=id`)
  return Boolean(rows?.length)
}
