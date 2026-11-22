import { randomInt } from 'node:crypto'

import { invalidatePremium } from './access.server'
import { rest } from './entitlements.server'

/**
 * Premium codes (supabase/premium_codes.sql): free access without a card, redeemed on the web only (Apple does not
 * allow own unlock codes inside the app; the apps just show the resulting Premium).
 * - group: one chosen code for a student council / partner, a member cap, one use per person
 * - single: random single-use codes made in a batch (e.g. 100 × 1 month), handed out one by one
 * Each batch is either N months from the day a member redeems, or a fixed end date for everyone.
 */

export type CodeBatchKind = 'group' | 'single'
export type CodeDuration = 'months' | 'fixed'
export type CodeBatchStatus = 'active' | 'paused' | 'closed'

export type CodeBatch = {
  id: string
  kind: CodeBatchKind
  name: string
  organization: string | null
  duration: CodeDuration
  months: number | null
  ends_at: string | null
  redeem_by: string | null
  max_redemptions: number | null
  status: CodeBatchStatus
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PremiumCode = {
  id: string
  batch_id: string
  code: string
  max_uses: number
  used_count: number
  status: 'active' | 'revoked'
  created_at: string
}

export type CodeRedemption = {
  id: string
  code_id: string
  batch_id: string
  user_uid: string
  email: string | null
  ends_at: string
  redeemed_at: string
  revoked_at: string | null
  revoked_by: string | null
}

export type RedeemError =
  | 'INVALID'
  | 'NOT_FOUND'
  | 'PAUSED'
  | 'CLOSED'
  | 'REDEEM_ENDED'
  | 'USED_UP'
  | 'ALREADY_USED'
  | 'ALREADY_PREMIUM'
  | 'EXPIRED'
  | 'TOO_MANY'

export class CodeError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}

// No 0/O, 1/I/L: easy to read out and type.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const RANDOM_PREFIX = 'MSG'
export const MAX_SINGLE_CODES = 1000
export const MAX_GROUP_MEMBERS = 5000

/** What members type → stored form: uppercase letters and digits only ("msg-7kq4 x9tp" → "MSG7KQ4X9TP"). */
export function normalizeCode(input: unknown): string {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 32)
}

/** Stored → shown: random codes as MSG-XXXX-XXXX, group codes as chosen. */
export function displayCode(code: string): string {
  return /^MSG[A-Z0-9]{8}$/.test(code) ? `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}` : code
}

function randomCode() {
  let body = ''
  for (let i = 0; i < 8; i += 1) body += ALPHABET[randomInt(ALPHABET.length)]
  return `${RANDOM_PREFIX}${body}`
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 404 || /does not exist|schema cache/i.test(text)) {
      throw new CodeError('NOT_CONFIGURED', 'Premium code tables are not set up (run supabase/premium_codes.sql).', 503)
    }
    throw new CodeError('DB_ERROR', `${what} failed (HTTP ${res.status}).`, 500)
  }
  return (await res.json()) as T
}

/* ───────────── Redeem (members) ───────────── */

// Wrong codes per hour: 10 per member and 30 per IP (throwaway accounts can't guess group codes quickly). One server
// process on EC2, so memory is enough; old entries are dropped as the map grows.
const HOUR = 3_600_000
const LIMITS = { uid: 10, ip: 30 }
const failures = new Map<string, number[]>()

function recent(key: string) {
  const now = Date.now()
  const list = (failures.get(key) ?? []).filter((at) => now - at < HOUR)
  if (list.length) failures.set(key, list)
  else failures.delete(key)
  return list.length
}

function tooManyFailures(uid: string, ip: string | null) {
  return recent(`u:${uid}`) >= LIMITS.uid || (ip ? recent(`i:${ip}`) >= LIMITS.ip : false)
}

