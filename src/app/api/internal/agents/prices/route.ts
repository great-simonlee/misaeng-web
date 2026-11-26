import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { DEFAULT_CREDITS_CONFIG, getCreditsConfig, paymentsEnabled, saveCreditsConfig } from '@lib/agents/credits.server'
import { CreditsError, DEFAULT_LISTING_PRICES, extendPrice, getListingPrices, premiumPrice, saveListingPrices } from '@lib/agents/listingPlans.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP (Super Admin) → the one config: listing prices + credit packs / tax / top-up links / seller.
 * Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = staff email.
 *   GET → { prices, credits, defaults, computed, paymentsEnabled }   PUT { prices?, credits? } → same
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

async function payload() {
  const [prices, credits] = await Promise.all([getListingPrices(), getCreditsConfig()])
  return {
    prices,
    credits,
    defaults: { prices: DEFAULT_LISTING_PRICES, credits: DEFAULT_CREDITS_CONFIG },
    computed: { premium: premiumPrice(prices), extend: extendPrice(prices) },
    paymentsEnabled: paymentsEnabled(),
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await payload(), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as { prices?: unknown; credits?: unknown }
    const by = request.headers.get('x-admin-id')?.trim() || 'erp'
    if (body.prices !== undefined) await saveListingPrices(body.prices, by)
    if (body.credits !== undefined) await saveCreditsConfig(body.credits, by)
    return NextResponse.json(await payload())
  } catch (error) {
    if (error instanceof CreditsError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('Misaeng prices error:', error)
    return NextResponse.json({ error: 'Saving prices failed.' }, { status: 500 })
  }
}
