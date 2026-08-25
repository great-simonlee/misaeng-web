import { NextResponse } from 'next/server'

import { collectNearbyFoodVenues } from '@lib/community/venues'
import {
  isCommunityStorageConfigured,
  listStoredCommunityPosts,
} from '@lib/supabase/community.server'
import { listMockCommunityPosts } from '@lib/constants/communityMock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const placeId = searchParams.get('placeId')?.trim() || null

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: '위도·경도가 필요해요.', venues: [] },
        { status: 400 },
      )
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json(
        { error: '잘못된 좌표예요.', venues: [] },
        { status: 400 },
      )
    }

    let posts = isCommunityStorageConfigured()
      ? await listStoredCommunityPosts('food')
      : []
    if (posts.length === 0) {
      posts = listMockCommunityPosts('food')
    }

    const venues = collectNearbyFoodVenues(posts, {
      latitude: lat,
      longitude: lng,
      placeId,
    })

    return NextResponse.json({ venues })
  } catch (error) {
    console.error('Nearby food venues error:', error)
    return NextResponse.json(
      {
        venues: [],
        error:
          error instanceof Error
            ? error.message
            : '기존 음식점 목록을 불러오지 못했어요.',
      },
      { status: 500 },
    )
  }
}
