import {
  listEntitlements,
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
  /** The database could not be read: the state is unknown (shown as free, never cached, checkout refuses). */
  degraded?: boolean
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
    return hit.value
  }

  let rows: PremiumEntitlement[]
  try {
    rows = (await listEntitlements(uid)).filter(sameStripeMode)
  } catch (error) {
    console.error('[premium] reading entitlements failed', error)
    const unknown: PremiumState = { ...EMPTY, trialAvailable: false, degraded: true }
    return staff ? { ...unknown, premium: true, plan: 'staff', source: 'staff' } : unknown
  }
  const active = rows
    .filter((row) => isActiveEntitlement(row))
    .sort((a, b) => Date.parse(b.current_period_end || '9999') - Date.parse(a.current_period_end || '9999'))[0]
  const stripe = rows.find((row) => row.source === 'stripe' && row.customer_id)
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
      }
    : {
        ...EMPTY,
        trialAvailable: rows.length === 0,
        manageable: Boolean(stripe),
        customerId: stripe?.customer_id ?? null,
      }
  cache.set(uid, { at: Date.now(), value })
  if (staff && !value.premium) return { ...value, premium: true, plan: 'staff', source: 'staff' }
  return value
}

export async function hasPremiumAccess(user: PremiumUser): Promise<boolean> {
  return (await getPremiumState(user)).premium
}
