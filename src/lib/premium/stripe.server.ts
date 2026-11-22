import Stripe from 'stripe'

import { invalidatePremium } from './access.server'
import { upsertEntitlement, type PremiumPlan, type PremiumStatus } from './entitlements.server'

/**
 * Stripe for web Premium (account Misaeng LLC). Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET; prices from
 * STRIPE_PRICE_MONTHLY / _SEASON / _ANNUAL, else by lookup key premium_monthly / premium_season / premium_annual
 * (scripts/stripe-setup.mjs creates them; the product's statement descriptor is MISAENG PREMIUM).
 */

export type PaidPlan = 'monthly' | 'season' | 'annual'
export const PAID_PLANS: PaidPlan[] = ['monthly', 'season', 'annual']
export const TRIAL_DAYS = 7

const LOOKUP_KEYS: Record<PaidPlan, string> = {
  monthly: 'premium_monthly',
  season: 'premium_season',
  annual: 'premium_annual',
}

let client: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  client ??= new Stripe(key)
  return client
}

export function stripeEnvironment(): 'live' | 'test' {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_live') ? 'live' : 'test'
}

const priceCache = new Map<PaidPlan, string>()

export async function priceIdFor(stripe: Stripe, plan: PaidPlan): Promise<string | null> {
  const fromEnv = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim()
  if (fromEnv) return fromEnv
  const cached = priceCache.get(plan)
  if (cached) return cached
  const prices = await stripe.prices.list({ lookup_keys: [LOOKUP_KEYS[plan]], active: true, limit: 1 })
  const id = prices.data[0]?.id ?? null
  if (id) priceCache.set(plan, id)
  return id
}

/**
 * Only Misaeng Premium prices count. The same Stripe account (Misaeng LLC) also carries the legacy Ellieo backend's
 * payments (its own webhook → ellieo.com/v1/api/payment/webhook/stripe), and those must never grant or end Premium.
 */
export function isPremiumPrice(price: Stripe.Price | null | undefined): boolean {
  if (!price) return false
  return PAID_PLANS.some(
    (plan) => price.lookup_key === LOOKUP_KEYS[plan] || process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() === price.id,
  )
}

function planFromPrice(price: Stripe.Price | null | undefined): PremiumPlan {
  if (!price) return 'monthly'
  for (const plan of PAID_PLANS) {
    if (price.lookup_key === LOOKUP_KEYS[plan]) return plan
    if (process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() === price.id) return plan
  }
  const months = (price.recurring?.interval === 'year' ? 12 : 1) * (price.recurring?.interval_count ?? 1)
  return months >= 12 ? 'annual' : months >= 3 ? 'season' : 'monthly'
}

function statusFrom(status: Stripe.Subscription.Status): PremiumStatus {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    default:
      // incomplete / incomplete_expired / paused: no access
      return 'expired'
  }
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined
  const seconds =
    (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end ?? item?.current_period_end
  return seconds ? new Date(seconds * 1000).toISOString() : null
}

/** Mirror one Stripe subscription into premium_entitlements (keyed by the subscription id). */
export async function syncSubscription(sub: Stripe.Subscription, fallbackUid?: string | null, email?: string | null) {
  const uid = sub.metadata?.user_uid || fallbackUid
  const price = sub.items?.data?.[0]?.price
  if (!uid || !isPremiumPrice(price)) return
  await upsertEntitlement({
    user_uid: uid,
    email: email ?? sub.metadata?.email ?? null,
    source: 'stripe',
    plan: planFromPrice(price),
    status: statusFrom(sub.status),
    current_period_end: periodEnd(sub),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    external_id: sub.id,
    customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    product_id: price?.id ?? null,
    environment: sub.livemode ? 'live' : 'test',
    raw: { status: sub.status, price: price?.id, lookup_key: price?.lookup_key ?? null },
  })
  invalidatePremium(uid)
}
