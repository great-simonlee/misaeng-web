import { NextResponse } from 'next/server'

import { premiumReturnOrigin } from '@lib/premium/returnOrigin.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { BRAND_CONFIG } from '@lib/brand'
import { cityPath, resolveCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getPremiumState } from '@lib/premium/access.server'
import {
  PAID_PLANS,
  TRIAL_DAYS,
  getStripe,
  priceIdFor,
  type PaidPlan,
} from '@lib/premium/stripe.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/checkout {plan, city?, locale?} — Stripe Checkout for a Premium subscription. 7-day trial only
 * for members who never had Premium. Returns { url } to redirect to.
 */
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { plan?: string; city?: string; locale?: string }
  const plan = (PAID_PLANS as string[]).includes(body.plan ?? '') ? (body.plan as PaidPlan) : null
  if (!plan) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })

  const state = await getPremiumState(user)
  if (state.premium && state.source !== 'staff') {
    return NextResponse.json({ error: 'Already Premium.' }, { status: 409 })
  }
  const price = await priceIdFor(stripe, plan)
  if (!price) return NextResponse.json({ error: 'Stripe prices are not set up.' }, { status: 503 })

  const locale = isLocale(body.locale) ? body.locale : BRAND_CONFIG.serviceDefaultLocale
  const page = `${premiumReturnOrigin(request)}${localePath(locale, cityPath(resolveCityId(body.city), '/premium'))}`
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.uid,
    metadata: { user_uid: user.uid, plan },
    ...(state.customerId ? { customer: state.customerId } : { customer_email: user.email || undefined }),
    subscription_data: {
      metadata: { user_uid: user.uid, plan, email: user.email || '' },
      ...(state.trialAvailable ? { trial_period_days: TRIAL_DAYS } : {}),
    },
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    success_url: `${page}?status=success`,
    cancel_url: `${page}?status=cancel`,
    locale: locale === 'ko' ? 'ko' : locale === 'vi' ? 'vi' : 'en',
  })
  return NextResponse.json({ url: session.url })
}
