import { NextResponse } from 'next/server'

import { premiumReturnOrigin } from '@lib/premium/returnOrigin.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { BRAND_CONFIG } from '@lib/brand'
import { cityPath, resolveCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getPremiumState } from '@lib/premium/access.server'
import { isParentAccount } from '@lib/community/schoolGate'
import { assertParentCanBuy } from '@lib/family/billing.server'
import { accountEmailOf, FamilyError } from '@lib/family/store.server'
import { getRequestT } from '@lib/i18n/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
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
 * POST /api/premium/checkout {plan, forUid?, city?, locale?} — Stripe Checkout for a Premium subscription. 7-day trial only
 * for members who never had Premium. Returns { url } to redirect to.
 * Never two subscriptions: one Stripe customer per member (created here once), refused while that customer has any
 * live Premium subscription (even one the webhook hasn't mirrored yet), and older open checkout pages are expired so
 * a second tab can't be paid. The webhook cancels + refunds a duplicate if one still slips through.
 * forUid (parent accounts, 1.0.9): Premium for a linked child, paid on the PARENT's Stripe customer (one subscription
 * per child); metadata user_uid = child, payer_uid = parent. Trial only if the child never had any Premium row.
 * Blocked (409 {error, code}) when the child has their own paid subscription (OWN_SUBSCRIPTION), another parent pays
 * (OTHER_PARENT) or this parent already pays (ALREADY_PAID_BY_YOU); 403 NOT_PARENT / NOT_LINKED.
 * A parent account never buys for itself: no forUid → 409 PARENT_CHOOSE_CHILD.
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

  const body = (await request.json().catch(() => ({}))) as { plan?: string; city?: string; locale?: string; forUid?: string }
  const plan = (PAID_PLANS as string[]).includes(body.plan ?? '') ? (body.plan as PaidPlan) : null
  if (!plan) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })
  const forUid = typeof body.forUid === 'string' ? body.forUid.trim() : ''
  if (forUid && forUid !== user.uid) return parentCheckout(request, stripe, user, forUid, plan, body)
  const profile = await getSupabaseProfile(user.uid).catch(() => null)
  if (isParentAccount(profile)) {
    const t = await getRequestT(request, 'api')
    return NextResponse.json({ error: t('family.chooseChild'), code: 'PARENT_CHOOSE_CHILD' }, { status: 409 })
  }

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
      // A failed payment (past_due / unpaid / incomplete): fix the card in the billing portal, never a 2nd subscription.
      const paymentIssue = sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'incomplete'
      return NextResponse.json({ error: paymentIssue ? 'PAYMENT_ISSUE' : 'Already Premium.' }, { status: 409 })
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

/** Parent → child checkout (see the header). */
async function parentCheckout(
  request: Request,
  stripe: Stripe,
  user: { uid: string; email?: string | null },
  childUid: string,
  plan: PaidPlan,
  body: { city?: string; locale?: string },
) {
  const t = await getRequestT(request, 'api')
  let childRows: Awaited<ReturnType<typeof assertParentCanBuy>>['childRows']
  let childProfile: Awaited<ReturnType<typeof assertParentCanBuy>>['childProfile']
  try {
    ;({ childRows, childProfile } = await assertParentCanBuy(user.uid, childUid))
  } catch (error) {
    if (error instanceof FamilyError) {
      return NextResponse.json({ error: t(error.key, error.params), code: error.code }, { status: error.status })
    }
    console.error('[premium/checkout] parent check', error)
    return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  }
  const price = await priceIdFor(stripe, plan)
  if (!price) return NextResponse.json({ error: 'Stripe prices are not set up.' }, { status: 503 })

  const parentState = await getPremiumState({ uid: user.uid, email: null })
  if (parentState.degraded) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  const customer = await memberCustomer(stripe, user, parentState.customerId)
  // Never two subscriptions for the same child on this customer (one the webhook hasn't mirrored yet included)
  const subs = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })
  for (const sub of subs.data) {
    if (sub.metadata?.user_uid !== childUid || !LIVE_STATUSES.has(sub.status)) continue
    if (!(await isPremiumPrice(sub.items?.data?.[0]?.price))) continue
    const paymentIssue = sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'incomplete'
    return NextResponse.json(
      paymentIssue
        ? { error: 'PAYMENT_ISSUE', code: 'PAYMENT_ISSUE' }
        : { error: t('family.blocked.ALREADY_PAID_BY_YOU'), code: 'ALREADY_PAID_BY_YOU' },
      { status: 409 },
    )
  }
  // Older open checkout pages for this child (another tab) can't be paid any more
  const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 20 })
  await Promise.all(
    open.data.filter((old) => old.metadata?.user_uid === childUid).map((old) => stripe.checkout.sessions.expire(old.id).catch(() => null)),
  )

  const childEmail = await accountEmailOf(childUid, childProfile).catch(() => null)
  const locale = isLocale(body.locale) ? body.locale : BRAND_CONFIG.serviceDefaultLocale
  const page = `${premiumReturnOrigin(request)}${localePath(locale, cityPath(resolveCityId(body.city), '/me/family'))}`
  const metadata = { user_uid: childUid, payer_uid: user.uid, plan }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: childUid,
    metadata,
    customer,
    subscription_data: {
      // email = the child's (the Premium row's member); payer_email = where reminders and receipts go
      metadata: { ...metadata, email: childEmail || '', payer_email: user.email || '' },
      ...(childRows.length === 0 ? { trial_period_days: TRIAL_DAYS } : {}),
    },
    payment_method_collection: 'always',
    success_url: `${page}?status=success&child=${encodeURIComponent(childUid)}`,
    cancel_url: `${page}?status=cancel`,
    locale: locale === 'ko' ? 'ko' : locale === 'vi' ? 'vi' : 'en',
  })
  return NextResponse.json({ url: session.url })
}
