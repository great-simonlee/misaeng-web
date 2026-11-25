import { getSupabaseServiceClient } from '@lib/supabase/server'

/**
 * Ellieo credits + paid brokered listings (owner 11-25 final). SQL: ellieo-app/shared/ellieo/db/agent_listing_pay.sql.
 *
 *   Credits   1 credit = $1 list price. Lots: paid (bought or staff-granted, never expire) and reward (90 days, spent
 *             first). Balance from SQL. Packs + Stripe: credits.server.ts.
 *   Regular   7 / 14 / 28 days = 6 / 10 / 14 credits
 *   Premium   "Boost": the 28-day regular price + 25 credits for 7 days at the top of Housing (new = 39), shown 28 days
 *             from the Boost start; +7 days once for 25. Upgrading a regular listing costs the same 39 and restarts its
 *             28 days from the Boost start.
 *   Slots     3 Boosts at a time (NYC). Full → reservation paid up front; a new listing shows as a regular 28-day
 *             listing while it waits; cancelling refunds the held Boost part in full.
 *   Everyone  pays (no in-house exemption): staff give their own agents credits with an ERP grant.
 *
 * Prices, durations and the slot count live in ONE config: ellieo_settings 'listing_prices' (the Super Admin edits it
 * in the ERP), falling back to DEFAULT_LISTING_PRICES. Every endpoint reads getListingPrices(); the app reads them from
 * the API and sends a plan, never a price. Premium can be a bundle (bundlePrice) or the Boost add-on (default).
 */

export type ListingPrices = {
  /** Regular listing: days → credits. */
  regular: Record<string, number>
  premium: {
    mode: 'bundle' | 'boost'
    /** bundle: one price for `days` of Premium + shown `totalDays` in all. */
    bundlePrice: number
    /** boost: credits per `days` of Premium on top of the regular price for `totalDays`. */
    boostPrice: number
    days: number
    totalDays: number
    /** bundle: price of one extension (+`days`); boost: the extension costs boostPrice. */
    extendPrice: number
    maxExtensions: number
  }
  slots: number
}

export const DEFAULT_LISTING_PRICES: ListingPrices = {
  regular: { '7': 6, '14': 10, '28': 14 },
  premium: { mode: 'boost', bundlePrice: 39, boostPrice: 25, days: 7, totalDays: 28, extendPrice: 25, maxExtensions: 1 },
  slots: 3,
}

let cached: { at: number; value: ListingPrices } | null = null

/** The one price config (30 s cache). Missing row / table → the defaults. */
export async function getListingPrices(): Promise<ListingPrices> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value
  const { data } = await db().from('ellieo_settings').select('value').eq('key', 'listing_prices').maybeSingle<{ value: ListingPrices }>()
  const value = validatePrices(data?.value) ? data!.value : DEFAULT_LISTING_PRICES
  cached = { at: Date.now(), value }
  return value
}

export function premiumPrice(p: ListingPrices) {
  return p.premium.mode === 'boost' ? (p.regular[String(p.premium.totalDays)] ?? 0) + p.premium.boostPrice : p.premium.bundlePrice
}

export function extendPrice(p: ListingPrices) {
  return p.premium.mode === 'boost' ? p.premium.boostPrice : p.premium.extendPrice
}

const isWhole = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max

function validatePrices(value: unknown): value is ListingPrices {
  const v = value as ListingPrices | null
  if (!v || typeof v !== 'object' || !v.regular || !v.premium) return false
  const days = Object.keys(v.regular)
  if (days.length === 0 || days.length > 6) return false
  if (!days.every((d) => isWhole(Number(d), 1, 90) && isWhole(v.regular[d], 0, 10_000))) return false
  const pr = v.premium
  return (
    (pr.mode === 'bundle' || pr.mode === 'boost') &&
    isWhole(pr.bundlePrice, 0, 10_000) &&
    isWhole(pr.boostPrice, 0, 10_000) &&
    isWhole(pr.days, 1, 60) &&
    isWhole(pr.totalDays, pr.days, 90) &&
    isWhole(pr.extendPrice, 0, 10_000) &&
    isWhole(pr.maxExtensions, 0, 1) &&
    isWhole(v.slots, 0, 50) &&
    (pr.mode !== 'boost' || v.regular[String(pr.totalDays)] !== undefined)
  )
}

/** ERP (Super Admin): replace the config. */
export async function saveListingPrices(value: unknown, by: string) {
  if (!validatePrices(value)) {
    throw new CreditsError(
      'Prices are not valid (whole credits; regular days 1–90; Premium days ≤ total days; boost needs a regular price for the total days).',
      'INVALID_PRICES',
    )
  }
  const { error } = await db()
    .from('ellieo_settings')
    .upsert({ key: 'listing_prices', value, updated_at: new Date().toISOString(), updated_by: by } as never, { onConflict: 'key' })
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  cached = null
  return getListingPrices()
}

