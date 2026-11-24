import { NextResponse } from 'next/server'

import { premiumReturnOrigin } from '@lib/premium/returnOrigin.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { BRAND_CONFIG } from '@lib/brand'
import { cityPath, resolveCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getPremiumState } from '@lib/premium/access.server'
import { getStripe } from '@lib/premium/stripe.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/premium/portal {city?, locale?, returnTo?: 'family'} — Stripe billing portal (cancel, change card / plan). Returns { url }. */
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const state = await getPremiumState(user)
  if (!state.customerId) return NextResponse.json({ error: 'No web subscription.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { city?: string; locale?: string; returnTo?: string }
  const locale = isLocale(body.locale) ? body.locale : BRAND_CONFIG.serviceDefaultLocale
  const session = await stripe.billingPortal.sessions.create({
    customer: state.customerId,
    // returnTo 'family': the parent's 자녀 page (a parent's customer covers every child's web subscription)
    return_url: `${premiumReturnOrigin(request)}${localePath(locale, cityPath(resolveCityId(body.city), body.returnTo === 'family' ? '/me/family' : '/premium'))}`,
  })
  return NextResponse.json({ url: session.url })
}
