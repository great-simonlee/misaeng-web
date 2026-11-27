import { CreditsError, db, isMissingTable, rpc, setupRequired, SQL_ERRORS } from './creditsCore.server'
import { isInHouse } from './inHouse.server'
import { discounted, listingDiscount } from './promotions.server'

export { CreditsError } from './creditsCore.server'

/**
 * Ellieo credits + paid brokered listings (owner 11-25 final). SQL: ellieo-app/shared/ellieo/db/agent_listing_pay.sql
 * + credits_paid_only.sql.
 *
 *   Credits   $1 = 10 credits, only from payment (Stripe or App Store; credits.server.ts, appleCredits.server.ts).
 *             Lots: paid (each tied to its purchase, never expire) and staff (in-house accounts only, monthly, $0;
 *             inHouse.server.ts). Staff credits are spent first. A refund after use can leave a debt (balance below 0).
 *   Regular   7 / 14 / 28 days = 20 / 40 / 70 credits (owner 11-26: fit the 100 / 220 / 460 / 960 packs exactly)
 *   Premium   "Boost": the 28-day regular price + 150 credits for 7 days at the top of Housing (new = 220), shown 28 days
 *             from the Boost start; +7 days once for 150.
 *   Upgrade   Boost on a listing that is already up (owner 11-26) costs only the Boost price (150) and keeps the
 *             listing's own end date (its regular days are not charged again or restarted). If fewer days are left than
 *             the Boost window, the end date moves to the Boost's end at no extra charge, so a Boost is never cut short.
 *             A reservation on a live listing holds only the Boost price too. Bundle mode: the old rule (full price,
 *             restarts totalDays). SQL: ellieo-app/shared/ellieo/db/agent_boost_upgrade_ellieo.sql.
 *   Slots     3 Boosts at a time (NYC); in-house listings hold at most 1 of them. Full → reservation paid up front; a
 *             new listing shows as a regular 28-day listing while it waits; cancelling gives the held part back.
 *   Discounts automatic listing discounts (promotions.server.ts) lower the credits a plan costs.
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
  regular: { '7': 20, '14': 40, '28': 70 },
  premium: { mode: 'boost', bundlePrice: 220, boostPrice: 150, days: 7, totalDays: 28, extendPrice: 150, maxExtensions: 1 },
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

/** Boost on a listing that is already up: the Boost part only (boost mode); bundle mode → the full Premium price. */
export function upgradePrice(p: ListingPrices) {
  return p.premium.mode === 'boost' ? p.premium.boostPrice : p.premium.bundlePrice
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
  if (!days.every((d) => isWhole(Number(d), 1, 90) && isWhole(v.regular[d], 0, 100_000))) return false
  const pr = v.premium
  return (
    (pr.mode === 'bundle' || pr.mode === 'boost') &&
    isWhole(pr.bundlePrice, 0, 100_000) &&
    isWhole(pr.boostPrice, 0, 100_000) &&
    isWhole(pr.days, 1, 60) &&
    isWhole(pr.totalDays, pr.days, 90) &&
    isWhole(pr.extendPrice, 0, 100_000) &&
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

// MARK: - Credits

/** paid = bought credits left (minus any debt, so it can be below 0); staff = in-house monthly credits. */
export async function creditBalance(uid: string) {
  const rows = await rpc<{ paid: number; staff: number; debt: number }[]>('ellieo_credit_balance', { p_user: uid })
  const paid = Number(rows?.[0]?.paid) || 0
  const staff = Number(rows?.[0]?.staff) || 0
  const debt = Number(rows?.[0]?.debt) || 0
  return { paid, staff, debt, total: paid + staff }
}

type LedgerRow = {
  id: string
  bucket: 'paid' | 'staff' | 'reward'
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
  refund: 'Boost reservation cancelled',
  return: 'Boost reservation cancelled',
  reversal: 'Purchase refunded',
  debt: 'Owed after a refund',
  debt_paid: 'Applied to an earlier refund',
  cleanup: 'Free credits removed',
  expire: 'Reward credits expired',
  staff_grant: 'Monthly staff credits',
  staff_topup: 'Staff credits added',
  staff_expire: 'Last month’s staff credits',
  staff_removed: 'Staff credits removed',
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
    if (isMissingTable(error.code)) throw setupRequired()
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
    /** Lots: what's left. */
    remaining: row.remaining,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

/** ERP (Super Admin): take credits back from one purchase (negative only; never below what is left of it). */
export async function adjustCredits(input: { purchaseId: string; amount: number; note: string; by: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.purchaseId)) throw new CreditsError('Choose the purchase to correct.', 'INVALID')
  const removed = await rpc<number>('ellieo_credit_adjust', {
    p_purchase: input.purchaseId, p_amount: input.amount, p_note: input.note?.trim() ?? '', p_by: input.by,
  })
  return { removed }
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

/** Boost spots. For an in-house viewer the spots are also "full" while in-house listings hold their share. */
export async function premiumAvailability(slots: number, inHouse = false) {
  const now = new Date().toISOString()
  const [{ data: active }, { data: waiting }, inHouseHeld, inHouseSlots] = await Promise.all([
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
    inHouse ? rpc<number>('ellieo_premium_in_house_count', {}).catch(() => 0) : Promise.resolve(0),
    inHouse ? rpc<number>('ellieo_in_house_boost_slots', {}).catch(() => 1) : Promise.resolve(0),
  ])
  const used = active?.length ?? 0
  const queue = waiting?.length ?? 0
  const inHouseFull = inHouse && Number(inHouseHeld) >= Number(inHouseSlots)
  // The spot a new reservation gets: the (queue+1)-th Premium to end, if any.
  const ends = (active ?? []).map((row) => new Date(row.premium_end).getTime())
  const nextEnd = used >= slots && ends.length ? ends[Math.min(queue, ends.length - 1)] : null
  return {
    slots,
    used: Math.min(used, slots),
    full: used >= slots || inHouseFull,
    /** In-house: the in-house share of the spots is taken (outside spots may still be open). */
    inHouseFull,
    waiting: queue,
    /** Whole days until the next spot (for a new reservation) opens; null when a spot is open. */
    nextOpensInDays: nextEnd ? Math.max(1, Math.ceil((nextEnd - Date.now()) / 86_400_000)) : null,
  }
}

/** Composer / plan sheet: prices, Boost spots, my balance, top-up link flags. */
export async function planOptions(uid: string, topUp: { ios: boolean; android: boolean }) {
  await promotePremium()
  const p = await getListingPrices()
  const inHouse = await isInHouse(uid).catch(() => false)
  const [balance, premium, discount] = await Promise.all([
    creditBalance(uid),
    premiumAvailability(p.slots, inHouse),
    listingDiscount(uid).catch(() => null),
  ])
  const off = (n: number) => discounted(n, discount)
  return {
    /** Everything the app shows comes from here (one config), after the member's listing discount. */
    prices: {
      regular: Object.fromEntries(Object.entries(p.regular).map(([days, price]) => [days, off(price)])),
      premium: off(premiumPrice(p)),
      /** Boost on a listing that is already up (keeps its end date). */
      upgrade: off(upgradePrice(p)),
      extend: off(extendPrice(p)),
      premiumMode: p.premium.mode,
      boost: off(p.premium.boostPrice),
      maxExtensions: p.premium.maxExtensions,
    },
    /** Prices before the discount (null when there is none). */
    listPrices: discount ? { regular: p.regular, premium: premiumPrice(p), upgrade: upgradePrice(p), extend: extendPrice(p) } : null,
    discount: discount ? { percent: discount.percent, title: discount.title } : null,
    inHouse,
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
  // The member's in-house row must exist before the SQL counts in-house Boost spots.
  await isInHouse(uid).catch(() => false)
  const discount = await listingDiscount(uid).catch(() => null)
  const off = (n: number) => discounted(n, discount)
  const regularTotal = off(p.regular[String(p.premium.totalDays)] ?? 0)
  const reserveNow = action === 'reserve' && notLive && p.premium.mode === 'boost' ? regularTotal : 0
  const listPrice =
    action === 'regular'
      ? p.regular[String(days)]
      : action === 'premium' || action === 'reserve'
        ? premiumPrice(p)
        : extendPrice(p)
  if (action === 'regular' && listPrice === undefined) throw new CreditsError(SQL_ERRORS.INVALID_PLAN[0], 'INVALID_PLAN')
  const full = off(listPrice ?? 0)
  const price = action === 'reserve' ? full - reserveNow : full
  if (action === 'extend' && p.premium.maxExtensions < 1) throw new CreditsError('Premium can’t be extended right now.', 'NO_EXTENSION', 409)
  // Boost on a listing that is already up: the SQL charges (or holds) only this and keeps the listing's end date.
  // Null in bundle mode (old rule: full price, restarts totalDays). The SQL decides "already up" under its row lock.
  const upgrade = (action === 'premium' || action === 'reserve') && p.premium.mode === 'boost' ? off(p.premium.boostPrice) : null
  type Result = { ok: boolean; reservation?: string | null; charged?: number }
  const args = {
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
    p_promotion: discount?.id ?? null,
  }
  let result: Result
  if (upgrade === null) {
    result = await rpc<Result>('ellieo_listing_purchase', args)
  } else {
    try {
      result = await rpc<Result>('ellieo_listing_purchase', { ...args, p_upgrade_price: upgrade })
    } catch (error) {
      // Before agent_boost_upgrade_ellieo.sql runs the function has no p_upgrade_price: the old rule (full price, restart).
      if (!(error instanceof CreditsError && error.code === 'SETUP_REQUIRED')) throw error
      result = await rpc<Result>('ellieo_listing_purchase', args)
    }
  }
  if (action !== 'reserve') await promotePremium()
  /** price: what was taken (or held) now. */
  return { ...result, price: typeof result?.charged === 'number' ? result.charged : price }
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
