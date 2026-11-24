import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { breakdown, parsePlatform, parseRange } from '@lib/analytics/breakdown.server'
import { analyticsError } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/internal/analytics/breakdown?days=1|7|28|90 (or from&to, New York days, ≤ 92) &platform=all|ios|android|web
 * — KPIs vs the previous period, daily series and every breakdown section (supabase/analytics_more.sql).
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const params = new URL(request.url).searchParams
  const { from, to } = parseRange(params)
  try {
    return NextResponse.json(await breakdown(from, to, parsePlatform(params.get('platform'))))
  } catch (error) {
    return analyticsError(error)
  }
}
