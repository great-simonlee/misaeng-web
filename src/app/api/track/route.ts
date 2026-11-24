import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'
import { allowEvents, storeEvents, toRow, TRACK_MAX_BYTES, TRACK_MAX_EVENTS } from '@lib/analytics/track.server'
import { isPointsStoreConfigured, PointsStoreError } from '@lib/points/rest.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/track {events: [...]} — behavior events from the Misaeng apps and website (supabase/analytics.sql).
 * Signed-in: the account comes from the session (Bearer / cookies), never from the body. Bad events are dropped
 * one by one; the reply is always quick and never an error the user would see. sendBeacon posts text/plain JSON.
 */
export async function POST(request: Request) {
  if (!isPointsStoreConfigured()) return NextResponse.json({ ok: false }, { status: 503 })
  const text = await request.text().catch(() => '')
  if (!text || text.length > TRACK_MAX_BYTES) return NextResponse.json({ error: 'Invalid body.' }, { status: 413 })
  let body: { events?: unknown }
  try {
    body = JSON.parse(text) as { events?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const events = Array.isArray(body.events) ? body.events.slice(0, TRACK_MAX_EVENTS) : []
  if (!events.length) return NextResponse.json({ ok: true, accepted: 0 })

  const user = await resolveAuthenticatedUser().catch(() => null)
  const uid = user?.uid ?? null
  const now = Date.now()
  const rows = events.map((e) => toRow(e, uid, now)).filter((r): r is NonNullable<typeof r> => r !== null)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const key = uid ? `u:${uid}` : `a:${rows[0]?.anonymous_id ?? ip}`
  if (!allowEvents(key, rows.length, now) || (!uid && !allowEvents(`ip:${ip}`, rows.length, now))) {
    return NextResponse.json({ ok: false, error: 'Too many events.' }, { status: 429 })
  }

  try {
    await storeEvents(rows)
  } catch (error) {
    if (error instanceof PointsStoreError && error.setupRequired) {
      return NextResponse.json({ ok: false, error: 'Analytics tables are not set up (run supabase/analytics.sql).' }, { status: 503 })
    }
    console.error('[analytics] track', error)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
  return NextResponse.json({ ok: true, accepted: rows.length, dropped: events.length - rows.length })
}
