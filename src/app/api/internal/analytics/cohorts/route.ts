import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { analyticsError, clampInt, cohorts } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/internal/analytics/cohorts?weeks=8 — signup week × weeks since signup. */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const weeks = clampInt(new URL(request.url).searchParams.get('weeks'), 1, 13, 8)
  try {
    return NextResponse.json(await cohorts(weeks))
  } catch (error) {
    return analyticsError(error)
  }
}
