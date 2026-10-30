import { NextResponse } from 'next/server'

import { enabledCityIds } from '@lib/cities/availability.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 공개 중인 도시 id (웹 도시 선택, 앱 도시 목록). `{ cities: ['nyc', 'boston'] }` */
export async function GET() {
  return NextResponse.json(
    { cities: await enabledCityIds() },
    { headers: { 'Cache-Control': 'public, max-age=30' } },
  )
}
