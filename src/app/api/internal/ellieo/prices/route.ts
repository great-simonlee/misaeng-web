import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { CreditsError, DEFAULT_LISTING_PRICES, extendPrice, getListingPrices, premiumPrice, saveListingPrices } from '@lib/ellieo/listingPlans.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP (Super Admin) → the one listing price config (ellieo_settings 'listing_prices').
 * Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = staff email.
 *   GET → { prices, defaults, computed: { premium, extend } }   PUT { prices } → same
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

async function payload() {
  const prices = await getListingPrices()
  return { prices, defaults: DEFAULT_LISTING_PRICES, computed: { premium: premiumPrice(prices), extend: extendPrice(prices) } }
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await payload(), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as { prices?: unknown }
    await saveListingPrices(body.prices, request.headers.get('x-admin-id')?.trim() || 'erp')
    return NextResponse.json(await payload())
  } catch (error) {
    if (error instanceof CreditsError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('Ellieo prices error:', error)
    return NextResponse.json({ error: 'Saving prices failed.' }, { status: 500 })
  }
}