export class CreditsError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

const SQL_ERRORS: Record<string, [string, number]> = {
  NOT_ENOUGH_CREDITS: ['Not enough credits. Top up to continue.', 402],
  NOT_FOUND: ['Listing not found.', 404],
  NOT_BROKERED: ['Only brokered listings have plans.', 400],
  NOT_AVAILABLE: ['This listing can no longer be changed.', 409],
  INVALID_PLAN: ['Pick 7, 14 or 28 days, or Premium.', 400],
  PREMIUM_ACTIVE: ['This listing is already Premium.', 409],
  ALREADY_RESERVED: ['This listing is already waiting for a Premium spot.', 409],
  SLOTS_FULL: ['All Premium spots are taken. Reserve the next one instead.', 409],
  SLOT_OPEN: ['A Premium spot is open now — buy Premium instead of reserving.', 409],
  NOT_PREMIUM: ['Only an active Premium listing can be extended.', 409],
  ALREADY_EXTENDED: ['Premium can be extended only once.', 409],
  INVALID_AMOUNT: ['Enter an amount between 1 and 100,000.', 400],
  INVALID_BUCKET: ['Choose paid or reward credits.', 400],
  INVALID_PRICES: ['Prices are not valid.', 400],
  NOTE_REQUIRED: ['Add a note (who it is for and why).', 400],
  NOTHING_TO_ADJUST: ['There are no credits of that type to take back.', 409],
  NOT_REFUNDABLE: ['This purchase can no longer be refunded (more than 7 days, or some credits were used).', 409],
  INVALID: ['Invalid request.', 400],
}

function db() {
  return getSupabaseServiceClient()
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(name, args as never)
  if (error) {
    const code = /ellieo:([A-Z_]+)/.exec(error.message)?.[1]
    if (code && SQL_ERRORS[code]) throw new CreditsError(SQL_ERRORS[code][0], code, SQL_ERRORS[code][1])
    if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42P01') {
      throw new CreditsError('Paid listings are not set up yet (run agent_listing_pay.sql).', 'SETUP_REQUIRED', 503)
    }
    throw new CreditsError(`Credits failed: ${error.message}`, 'SERVER_ERROR', 500)
  }
  return data as T
}

// MARK: - Credits

export async function creditBalance(uid: string) {
  const rows = await rpc<{ paid: number; reward: number }[]>('ellieo_credit_balance', { p_user: uid })
  const paid = Number(rows?.[0]?.paid) || 0
  const reward = Number(rows?.[0]?.reward) || 0
  return { paid, reward, total: paid + reward }
}

