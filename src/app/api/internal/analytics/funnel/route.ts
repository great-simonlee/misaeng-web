import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { addDays, analyticsError, funnel, isDay, nyToday } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/internal/analytics/funnel?kind=signup|housing&from=YYYY-MM-DD&to=YYYY-MM-DD (default: last 28 days). */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const params = new URL(request.url).searchParams
  const kind = params.get('kind') === 'housing' ? 'housing' : 'signup'
  const to = isDay(params.get('to')) ? params.get('to')! : nyToday()
  const from = isDay(params.get('from')) ? params.get('from')! : addDays(to, -27)
  try {
    return NextResponse.json(await funnel(kind, from, to))
  } catch (error) {
    return analyticsError(error)
  }
}