function recordFailure(uid: string, ip: string | null) {
  if (failures.size > 20_000) {
    for (const key of [...failures.keys()].slice(0, 10_000)) recent(key)
  }
  for (const key of [`u:${uid}`, ...(ip ? [`i:${ip}`] : [])]) failures.set(key, [...(failures.get(key) ?? []), Date.now()])
}

export async function redeemCode(input: { code: unknown; uid: string; email: string | null; ip?: string | null }) {
  const ip = input.ip?.trim() || null
  if (tooManyFailures(input.uid, ip)) return { ok: false as const, error: 'TOO_MANY' as RedeemError }
  const code = normalizeCode(input.code)
  if (code.length < 4 || code.length > 24) {
    recordFailure(input.uid, ip)
    return { ok: false as const, error: 'INVALID' as RedeemError }
  }
  const res = await rest('rpc/redeem_premium_code', {
    method: 'POST',
    body: JSON.stringify({ p_code: code, p_uid: input.uid, p_email: input.email }),
  })
  const result = await json<{ ok: boolean; error?: RedeemError; ends_at?: string }>(res, 'Redeeming the code')
  if (!result.ok) {
    if (result.error === 'NOT_FOUND') recordFailure(input.uid, ip)
    return { ok: false as const, error: (result.error || 'NOT_FOUND') as RedeemError }
  }
  invalidatePremium(input.uid)
  return { ok: true as const, endsAt: result.ends_at ?? null }
}

/* ───────────── ERP (internal) ───────────── */

export type CreateBatchInput = {
  kind: CodeBatchKind
  name: string
  organization?: string | null
  duration: CodeDuration
  months?: number | null
  endsAt?: string | null
  redeemBy?: string | null
  /** group: member cap */
  maxMembers?: number | null
  /** group: the chosen code (empty → random) */
  code?: string | null
  /** single: how many codes */
  count?: number | null
  note?: string | null
  actor: string
}

/** A date-only "YYYY-MM-DD" means 11:59:59 PM New York time that day; anything else must be a full date-time. */
function isoOrNull(value: unknown, field: string): string | null {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (day) {
    const wallClock = Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 23, 59, 59)
    const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' })
      .formatToParts(new Date(wallClock + 5 * 3_600_000))
      .find((part) => part.type === 'timeZoneName')?.value
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name || '')
    const offset = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : -300
    return new Date(wallClock - offset * 60_000).toISOString()
  }
  const ms = Date.parse(text)
  if (!Number.isFinite(ms)) throw new CodeError('INVALID', `${field} is not a valid date.`)
  return new Date(ms).toISOString()
}

function intIn(value: unknown, min: number, max: number, field: string): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new CodeError('INVALID', `${field} must be ${min}–${max}.`)
  return n
}

