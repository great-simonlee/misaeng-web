import { NextResponse } from 'next/server'

import { searchPlaces } from '@lib/community/places.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get('q')?.trim() || ''
    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }
    const results = await searchPlaces(q)
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
