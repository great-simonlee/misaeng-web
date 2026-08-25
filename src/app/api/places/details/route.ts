import { NextResponse } from 'next/server'

import { getPlaceDetails } from '@lib/community/places.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const placeId =
      new URL(request.url).searchParams.get('placeId')?.trim() || ''
    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId가 필요해요.' },
        { status: 400 },
      )
    }
    const place = await getPlaceDetails(placeId)
    if (!place) {
      return NextResponse.json(
        { error: '장소 정보를 찾지 못했어요.' },
        { status: 404 },
      )
    }
    return NextResponse.json({ place })
  } catch (error) {
    console.error('Places details error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '장소 정보를 불러오지 못했어요.',
      },
      { status: 500 },
    )
  }
}
