import { NextResponse } from 'next/server'

import { getPlaceDetails } from '@lib/community/places.server'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const params = new URL(request.url).searchParams
    const placeId = params.get('placeId')?.trim() || ''
    const sessionToken = params.get('session')?.trim().slice(0, 64) || null
    if (!placeId) {
      return NextResponse.json(
        { error: t('places.placeIdRequired') },
        { status: 400 },
      )
    }
    const place = await getPlaceDetails(placeId, { sessionToken })
    if (!place) {
      return NextResponse.json(
        { error: t('places.notFound') },
        { status: 404 },
      )
    }
    // 이름이 비어 있는 OSM 결과는 기본 이름을 채운다
    const named = place.name.trim()
      ? place
      : place.placeId.startsWith('osm:')
        ? { ...place, name: t('places.placeFallbackName') }
        : place
    return NextResponse.json({ place: named })
  } catch (error) {
    console.error('Places details error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'places.detailsFailed'),
      },
      { status: 500 },
    )
  }
}
