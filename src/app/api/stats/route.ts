import { NextResponse } from 'next/server'

import { getSiteStats } from '@lib/stats/siteStats.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 앱 홈 배너 숫자 — 로그인 없이 공개, 모든 도시 합계.
 * { members, posts: { housing, food, roommate, visa, jobReview, anonymous }, updatedAt }
 * 서버는 10분 캐시, CDN·브라우저는 5분 + 그 뒤 10분은 지난 값을 보여 주며 새로 받는다.
 */
export async function GET() {
  try {
    const stats = await getSiteStats()
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Site stats error:', error)
    return NextResponse.json(
      { error: 'Failed to load stats.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
