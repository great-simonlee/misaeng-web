import { BRAND_CONFIG } from '@lib/brand'
import {
  listEntitlements,
  listPaidByPayer,
  type PremiumEntitlement,
  type PremiumPlan,
  type PremiumSource,
  type PremiumStatus,
} from './entitlements.server'

/**
 * Who sees Premium content: emails in PREMIUM_PREVIEW_EMAILS (comma-separated, staff checking the screens), or a
 * premium_entitlements row (Stripe / App Store / Play / code / gift) that is trialing, active or past_due until
 * current_period_end. For past_due the writers store the grace end there (Stripe: 3 days after the failed invoice;
 * App Store: Apple's billing grace end), never the next period.
 * Stripe rows from the other Stripe mode (test rows on the live server and the reverse) are ignored.
 * If the database can't be read, nothing is cached and the state is marked `degraded` (checkout refuses then).
 */

type PremiumUser = { uid?: string | null; email?: string | null } | null

export type PremiumState = {
  premium: boolean
  plan: PremiumPlan | 'staff' | null
  source: PremiumSource | null
  until: string | null
  /** When the current Premium row started (code: the redeem day) — the apps draw a time-left bar. */
  since: string | null
  status: PremiumStatus | null
  cancelAtPeriodEnd: boolean
  /** No subscription or grant ever: the 7-day trial is offered. */
  trialAvailable: boolean
  /** A Stripe customer exists (web "구독 관리" opens the billing portal). */
  manageable: boolean
  customerId: string | null
  /**
   * Internal only (never sent to the apps): the parent paying for the Premium shown (state of a child), else null.
   * paidByParent in /api/premium/me is derived from it.
   */
  payerUid?: string | null
  /** A parent's own 14-day pass from a subscription they bought for a child (shown as a 'code' pass). */
  parentPass?: { since: string; until: string } | null
  /** The database could not be read: the state is unknown (shown as free, never cached, checkout refuses). */
  degraded?: boolean
}

/**
 * Launch gift (owner 2026-11-23): every signed-in Misaeng member — existing and new — has Premium free until the end of
 * 2026-12-31 New York time, with no card or checkout. Shown to the apps as a pass (source 'code', the "N일 남음" bar).
 * Real subscriptions/codes still win when they exist. The App Store review account is left out so App Review can test
 * the in-app purchase (PREMIUM_LAUNCH_EXCLUDE_EMAILS adds more, comma-separated).
 */
export const LAUNCH_FREE_SINCE = '2026-11-23T05:00:00.000Z'
export const LAUNCH_FREE_UNTIL = '2027-01-01T04:59:59.000Z'

function launchExcluded(email: string | undefined) {
  const list = ['simon+appreview@misaeng.com', ...(process.env.PREMIUM_LAUNCH_EXCLUDE_EMAILS || '').split(',')]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return Boolean(email && list.includes(email))
}

function withLaunchGift(value: PremiumState, uid: string, email: string | undefined): PremiumState {
  // A parent pass that ends before the launch gift: show the (longer) launch gift instead.
  const passOnly = Boolean(value.premium && value.parentPass && value.until === value.parentPass.until)
  if ((value.premium && !passOnly) || !uid || BRAND_CONFIG.id !== 'misaeng' || launchExcluded(email)) return value
  if (Date.now() >= Date.parse(LAUNCH_FREE_UNTIL)) return value
  if (passOnly && Date.parse(value.until!) >= Date.parse(LAUNCH_FREE_UNTIL)) return value
  return {
    ...value,
    premium: true,
    plan: 'code',
    source: 'code',
    until: LAUNCH_FREE_UNTIL,
    since: LAUNCH_FREE_SINCE,
    status: 'active',
    cancelAtPeriodEnd: false,
  }
}

const CACHE_MS = 60_000
const cache = new Map<string, { at: number; value: PremiumState }>()

const EMPTY: PremiumState = {
  premium: false,
  plan: null,
  source: null,
  until: null,
  since: null,
  status: null,
  cancelAtPeriodEnd: false,
  trialAvailable: true,
  manageable: false,
  customerId: null,
  payerUid: null,
  parentPass: null,
}

/** Paid sources (decision 5: these block a parent purchase; codes / gifts / launch gift don't). */
export const PAID_SOURCES = new Set(['stripe', 'apple', 'google'])
export const PARENT_PASS_DAYS = 14
const DAY_MS = 86_400_000

/**
 * Parent pass (owner decision 6): a parent who pays for a child gets Premium for 14 days from the subscription start
 * (trial start included). Refunded / revoked subscriptions don't count (Stripe: a premium_refunds row; Apple / Google:
 * status 'canceled' — their refund and revoke path). Returns the latest pass that is still running.
 */
export function parentPassFrom(
  paid: PremiumEntitlement[],
  refundedSubscriptionIds: Set<string>,
  now = Date.now(),
): { since: string; until: string } | null {
  let best: { since: string; until: string } | null = null
  for (const row of paid) {
    if (!PAID_SOURCES.has(row.source) || !sameStripeMode(row)) continue
    const start = Date.parse(row.created_at)
    const end = start + PARENT_PASS_DAYS * DAY_MS
    if (!Number.isFinite(start) || end <= now) continue
    if (refundedSubscriptionIds.has(row.external_id) || refundedSubscriptionIds.has(row.id)) continue
    if (row.source !== 'stripe' && row.status === 'canceled') continue
    if (row.source === 'stripe' && row.status === 'canceled' && row.current_period_end && Date.parse(row.current_period_end) <= start + DAY_MS) continue
    if (!best || end > Date.parse(best.until)) best = { since: new Date(start).toISOString(), until: new Date(end).toISOString() }
  }
  return best
}

