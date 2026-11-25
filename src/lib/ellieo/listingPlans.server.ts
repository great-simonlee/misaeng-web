import { getSupabaseServiceClient } from '@lib/supabase/server'

/**
 * Ellieo credits + paid brokered listings (owner 11-25). SQL: ellieo-app/shared/ellieo/db/agent_listing_pay.sql.
 *
 *   Credits   1 credit = $1. paid (never expire) + reward (90 days, spent first). Ledger rows; balance from SQL.
 *             No real top-up yet (Ellieo has no Stripe account): ERP grants credits by hand.
 *   Regular   7 / 14 / 28 days = 6 / 10 / 14 credits
 *   Premium   58 credits = 7 days in a Premium slot + shown 28 days in all from the Premium start; +7 days once for 46
 *   Slots     3 at a time (NYC); full → reservation paid up front, started in order; cancel = full refund
 *   In-house  license in_house (ERP only): free, no limits, no Premium slot
 *
 * Prices, durations and the slot count live in ONE config: ellieo_settings 'listing_prices' (Super Admin edits it in
 * the ERP), falling back to DEFAULT_LISTING_PRICES. Every endpoint reads getListingPrices(); the app reads them from
 * the API and sends a plan, never a price. Premium is either a bundle (bundlePrice) or an add-on "Boost": the
 * regular price for totalDays + boostPrice per `days` of Premium (extension = boostPrice).
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
  inHouseDays: number
}

export const DEFAULT_LISTING_PRICES: ListingPrices = {
  regular: { '7': 6, '14': 10, '28': 14 },
  premium: { mode: 'bundle', bundlePrice: 58, boostPrice: 25, days: 7, totalDays: 28, extendPrice: 46, maxExtensions: 1 },
  slots: 3,
  inHouseDays: 28,
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
    isWhole(v.inHouseDays, 1, 365) &&
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
  topup: 'Top-up',
  listing: 'Brokered listing',
  premium: 'Premium listing',
  upgrade: 'Upgrade to Premium',
  extend: 'Premium +7 days',
  reserve: 'Premium reservation',
  refund: 'Refund',
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

/** ERP: add credits by hand (no real payments yet). */
export async function grantCredits(input: { uid: string; amount: number; bucket: string; note?: string | null; by: string }) {
  if (!Number.isInteger(input.amount)) throw new CreditsError('Enter a whole number of credits.', 'INVALID_AMOUNT')
  await rpc('ellieo_credit_grant', {
    p_user: input.uid,
    p_amount: input.amount,
    p_bucket: input.bucket,
    p_reason: 'grant',
    p_ref: null,
    p_note: input.note?.trim().slice(0, 200) || null,
    p_by: input.by,
  })
  return creditBalance(input.uid)
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

/** Composer / plan sheet: prices, Premium spots, my balance, in-house. */
export async function planOptions(uid: string, inHouse: boolean) {
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
    inHouse,
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
export async function purchase(uid: string, listingId: string, action: 'regular' | 'premium' | 'extend' | 'reserve' | 'free', days = 0) {
  const p = await getListingPrices()
  const price =
    action === 'regular'
      ? p.regular[String(days)]
      : action === 'premium' || action === 'reserve'
        ? premiumPrice(p)
        : action === 'extend'
          ? extendPrice(p)
          : 0
  if (action === 'regular' && price === undefined) throw new CreditsError(SQL_ERRORS.INVALID_PLAN[0], 'INVALID_PLAN')
  if (action === 'extend' && p.premium.maxExtensions < 1) throw new CreditsError('Premium can’t be extended right now.', 'NO_EXTENSION', 409)
  const result = await rpc<{ ok: boolean; paidUsed?: number; rewardUsed?: number; reservation?: string | null }>(
    'ellieo_listing_purchase',
    {
      p_user: uid,
      p_listing: listingId,
      p_action: action,
      p_days: action === 'free' ? days || p.inHouseDays : days,
      p_price: price ?? 0,
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
  plan: 'regular' | 'premium' | 'inhouse' | null
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
