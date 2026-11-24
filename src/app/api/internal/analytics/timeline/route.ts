import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { analyticsError, canViewTimeline, clampInt, timeline } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/internal/analytics/timeline?uid=…&limit=200&before=ISO — one member's events, newest first.
 * Super Admin only: header x-admin-email (checked here too, not only in the ERP). Every view is logged.
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const viewer = request.headers.get('x-admin-email')?.trim() || ''
  if (!canViewTimeline(viewer)) return NextResponse.json({ error: 'Only the Super Admin can open member timelines.', code: 'FORBIDDEN' }, { status: 403 })
  const params = new URL(request.url).searchParams
  const uid = params.get('uid')?.trim() || ''
  if (!uid || uid.length > 128) return NextResponse.json({ error: 'uid is required.' }, { status: 400 })
  const before = params.get('before')
  try {
    return NextResponse.json(
      await timeline(uid, viewer, clampInt(params.get('limit'), 1, 500, 200), before && Number.isFinite(Date.parse(before)) ? before : null),
    )
  } catch (error) {
    return analyticsError(error)
  }
}
