import { NextResponse } from 'next/server'

import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'
import { analyticsError, clampInt, content } from '@lib/analytics/reports.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPES = new Set(['all', 'post', 'company', 'job', 'search', 'community', 'housing', 'roommate', 'sublet', 'market', 'review', 'visa_news', 'food'])

/** GET /api/internal/analytics/content?type=post|company|job|search|…&days=28&limit=30 — most viewed / searched. */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const params = new URL(request.url).searchParams
  const type = TYPES.has(params.get('type') ?? '') ? params.get('type')! : 'post'
  try {
    return NextResponse.json(await content(type, clampInt(params.get('days'), 1, 400, 28), clampInt(params.get('limit'), 1, 200, 30)))
  } catch (error) {
    return analyticsError(error)
  }
}