type LedgerRow = {
  id: string
  bucket: 'paid' | 'reward'
  amount: number
  remaining: number | null
  expires_at: string | null
  reason: string
  ref_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

const REASON_TITLES: Record<string, string> = {
  grant: 'Credits added by Ellieo',
  adjust: 'Correction by Ellieo',
  purchase: 'Credit pack',
  listing: 'Brokered listing',
  premium: 'Premium listing (Boost)',
  upgrade: 'Upgrade to Premium (Boost)',
  extend: 'Boost extension',
  reserve: 'Boost reservation',
  refund: 'Refund',
  reversal: 'Purchase refunded',
  expire: 'Reward credits expired',
}

export async function creditLedger(uid: string, limit = 100) {
  const { data, error } = await db()
    .from('ellieo_credit_ledger')
    .select('id, bucket, amount, remaining, expires_at, reason, ref_id, note, created_by, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500))
    .returns<LedgerRow[]>()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new CreditsError('Paid listings are not set up yet (run agent_listing_pay.sql).', 'SETUP_REQUIRED', 503)
    }
    throw new CreditsError(error.message, 'LOAD_FAILED', 500)
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    bucket: row.bucket,
    amount: row.amount,
    reason: row.reason,
    title: REASON_TITLES[row.reason] ?? row.reason,
    note: row.note,
    refId: row.ref_id,
    /** Reward grants: what's left and when it expires. */
    remaining: row.remaining,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

/**
 * ERP: give credits (reason 'grant': never refundable, never revenue). Note required; staff email kept on the row.
 * Several members at once with `uids`.
 */
export async function grantCredits(input: { uids: string[]; amount: number; bucket: string; note?: string | null; by: string }) {
  if (!Number.isInteger(input.amount)) throw new CreditsError('Enter a whole number of credits.', 'INVALID_AMOUNT')
  const note = input.note?.trim().slice(0, 200) || ''
  if (note.length < 3) throw new CreditsError(SQL_ERRORS.NOTE_REQUIRED[0], 'NOTE_REQUIRED')
  const uids = [...new Set(input.uids.map((uid) => uid.trim()).filter(Boolean))].slice(0, 100)
  if (uids.length === 0) throw new CreditsError('Choose at least one member.', 'INVALID')
  const results: { uid: string; ok: boolean; error?: string }[] = []
  for (const uid of uids) {
    try {
      await rpc('ellieo_credit_grant', {
        p_user: uid, p_amount: input.amount, p_bucket: input.bucket, p_reason: 'grant', p_ref: null, p_note: note, p_by: input.by,
        p_reward_days: 90,
      })
      results.push({ uid, ok: true })
    } catch (error) {
      if (error instanceof CreditsError && error.code === 'SETUP_REQUIRED') throw error
      results.push({ uid, ok: false, error: error instanceof Error ? error.message : 'Failed' })
    }
  }
  return results
}

/** ERP (Super Admin): take credits back (negative correction from what is left of that bucket). */
export async function adjustCredits(input: { uid: string; amount: number; bucket: string; note: string; by: string }) {
  const removed = await rpc<number>('ellieo_credit_adjust', {
    p_user: input.uid, p_amount: input.amount, p_bucket: input.bucket, p_note: input.note?.trim() ?? '', p_by: input.by,
  })
  return { removed, balance: await creditBalance(input.uid) }
}

export async function creditLiability() {
  return rpc<Record<string, number>>('ellieo_credit_liability', {})
}

// MARK: - Premium slots

/** Starts waiting reservations when spots are free (no cron needed: called on board loads and purchases). */
export async function promotePremium() {
  try {
    const p = await getListingPrices()
    await rpc('ellieo_premium_promote', { p_slots: p.slots, p_premium_days: p.premium.days, p_total_days: p.premium.totalDays })
  } catch (error) {
    if (!(error instanceof CreditsError && error.code === 'SETUP_REQUIRED')) console.error('Ellieo premium promote error:', error)
  }
}

export async function premiumAvailability(slots: number) {
  const now = new Date().toISOString()
  const [{ data: active }, { data: waiting }] = await Promise.all([
    db()
      .from('ellieo_listings')
      .select('premium_end')
      .eq('status', 'live')
      .eq('plan', 'premium')
      .gt('premium_end', now)
      .gt('expires_at', now)
      .order('premium_end', { ascending: true })
      .returns<{ premium_end: string }[]>(),
    db()
      .from('ellieo_premium_reservations')
      .select('id')
      .eq('status', 'waiting')
      .returns<{ id: string }[]>(),
  ])
  const used = active?.length ?? 0
  const queue = waiting?.length ?? 0
  // The spot a new reservation gets: the (queue+1)-th Premium to end, if any.
  const ends = (active ?? []).map((row) => new Date(row.premium_end).getTime())
  const nextEnd = used >= slots && ends.length ? ends[Math.min(queue, ends.length - 1)] : null
  return {
    slots,
    used: Math.min(used, slots),
    full: used >= slots,
    waiting: queue,
    /** Whole days until the next spot (for a new reservation) opens; null when a spot is open. */
    nextOpensInDays: nextEnd ? Math.max(1, Math.ceil((nextEnd - Date.now()) / 86_400_000)) : null,
  }
}

/** Composer / plan sheet: prices, Boost spots, my balance, top-up link flags. */
export async function planOptions(uid: string, topUp: { ios: boolean; android: boolean }) {
  await promotePremium()
  const p = await getListingPrices()
  const [balance, premium] = await Promise.all([creditBalance(uid), premiumAvailability(p.slots)])
  return {
    /** Everything the app shows comes from here (one config). */
    prices: {
      regular: p.regular,
      premium: premiumPrice(p),
      extend: extendPrice(p),
      premiumMode: p.premium.mode,
      boost: p.premium.boostPrice,
      maxExtensions: p.premium.maxExtensions,
    },
    premiumDays: p.premium.days,
    premiumTotalDays: p.premium.totalDays,
    premium,
    balance,
    topUp,
  }
}

// MARK: - Purchases

export type PlanChoice = { plan: 'regular'; days: number } | { plan: 'premium'; reserve?: boolean }

export function parsePlan(input: unknown): PlanChoice | null {
  const value = (input ?? {}) as { plan?: unknown; days?: unknown; reserve?: unknown }
  if (value.plan === 'regular' && Number.isInteger(Number(value.days))) return { plan: 'regular', days: Number(value.days) }
  if (value.plan === 'premium') return { plan: 'premium', reserve: value.reserve === true }
  return null
}

/** One action on my brokered listing; price from the one config (getListingPrices). */
export async function purchase(
  uid: string,
  listingId: string,
  action: 'regular' | 'premium' | 'extend' | 'reserve',
  days = 0,
  /** reserve: the listing isn't up yet (new / expired) — its regular days are charged now, the Boost part is held. */
  notLive = false,
) {
  const p = await getListingPrices()
  const regularTotal = p.regular[String(p.premium.totalDays)] ?? 0
  const reserveNow = action === 'reserve' && notLive && p.premium.mode === 'boost' ? regularTotal : 0
  const price =
    action === 'regular'
      ? p.regular[String(days)]
      : action === 'premium'
        ? premiumPrice(p)
        : action === 'reserve'
          ? premiumPrice(p) - reserveNow
          : extendPrice(p)
  if (action === 'regular' && price === undefined) throw new CreditsError(SQL_ERRORS.INVALID_PLAN[0], 'INVALID_PLAN')
  if (action === 'extend' && p.premium.maxExtensions < 1) throw new CreditsError('Premium can’t be extended right now.', 'NO_EXTENSION', 409)
  const result = await rpc<{ ok: boolean; paidUsed?: number; rewardUsed?: number; reservation?: string | null }>(
    'ellieo_listing_purchase',
    {
      p_user: uid,
      p_listing: listingId,
      p_action: action,
      p_days: days,
      p_price: price ?? 0,
      p_now_price: reserveNow,
      p_regular_days: Object.keys(p.regular).map(Number),
      p_slots: p.slots,
      p_premium_days: p.premium.days,
      p_total_days: p.premium.totalDays,
    },
  )
  if (action !== 'reserve') await promotePremium()
  return { ...result, price }
}

export async function cancelReservation(uid: string, listingId: string) {
  const ok = await rpc<boolean>('ellieo_premium_cancel', { p_user: uid, p_listing: listingId })
  if (!ok) throw new CreditsError('No reservation to cancel.', 'NOT_FOUND', 404)
}

/** Owner marks a listing rented: off the board (status removed, reason rented). No refund of unused days. */
export async function markRented(uid: string, listingId: string) {
  // A waiting reservation for it is cancelled (and refunded) first.
  await rpc('ellieo_premium_cancel', { p_user: uid, p_listing: listingId }).catch(() => null)
  const now = new Date().toISOString()
  const { data, error } = await db()
    .from('ellieo_listings')
    .update({ status: 'removed', removed_reason: 'rented', removed_at: now, rented_at: now } as never)
    .eq('id', listingId)
    .eq('owner_id', uid)
    .in('status', ['live', 'expired', 'removed'])
    .select('id')
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  if (!data?.length) throw new CreditsError('Listing not found.', 'NOT_FOUND', 404)
}

/** Owner-only plan facts for my listings (days left, Premium days left, what I can do next). */
export type PlanFacts = {
  plan: 'regular' | 'premium' | null
  planDays: number | null
  premiumActive: boolean
  premiumDaysLeft: number | null
  premiumExtended: boolean
  reservation: { position: number } | null
}

export async function planFacts(rows: { id: string; owner_id: string }[], viewer: string | null) {
  const out = new Map<string, PlanFacts & { premiumActive: boolean }>()
  if (rows.length === 0) return out
  const { data, error } = await db()
    .from('ellieo_listings')
    .select('id, plan, plan_days, premium_start, premium_end, premium_extended')
    .in('id', rows.map((row) => row.id))
    .returns<{ id: string; plan: PlanFacts['plan']; plan_days: number | null; premium_start: string | null; premium_end: string | null; premium_extended: boolean }[]>()
  if (error) return out
  const mineIds = rows.filter((row) => viewer && row.owner_id === viewer).map((row) => row.id)
  const positions = new Map<string, number>()
  if (mineIds.length) {
    const { data: queue } = await db()
      .from('ellieo_premium_reservations')
      .select('listing_id, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .returns<{ listing_id: string; created_at: string }[]>()
    ;(queue ?? []).forEach((row, index) => positions.set(row.listing_id, index + 1))
  }
  const now = Date.now()
  for (const row of data ?? []) {
    const end = row.premium_end ? new Date(row.premium_end).getTime() : 0
    const active = row.plan === 'premium' && end > now
    out.set(row.id, {
      plan: row.plan,
      planDays: row.plan_days,
      premiumActive: active,
      premiumDaysLeft: active ? Math.max(1, Math.ceil((end - now) / 86_400_000)) : null,
      premiumExtended: row.premium_extended,
      reservation: positions.has(row.id) ? { position: positions.get(row.id)! } : null,
    })
  }
  return out
}
