import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getBrokerageSettings, saveBrokerageSettings } from '@lib/agents/brokerage.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → Misaeng: the brokerage shown on Misaeng's own listings (NY advertising disclosure) and the Fair Housing links.
 * Header `x-internal-secret: $INTERNAL_PUSH_SECRET`, `x-admin-id` = staff email.
 *   GET            → { brokerage: { name, licenseType, responsibleBroker, officePhone, officeEmail, officeAddress, … } }
 *   POST { … }     → { brokerage } (fields given are saved; name can't be empty)
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ brokerage: await getBrokerageSettings() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, string>
    const brokerage = await saveBrokerageSettings(body, request.headers.get('x-admin-id')?.trim() || 'erp')
    return NextResponse.json({ brokerage })
  } catch (error) {
    console.error('Misaeng brokerage settings error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Save failed.' }, { status: 500 })
  }
}
