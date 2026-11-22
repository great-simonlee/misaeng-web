import { NextResponse } from 'next/server'

import { premiumReturnOrigin } from '@lib/premium/returnOrigin.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { BRAND_CONFIG } from '@lib/brand'
import { cityPath, resolveCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getPremiumState } from '@lib/premium/access.server'
import type Stripe from 'stripe'

import {
  PAID_PLANS,
  TRIAL_DAYS,
  getStripe,
  isPremiumPrice,
  priceIdFor,
  type PaidPlan,
} from '@lib/premium/stripe.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/checkout {plan, city?, locale?} — Stripe Checkout for a Premium subscription. 7-day trial only
 * for members who never had Premium. Returns { url } to redirect to.
 * Never two subscriptions: one Stripe customer per member (created here once), refused while that customer has any
 * live Premium subscription (even one the webhook hasn't mirrored yet), and older open checkout pages are expired so
 * a second tab can't be paid. The webhook cancels + refunds a duplicate if one still slips through.
 */

const LIVE_STATUSES = new Set(['trialing', 'active', 'past_due', 'unpaid', 'incomplete'])

async function memberCustomer(stripe: Stripe, user: { uid: string; email?: string | null }, known: string | null) {
  if (known) return known
  // One customer per member: find one we made before (metadata), else create it (idempotent for double clicks).
  const found = await stripe.customers.search({ query: `metadata['user_uid']:'${user.uid.replace(/'/g, '')}'`, limit: 1 }).catch(() => null)
  if (found?.data[0]) return found.data[0].id
  const customer = await stripe.customers.create(
    { email: user.email || undefined, metadata: { user_uid: user.uid } },
    { idempotencyKey: `misaeng-customer-${user.uid}` },
  )
  return customer.id
}
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { plan?: string; city?: string; locale?: string }
  const plan = (PAID_PLANS as string[]).includes(body.plan ?? '') ? (body.plan as PaidPlan) : null
  if (!plan) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })

  // Staff preview emails count by entitlement only here, so staff can test a real checkout.
  const state = await getPremiumState({ uid: user.uid, email: null })
  if (state.degraded) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  if (state.premium) return NextResponse.json({ error: 'Already Premium.' }, { status: 409 })
  const price = await priceIdFor(stripe, plan)
  if (!price) return NextResponse.json({ error: 'Stripe prices are not set up.' }, { status: 503 })

  const customer = await memberCustomer(stripe, user, state.customerId)
  const subs = await stripe.subscriptions.list({ customer, status: 'all', limit: 20 })
  for (const sub of subs.data) {
    if (LIVE_STATUSES.has(sub.status) && (await isPremiumPrice(sub.items?.data?.[0]?.price))) {
      return NextResponse.json({ error: 'Already Premium.' }, { status: 409 })
    }
  }
  const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 10 })
  await Promise.all(open.data.map((old) => stripe.checkout.sessions.expire(old.id).catch(() => null)))

  const locale = isLocale(body.locale) ? body.locale : BRAND_CONFIG.serviceDefaultLocale
  const page = `${premiumReturnOrigin(request)}${localePath(locale, cityPath(resolveCityId(body.city), '/premium'))}`
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.uid,
    metadata: { user_uid: user.uid, plan },
    customer,
    subscription_data: {
      metadata: { user_uid: user.uid, plan, email: user.email || '' },
      ...(state.trialAvailable ? { trial_period_days: TRIAL_DAYS } : {}),
    },
    payment_method_collection: 'always',
    // No promotion-code box: the Stripe account also holds legacy Ellieo coupons that must not apply to Premium.
    success_url: `${page}?status=success`,
    cancel_url: `${page}?status=cancel`,
    locale: locale === 'ko' ? 'ko' : locale === 'vi' ? 'vi' : 'en',
  })
  return NextResponse.json({ url: session.url })
}
