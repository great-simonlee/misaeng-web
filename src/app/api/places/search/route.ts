import { NextResponse } from 'next/server'

import { searchAddresses, searchPlaces } from '@lib/community/places.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const mode = searchParams.get('mode')?.trim() || 'place'
    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }
    const results =
      mode === 'address' ? await searchAddresses(q) : await searchPlaces(q)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      {
        results: [],
        error:
          error instanceof Error
            ? error.message
            : '장소 검색에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
