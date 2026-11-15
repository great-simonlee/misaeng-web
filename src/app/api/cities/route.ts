import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { seesClosedCities, visibleCityIds } from '@lib/cities/availability.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 공개 중인 도시 id (웹 도시 선택, 앱 도시 목록). `{ cities: ['nyc', 'boston'] }`.
 * Super Admin(simon@misaeng.com)으로 로그인한 요청에는 닫힌 도시(dc)도 넣는다 — 그 응답은 캐시하지 않는다.
 */
export async function GET() {
  const user = await resolveAuthenticatedUser().catch(() => null)
  const preview = seesClosedCities(user?.email)
  return NextResponse.json(
    { cities: await visibleCityIds(user?.email) },
    {
      headers: {
        'Cache-Control': preview ? 'private, no-store' : 'public, max-age=30',
        Vary: 'Authorization, Cookie',
      },
    },
  )
}
