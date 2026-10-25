import { NextResponse } from 'next/server'

import { MAP_VIEW_KINDS, USAGE_METRICS, type MapViewKind } from '@lib/usage/metrics'
import { recordUsage } from '@lib/usage/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const METRIC_BY_KIND: Record<MapViewKind, (typeof USAGE_METRICS)[keyof typeof USAGE_METRICS]> = {
  housing: USAGE_METRICS.mapViewHousing,
  food_place: USAGE_METRICS.mapViewFoodPlace,
  food_posts: USAGE_METRICS.mapViewFoodPosts,
}

/** POST { kind } — 지도 표시 1회 기록 (sendBeacon). 항상 204. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { kind?: string } | null
  const kind = body?.kind
  if (kind && (MAP_VIEW_KINDS as readonly string[]).includes(kind)) {
    recordUsage(METRIC_BY_KIND[kind as MapViewKind])
  }
  return new NextResponse(null, { status: 204 })
}
