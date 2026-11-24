import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { analyticsError, clampInt, summary } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/internal/analytics/summary?days=7|28 — today vs the same weekday last week, a daily series, platforms. */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const days = clampInt(new URL(request.url).searchParams.get('days'), 7, 90, 28)
  try {
    return NextResponse.json(await summary(days))
  } catch (error) {
    return analyticsError(error)
  }
}
