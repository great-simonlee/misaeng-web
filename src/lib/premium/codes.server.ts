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

// Failed tries per member per hour (one server process on EC2, so memory is enough).
const FAILED_LIMIT = 10
const failures = new Map<string, number[]>()

function tooManyFailures(uid: string) {
  const now = Date.now()
  const recent = (failures.get(uid) ?? []).filter((at) => now - at < 3_600_000)
  failures.set(uid, recent)
  return recent.length >= FAILED_LIMIT
}

function recordFailure(uid: string) {
  failures.set(uid, [...(failures.get(uid) ?? []), Date.now()])
}

export async function redeemCode(input: { code: unknown; uid: string; email: string | null }) {
  if (tooManyFailures(input.uid)) return { ok: false as const, error: 'TOO_MANY' as RedeemError }
  const code = normalizeCode(input.code)
  if (code.length < 4 || code.length > 24) {
    recordFailure(input.uid)
    return { ok: false as const, error: 'INVALID' as RedeemError }
  }
  const res = await rest('rpc/redeem_premium_code', {
    method: 'POST',
    body: JSON.stringify({ p_code: code, p_uid: input.uid, p_email: input.email }),
  })
  const result = await json<{ ok: boolean; error?: RedeemError; ends_at?: string }>(res, 'Redeeming the code')
  if (!result.ok) {
    if (result.error === 'NOT_FOUND') recordFailure(input.uid)
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

function isoOrNull(value: unknown, field: string): string | null {
  if (value == null || value === '') return null
  const ms = Date.parse(String(value))
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

  let codes: { code: string; max_uses: number }[]
  let maxRedemptions: number
  if (kind === 'group') {
    maxRedemptions = intIn(input.maxMembers, 1, MAX_GROUP_MEMBERS, 'Member limit')
    const chosen = normalizeCode(input.code)
    if (chosen && !/^[A-Z0-9]{4,24}$/.test(chosen)) {
      throw new CodeError('INVALID', 'Code must be 4–24 letters or digits.')
    }
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
      }),
    }),
    'Creating the batch',
  )

  // Random collisions with older codes are astronomically unlikely (31^8); a failed chunk is retried with new codes.
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
        await rest(`premium_code_batches?id=eq.${batch.id}`, { method: 'DELETE' })
        if (res.status === 409) throw new CodeError('CODE_TAKEN', 'This code is already used. Choose another one.', 409)
        throw new CodeError('DB_ERROR', `Saving the codes failed (HTTP ${res.status}).`, 500)
      }
      chunk = chunk.map((c) => ({ ...c, code: randomCode() }))
    }
  }
  return batch
}

export type BatchSummary = CodeBatch & { used: number; codeCount: number; activeMembers: number }

export async function listBatches(): Promise<BatchSummary[]> {
  const batches = await json<CodeBatch[]>(
    await rest('premium_code_batches?select=*&order=created_at.desc&limit=500'),
    'Loading code batches',
  )
  if (!batches.length) return []
  const ids = batches.map((b) => b.id).join(',')
  const [codes, redemptions] = await Promise.all([
    json<{ batch_id: string; used_count: number }[]>(
      await rest(`premium_codes?select=batch_id,used_count&batch_id=in.(${ids})&limit=100000`),
      'Loading codes',
    ),
    json<{ batch_id: string; ends_at: string; revoked_at: string | null }[]>(
      await rest(`premium_code_redemptions?select=batch_id,ends_at,revoked_at&batch_id=in.(${ids})&limit=100000`),
      'Loading redemptions',
    ),
  ])
  const now = Date.now()
  return batches.map((b) => {
    const mine = codes.filter((c) => c.batch_id === b.id)
    const members = redemptions.filter((r) => r.batch_id === b.id)
    return {
      ...b,
      codeCount: mine.length,
      used: members.length,
      activeMembers: members.filter((r) => !r.revoked_at && Date.parse(r.ends_at) > now).length,
    }
  })
}

export async function getBatch(id: string) {
  const [batch] = await json<CodeBatch[]>(
    await rest(`premium_code_batches?select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
    'Loading the batch',
  )
  if (!batch) throw new CodeError('NOT_FOUND', 'Batch not found.', 404)
  const [codes, redemptions] = await Promise.all([
    json<PremiumCode[]>(
      await rest(`premium_codes?select=*&batch_id=eq.${batch.id}&order=created_at.asc&limit=${MAX_SINGLE_CODES + 10}`),
      'Loading codes',
    ),
    json<CodeRedemption[]>(
      await rest(`premium_code_redemptions?select=*&batch_id=eq.${batch.id}&order=redeemed_at.desc&limit=10000`),
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
  if (patch.redeemBy !== undefined) body.redeem_by = isoOrNull(patch.redeemBy, 'Redeem-by date')
  if (patch.note !== undefined) body.note = String(patch.note || '').trim().slice(0, 500) || null
  const rows = await json<CodeBatch[]>(
    await rest(`premium_code_batches?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify(body),
    }),
    'Updating the batch',
  )
  if (!rows[0]) throw new CodeError('NOT_FOUND', 'Batch not found.', 404)
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

/** Ends one member's code Premium now (abuse, wrong person). */
export async function revokeRedemption(redemptionId: string, actor: string) {
  const now = new Date().toISOString()
  const rows = await json<CodeRedemption[]>(
    await rest(`premium_code_redemptions?id=eq.${encodeURIComponent(redemptionId)}&revoked_at=is.null`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({ revoked_at: now, revoked_by: actor }),
    }),
    'Revoking the member',
  )
  const row = rows[0]
  if (!row) throw new CodeError('NOT_FOUND', 'Redemption not found or already revoked.', 404)
  await json<unknown[]>(
    await rest(`premium_entitlements?external_id=eq.${encodeURIComponent(`code:${row.id}`)}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({ status: 'canceled', current_period_end: now, updated_at: now }),
    }),
    'Ending the Premium',
  )
  invalidatePremium(row.user_uid)
  return row
}
