import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { closeListingReport, listListingReports } from '@lib/agents/listings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ERP → Misaeng: reports on licensed agents' listings. Header `x-internal-secret`, `x-admin-id` = staff email.
 *   GET                         → { reports: [{ id, listing_id, reporter, reason, note, created_at }] } (open ones)
 *   POST { id, remove: bool }   → { ok } (closes it; remove = take the listing down)
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  const secret = process.env.INTERNAL_PUSH_SECRET?.trim() || ''
  return Boolean(given && secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ reports: await listListingReports() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    const id = String(body.id ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    return NextResponse.json(
      await closeListingReport({ id, remove: body.remove === true, by: request.headers.get('x-admin-id')?.trim() || 'erp' }),
    )
  } catch (error) {
    console.error('Misaeng listing report error:', error)
    return NextResponse.json({ error: 'Report update failed.' }, { status: 500 })
  }
}
