import { NextResponse } from 'next/server'

import { searchAddresses, searchPlaces } from '@lib/community/places.server'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const mode = searchParams.get('mode')?.trim() || 'place'
    // 비용 절감 옵션 (PlaceSearchField): 타이핑 중엔 settled=0 → 자동완성만, 멈추면 settled=1
    // 다른 클라이언트(앱 등)는 기존처럼 전체 검색이 되도록 기본값은 settled
    const options = {
      sessionToken: searchParams.get('session')?.trim().slice(0, 64) || null,
      settled: searchParams.get('settled') !== '0',
    }
    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }
    const found =
      mode === 'address' ? await searchAddresses(q, options) : await searchPlaces(q, options)
    const fallbackName = t(
      mode === 'address' ? 'places.addressFallbackName' : 'places.placeFallbackName',
    )
    const results = found.map((item) =>
      item.name ? item : { ...item, name: fallbackName },
    )
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      {
        results: [],
        error: apiErrorMessage(t, error, 'places.searchFailed'),
      },
      { status: 500 },
    )
  }
}
