import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { parsePlatform, series, SERIES_METRICS } from '@lib/analytics/breakdown.server'
import { analyticsError, clampInt } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/internal/analytics/series?metric=dau&days=90&platform=all — one metric per New York day (metrics_daily). */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const params = new URL(request.url).searchParams
  const metric = params.get('metric') ?? 'dau'
  if (!(SERIES_METRICS as readonly string[]).includes(metric)) {
    return NextResponse.json({ error: `Unknown metric. Use one of: ${SERIES_METRICS.join(', ')}` }, { status: 400 })
  }
  try {
    return NextResponse.json(await series(metric, clampInt(params.get('days'), 1, 400, 28), parsePlatform(params.get('platform'))))
  } catch (error) {
    return analyticsError(error)
  }
}