async function refundedIds(rows: PremiumEntitlement[]): Promise<Set<string>> {
  const stripeRows = rows.filter((r) => r.source === 'stripe')
  if (!stripeRows.length) return new Set()
  const { rest } = await import('./entitlements.server')
  const ids = stripeRows.map((r) => encodeURIComponent(r.external_id)).join(',')
  const res = await rest(`premium_refunds?select=subscription_id,entitlement_id&subscription_id=in.(${ids})`).catch(() => null)
  if (!res?.ok) return new Set()
  const list = (await res.json()) as { subscription_id: string | null; entitlement_id: string | null }[]
  return new Set(list.flatMap((r) => [r.subscription_id, r.entitlement_id].filter((v): v is string => Boolean(v))))
}

function previewEmails() {
  return (process.env.PREMIUM_PREVIEW_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isActiveEntitlement(row: PremiumEntitlement, now = Date.now()): boolean {
  const end = row.current_period_end ? Date.parse(row.current_period_end) : null
  if (row.status === 'trialing' || row.status === 'active' || row.status === 'past_due') return end === null || end > now
  return false
}

/** Stripe rows written in the other Stripe mode (sk_test vs sk_live) don't count on this server. */
export function sameStripeMode(row: PremiumEntitlement) {
  if (row.source !== 'stripe' || !row.environment) return true
  const live = process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live') ?? false
  return row.environment === (live ? 'live' : 'test')
}

/** Forget a user's cached state (after a webhook / App Store write). */
export function invalidatePremium(uid: string) {
  cache.delete(uid)
}

export async function getPremiumState(user: PremiumUser): Promise<PremiumState> {
  const uid = user?.uid?.trim()
  const email = user?.email?.trim().toLowerCase()
  if (!uid && !email) return EMPTY
  const staff = Boolean(email && previewEmails().includes(email))
  if (!uid) return staff ? { ...EMPTY, premium: true, plan: 'staff', source: 'staff' } : EMPTY

  const hit = cache.get(uid)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    if (staff && !hit.value.premium) return { ...hit.value, premium: true, plan: 'staff', source: 'staff' }
    return withLaunchGift(hit.value, uid, email)
  }

  let rows: PremiumEntitlement[]
  let paid: PremiumEntitlement[]
  try {
    ;[rows, paid] = await Promise.all([
      listEntitlements(uid).then((list) => list.filter(sameStripeMode)),
      listPaidByPayer(uid).then((list) => list.filter(sameStripeMode)),
    ])
  } catch (error) {
    console.error('[premium] reading entitlements failed', error)
    const unknown: PremiumState = { ...EMPTY, trialAvailable: false, degraded: true }
    return staff ? { ...unknown, premium: true, plan: 'staff', source: 'staff' } : unknown
  }
  const active = rows
    .filter((row) => isActiveEntitlement(row))
    .sort((a, b) => Date.parse(b.current_period_end || '9999') - Date.parse(a.current_period_end || '9999'))[0]
  // The Stripe customer this member manages: their own subscriptions, or the ones they pay for as a parent (one
  // customer per payer). A parent-paid row on a child's account is the PARENT's customer — never the child's.
  const stripe =
    rows.find((row) => row.source === 'stripe' && row.customer_id && !row.payer_uid) ??
    paid.find((row) => row.source === 'stripe' && row.customer_id)
  const pass = paid.length ? parentPassFrom(paid, await refundedIds(paid)) : null
  const value: PremiumState = active
    ? {
        premium: true,
        plan: active.plan,
        source: active.source,
        until: active.current_period_end,
        since: active.created_at,
        status: active.status,
        cancelAtPeriodEnd: active.cancel_at_period_end,
        trialAvailable: false,
        manageable: Boolean(stripe),
        customerId: stripe?.customer_id ?? null,
        payerUid: active.payer_uid ?? null,
        parentPass: pass,
      }
    : pass
      ? {
          // Shaped like a code pass so apps that don't know parent passes show "N일 남음".
          ...EMPTY,
          premium: true,
          plan: 'code',
          source: 'code',
          until: pass.until,
          since: pass.since,
          status: 'active',
          trialAvailable: false,
          manageable: Boolean(stripe),
          customerId: stripe?.customer_id ?? null,
          parentPass: pass,
        }
      : {
          ...EMPTY,
          trialAvailable: rows.length === 0,
          manageable: Boolean(stripe),
          customerId: stripe?.customer_id ?? null,
        }
  cache.set(uid, { at: Date.now(), value })
  if (staff && !value.premium) return { ...value, premium: true, plan: 'staff', source: 'staff' }
  return withLaunchGift(value, uid, email)
}

export async function hasPremiumAccess(user: PremiumUser): Promise<boolean> {
  return (await getPremiumState(user)).premium
}