export async function createBatch(input: CreateBatchInput) {
  const kind: CodeBatchKind = input.kind === 'group' ? 'group' : 'single'
  const name = String(input.name || '').trim().slice(0, 120)
  if (!name) throw new CodeError('INVALID', 'Name is required.')
  const duration: CodeDuration = input.duration === 'fixed' ? 'fixed' : 'months'
  const months = duration === 'months' ? intIn(input.months, 1, 24, 'Months') : null
  const endsAt = duration === 'fixed' ? isoOrNull(input.endsAt, 'End date') : null
  if (duration === 'fixed' && (!endsAt || Date.parse(endsAt) <= Date.now())) {
    throw new CodeError('INVALID', 'End date must be in the future.')
  }
  const redeemBy = isoOrNull(input.redeemBy, 'Redeem-by date')
  if (redeemBy && Date.parse(redeemBy) <= Date.now()) throw new CodeError('INVALID', 'Redeem-by date must be in the future.')
  if (redeemBy && endsAt && Date.parse(redeemBy) > Date.parse(endsAt)) {
    throw new CodeError('INVALID', 'Redeem-by date must be on or before the end date.')
  }

  let codes: { code: string; max_uses: number }[]
  let maxRedemptions: number
  if (kind === 'group') {
    maxRedemptions = intIn(input.maxMembers, 1, MAX_GROUP_MEMBERS, 'Member limit')
    const raw = String(input.code ?? '').trim()
    // Only English letters, digits, spaces and dashes (anything else would be silently dropped and make the code
    // shorter / easier to guess), and not shaped like our random codes.
    if (raw && !/^[A-Za-z0-9 -]+$/.test(raw)) throw new CodeError('INVALID', 'Use English letters and digits only.')
    const chosen = normalizeCode(raw)
    if (chosen && !/^[A-Z0-9]{4,24}$/.test(chosen)) {
      throw new CodeError('INVALID', 'Code must be 4–24 letters or digits.')
    }
    if (chosen.startsWith(RANDOM_PREFIX)) throw new CodeError('INVALID', 'Group codes cannot start with MSG.')
    codes = [{ code: chosen || randomCode(), max_uses: maxRedemptions }]
  } else {
    maxRedemptions = intIn(input.count, 1, MAX_SINGLE_CODES, 'Number of codes')
    const set = new Set<string>()
    while (set.size < maxRedemptions) set.add(randomCode())
    codes = [...set].map((code) => ({ code, max_uses: 1 }))
  }

  if (kind === 'group') {
    const taken = await json<{ id: string }[]>(
      await rest(`premium_codes?select=id&code=eq.${encodeURIComponent(codes[0].code)}&limit=1`),
      'Checking the code',
    )
    if (taken.length) throw new CodeError('CODE_TAKEN', 'This code is already used. Choose another one.', 409)
  }

  const [batch] = await json<CodeBatch[]>(
    await rest('premium_code_batches', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        kind,
        name,
        organization: String(input.organization || '').trim().slice(0, 120) || null,
        duration,
        months,
        ends_at: endsAt,
        redeem_by: redeemBy,
        max_redemptions: maxRedemptions,
        note: String(input.note || '').trim().slice(0, 500) || null,
        created_by: input.actor,
        // Paused until every code is saved: a half-made batch can never be redeemed.
        status: 'paused',
      }),
    }),
    'Creating the batch',
  )
  const discard = () => rest(`premium_code_batches?id=eq.${batch.id}`, { method: 'DELETE' }).catch(() => null)

  // Random collisions with older codes are astronomically unlikely (31^8); a failed chunk is retried with new codes.
  try {
    for (let i = 0; i < codes.length; i += 200) {
      let chunk = codes.slice(i, i + 200)
      for (let attempt = 0; ; attempt += 1) {
        const res = await rest('premium_codes', {
          method: 'POST',
          prefer: 'return=minimal',
          body: JSON.stringify(chunk.map((c) => ({ ...c, batch_id: batch.id }))),
        })
        if (res.ok) break
        if (res.status !== 409 || kind === 'group' || attempt >= 2) {
          if (res.status === 409) throw new CodeError('CODE_TAKEN', 'This code is already used. Choose another one.', 409)
          throw new CodeError('DB_ERROR', `Saving the codes failed (HTTP ${res.status}).`, 500)
        }
        chunk = chunk.map((c) => ({ ...c, code: randomCode() }))
      }
    }
    const [active] = await json<CodeBatch[]>(
      await rest(`premium_code_batches?id=eq.${batch.id}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({ status: 'active', updated_at: new Date().toISOString() }),
      }),
      'Activating the batch',
    )
    return active ?? batch
  } catch (error) {
    await discard()
    if (error instanceof CodeError) throw error
    throw new CodeError('DB_ERROR', 'Saving the codes failed.', 500)
  }
}

export type BatchSummary = CodeBatch & { used: number; codeCount: number; activeMembers: number }

export async function listBatches(): Promise<BatchSummary[]> {
  const [batches, stats] = await Promise.all([
    allRows<CodeBatch>('premium_code_batches?select=*&order=created_at.desc,id.asc', 'Loading code batches'),
    // Per-batch counts computed in the database (supabase/premium_fix_1122.sql): no row limits.
    allRows<{ batch_id: string; code_count: number; used: number; active_members: number }>(
      'premium_code_batch_stats?select=*',
      'Loading code counts',
    ),
  ])
  const byBatch = new Map(stats.map((row) => [row.batch_id, row]))
  return batches.map((b) => {
    const row = byBatch.get(b.id)
    return { ...b, codeCount: row?.code_count ?? 0, used: row?.used ?? 0, activeMembers: row?.active_members ?? 0 }
  })
}

/** Every row of a query, 1000 at a time (Supabase returns at most 1000 rows per request). */
async function allRows<T>(path: string, what: string): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; offset < 20_000; offset += 1000) {
    const page = await json<T[]>(await rest(`${path}&limit=1000&offset=${offset}`), what)
    out.push(...page)
    if (page.length < 1000) break
  }
  return out
}

export async function getBatch(id: string) {
  const [batch] = await json<CodeBatch[]>(
    await rest(`premium_code_batches?select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
    'Loading the batch',
  )
  if (!batch) throw new CodeError('NOT_FOUND', 'Batch not found.', 404)
  const [codes, redemptions] = await Promise.all([
    allRows<PremiumCode>(`premium_codes?select=*&batch_id=eq.${batch.id}&order=created_at.asc,id.asc`, 'Loading codes'),
    allRows<CodeRedemption>(
      `premium_code_redemptions?select=*&batch_id=eq.${batch.id}&order=redeemed_at.desc,id.asc`,
      'Loading redemptions',
    ),
  ])
  const byId = new Map(codes.map((c) => [c.id, c.code]))
  return {
    batch,
    codes: codes.map((c) => ({ ...c, display: displayCode(c.code) })),
    redemptions: redemptions.map((r) => ({ ...r, code: displayCode(byId.get(r.code_id) || '') })),
  }
}

export async function updateBatch(id: string, patch: { status?: unknown; redeemBy?: unknown; note?: unknown }) {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status !== undefined) {
    if (!['active', 'paused', 'closed'].includes(String(patch.status))) throw new CodeError('INVALID', 'Unknown status.')
    body.status = patch.status
  }
  // Closed is final: the PATCH only matches batches that are not closed.
  if (patch.redeemBy !== undefined) body.redeem_by = isoOrNull(patch.redeemBy, 'Redeem-by date')
  if (patch.note !== undefined) body.note = String(patch.note || '').trim().slice(0, 500) || null
  const rows = await json<CodeBatch[]>(
    await rest(`premium_code_batches?id=eq.${encodeURIComponent(id)}&status=neq.closed`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify(body),
    }),
    'Updating the batch',
  )
  if (!rows[0]) throw new CodeError('NOT_FOUND', 'Batch not found, or it is closed (closed codes cannot be changed).', 404)
  return rows[0]
}

/** One unused random code off (e.g. handed to the wrong person). Used codes stay as they are. */
export async function revokeCode(codeId: string) {
  const rows = await json<PremiumCode[]>(
    await rest(`premium_codes?id=eq.${encodeURIComponent(codeId)}&used_count=eq.0`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({ status: 'revoked' }),
    }),
    'Revoking the code',
  )
  if (!rows[0]) throw new CodeError('CODE_USED', 'Only unused codes can be revoked.', 409)
  return rows[0]
}

/** Ends one member's code Premium now (abuse, wrong person). One transaction; calling it again repairs / no-ops. */
export async function revokeRedemption(redemptionId: string, actor: string) {
  const result = await json<{ ok: boolean; error?: string; user_uid?: string }>(
    await rest('rpc/revoke_premium_redemption', {
      method: 'POST',
      body: JSON.stringify({ p_id: redemptionId, p_actor: actor }),
    }),
    'Ending the Premium',
  )
  if (!result.ok || !result.user_uid) throw new CodeError('NOT_FOUND', 'Redemption not found.', 404)
  invalidatePremium(result.user_uid)
  return { id: redemptionId, user_uid: result.user_uid }
}
