import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import {
  COMMUNITY_BODY_MAX,
  isFoodCategoryId,
  normalizeFoodMenuItems,
  normalizePartySize,
  normalizeTotalSpend,
  normalizeWaitMinutes,
} from '@lib/community/food'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import {
  deleteStoredCommunityPost,
  getStoredCommunityPost,
  isCommunityStorageConfigured,
  saveStoredCommunityPost,
} from '@lib/supabase/community.server'
import type { FoodCategoryId, FoodMenuItem } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

type UpdateBody = {
  status?: string
  title?: string
  contentHtml?: string
  location?: string
  detail?: string
  thumbnailUrl?: string | null
  partySize?: number | null
  totalSpend?: number | null
  waitMinutes?: number | null
  foodCategory?: FoodCategoryId | null
  menuItems?: FoodMenuItem[] | null
  placeId?: string | null
  placeName?: string | null
  latitude?: number | null
  longitude?: number | null
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const post = await getStoredCommunityPost(id)
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (post.status === 'closed') {
      const user = await resolveAuthenticatedUser()
      if (!user?.uid || user.uid !== post.authorUid) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }
    return NextResponse.json({ post })
  } catch (error) {
    console.error('Community get error:', error)
    return NextResponse.json({ error: 'Failed to load post.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isCommunityStorageConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 설정이 필요해요.' },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await getStoredCommunityPost(id)
  if (!existing) {
    return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 })
  }
  if (existing.authorUid !== user.uid) {
    return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as UpdateBody | null
  if (!body) {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  }

  // 마감만
  if (body.status === 'closed' && Object.keys(body).length === 1) {
    try {
      const saved = await saveStoredCommunityPost({
        ...existing,
        status: 'closed',
        updatedAt: Date.now(),
      })
      return NextResponse.json({ post: saved })
    } catch (error) {
      console.error('Community close error:', error)
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : '마감에 실패했어요.',
        },
        { status: 500 },
      )
    }
  }

  // 내용 수정
  const title = String(body.title ?? existing.title).trim()
  const contentHtml = sanitizeCommunityHtml(
    String(body.contentHtml ?? existing.contentHtml).trim(),
  )
  if (!title || !contentHtml || contentHtml === '<p></p>') {
    return NextResponse.json(
      { error: '제목과 본문을 입력해 주세요.' },
      { status: 400 },
    )
  }
  const plainLength = htmlToPlainText(contentHtml).length
  if (plainLength > COMMUNITY_BODY_MAX) {
    return NextResponse.json(
      {
        error: `본문은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요.`,
      },
      { status: 400 },
    )
  }

  const isFood = existing.categoryId === 'food'
  const menuItems = isFood
    ? normalizeFoodMenuItems(body.menuItems ?? existing.menuItems)
    : []
  const partySize = isFood
    ? normalizePartySize(body.partySize ?? existing.partySize)
    : null
  const totalSpend = isFood
    ? normalizeTotalSpend(body.totalSpend ?? existing.totalSpend)
    : null
  const waitMinutes = isFood
    ? normalizeWaitMinutes(body.waitMinutes ?? existing.waitMinutes)
    : null
  const thumbnailUrl =
    typeof body.thumbnailUrl === 'string' && body.thumbnailUrl.trim()
      ? body.thumbnailUrl.trim()
      : body.thumbnailUrl === null
        ? null
        : existing.thumbnailUrl
  const placeId =
    isFood && typeof body.placeId === 'string' && body.placeId.trim()
      ? body.placeId.trim()
      : isFood
        ? existing.placeId
        : null
  const placeName =
    isFood && typeof body.placeName === 'string' && body.placeName.trim()
      ? body.placeName.trim()
      : isFood
        ? existing.placeName
        : null
  const latitudeRaw = Number(body.latitude ?? existing.latitude)
  const longitudeRaw = Number(body.longitude ?? existing.longitude)
  const latitude =
    isFood && Number.isFinite(latitudeRaw) && Math.abs(latitudeRaw) <= 90
      ? latitudeRaw
      : isFood
        ? existing.latitude
        : null
  const longitude =
    isFood && Number.isFinite(longitudeRaw) && Math.abs(longitudeRaw) <= 180
      ? longitudeRaw
      : isFood
        ? existing.longitude
        : null
  const foodCategory = isFood
    ? isFoodCategoryId(body.foodCategory)
      ? body.foodCategory
      : existing.foodCategory
    : null

  if (isFood) {
    if (partySize == null) {
      return NextResponse.json(
        { error: '방문 인원을 입력해 주세요.' },
        { status: 400 },
      )
    }
    if (totalSpend == null) {
      return NextResponse.json(
        { error: '총 금액을 입력해 주세요.' },
        { status: 400 },
      )
    }
    if (waitMinutes == null) {
      return NextResponse.json(
        { error: '웨이팅 시간을 입력해 주세요. (없으면 0)' },
        { status: 400 },
      )
    }
    if (!foodCategory) {
      return NextResponse.json(
        { error: '카테고리를 선택해 주세요. (맛집·가성비·느좋·카공)' },
        { status: 400 },
      )
    }
    if (latitude == null || longitude == null || !placeName) {
      return NextResponse.json(
        { error: '지도에서 식당을 검색해 선택해 주세요.' },
        { status: 400 },
      )
    }
  }

  const next = {
    ...existing,
    title,
    contentHtml,
    description: htmlToPlainText(contentHtml).slice(0, 240),
    location: String(body.location ?? existing.location).trim() || (placeName ?? ''),
    detail: String(body.detail ?? existing.detail).trim(),
    updatedAt: Date.now(),
    thumbnailUrl: isFood ? thumbnailUrl : null,
    partySize: isFood ? partySize : null,
    totalSpend: isFood ? totalSpend : null,
    waitMinutes: isFood ? waitMinutes : null,
    foodCategory,
    menuItems,
    placeId: isFood ? placeId : null,
    placeName: isFood ? placeName : null,
    latitude: isFood ? latitude : null,
    longitude: isFood ? longitude : null,
  }

  try {
    const saved = await saveStoredCommunityPost(next)
    return NextResponse.json({ post: saved })
  } catch (error) {
    console.error('Community update error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '수정에 실패했어요.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isCommunityStorageConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 설정이 필요해요.' },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await getStoredCommunityPost(id)
  if (!existing) {
    return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 })
  }
  if (existing.authorUid !== user.uid) {
    return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 })
  }

  try {
    const ok = await deleteStoredCommunityPost(id)
    if (!ok) {
      return NextResponse.json({ error: '삭제에 실패했어요.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Community delete error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '삭제에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
