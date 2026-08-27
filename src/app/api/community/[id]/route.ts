import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import {
  normalizeCptOptTimeline,
  normalizeCptOptTips,
  normalizeCptOptType,
  getCptOptTypeLabel,
  isCptOptTypeId,
} from '@lib/community/cptOpt'
import {
  getJobReviewTypeLabel,
  isJobReviewTypeId,
  normalizeJobReviewTimeline,
  normalizeJobReviewTips,
  normalizeJobReviewType,
} from '@lib/community/jobReview'
import {
  getRoommateLookingForLabel,
  isRoommateLookingFor,
  normalizeRoommateBudgetMax,
  normalizeRoommateLookingFor,
  normalizeRoommateMoveInDate,
} from '@lib/community/roommate'
import {
  COMMUNITY_BODY_MAX,
  isFoodCategoryId,
  normalizeFoodGalleryPhotos,
  normalizeFoodMenuItems,
  normalizePartySize,
  normalizeTotalSpend,
  normalizeWaitMinutes,
} from '@lib/community/food'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import {
  deleteStoredCommunityPost,
  getStoredCommunityPost,
  isCommunityStorageConfigured,
  saveStoredCommunityPost,
} from '@lib/supabase/community.server'
import type {
  CptOptTimelineEntry,
  CptOptTypeId,
  FoodCategoryId,
  FoodGalleryPhoto,
  FoodMenuItem,
  JobReviewTimelineEntry,
  JobReviewTypeId,
  RoommateLookingFor,
} from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

type UpdateBody = {
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
  galleryPhotos?: FoodGalleryPhoto[] | null
  placeId?: string | null
  placeName?: string | null
  latitude?: number | null
  longitude?: number | null
  cptOptType?: CptOptTypeId | null
  cptOptTimeline?: CptOptTimelineEntry[] | null
  cptOptTips?: string | null
  jobReviewType?: JobReviewTypeId | null
  jobReviewTimeline?: JobReviewTimelineEntry[] | null
  jobReviewTips?: string | null
  jobReviewIndustry?: string | null
  roommateLookingFor?: RoommateLookingFor | null
  roommateBudgetMax?: number | null
  roommateMoveInDate?: string | null
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
    const user = await resolveAuthenticatedUser()
    return NextResponse.json({
      post: sanitizeAnonymousCommunityPost(post, user?.uid),
    })
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
  const isCptOpt =
    existing.categoryId === 'status' || existing.categoryId === 'cpt-opt'
  const isJobReview = existing.categoryId === 'job-review'
  const isRoommate = existing.categoryId === 'roommate'
  const menuItems = isFood
    ? normalizeFoodMenuItems(body.menuItems ?? existing.menuItems)
    : []
  const galleryPhotos =
    isFood || isRoommate
      ? normalizeFoodGalleryPhotos(body.galleryPhotos ?? existing.galleryPhotos)
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

  const cptOptType = isCptOpt
    ? isCptOptTypeId(body.cptOptType)
      ? body.cptOptType!
      : normalizeCptOptType(
          body.cptOptType ?? existing.cptOptType,
          body.detail ?? existing.detail,
        )
    : null
  const cptOptTimeline = isCptOpt
    ? normalizeCptOptTimeline(body.cptOptTimeline ?? existing.cptOptTimeline)
    : []
  const cptOptTips = isCptOpt
    ? normalizeCptOptTips(body.cptOptTips ?? existing.cptOptTips)
    : null

  const jobReviewType = isJobReview
    ? isJobReviewTypeId(body.jobReviewType)
      ? body.jobReviewType!
      : normalizeJobReviewType(
          body.jobReviewType ?? existing.jobReviewType,
          body.detail ?? existing.detail,
        )
    : null
  const jobReviewTimeline = isJobReview
    ? normalizeJobReviewTimeline(
        body.jobReviewTimeline ?? existing.jobReviewTimeline,
      )
    : []
  const jobReviewTips = isJobReview
    ? normalizeJobReviewTips(body.jobReviewTips ?? existing.jobReviewTips)
    : null
  const jobReviewIndustry = isJobReview
    ? String(body.jobReviewIndustry ?? existing.jobReviewIndustry ?? '').trim() ||
      null
    : null

  const roommateLookingFor = isRoommate
    ? isRoommateLookingFor(body.roommateLookingFor)
      ? body.roommateLookingFor!
      : normalizeRoommateLookingFor(
          body.roommateLookingFor ?? existing.roommateLookingFor,
          body.detail ?? existing.detail,
        )
    : null
  const roommateBudgetMax = isRoommate
    ? normalizeRoommateBudgetMax(
        body.roommateBudgetMax ??
          existing.roommateBudgetMax ??
          body.detail ??
          existing.detail,
      )
    : null
  const roommateMoveInDate = isRoommate
    ? normalizeRoommateMoveInDate(
        body.roommateMoveInDate ?? existing.roommateMoveInDate,
      )
    : null

  if (isRoommate && !roommateLookingFor) {
    return NextResponse.json(
      { error: '룸메이트 / 방 / 서블렛 중 유형을 선택해 주세요.' },
      { status: 400 },
    )
  }

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
        { error: '주소와 음식점 이름을 확인해 주세요.' },
        { status: 400 },
      )
    }
  }

  if (isCptOpt) {
    if (!cptOptType) {
      return NextResponse.json(
        { error: 'CPT / OPT / STEM OPT / 비자 / 영주권 유형을 선택해 주세요.' },
        { status: 400 },
      )
    }
    if (cptOptTimeline.length === 0) {
      return NextResponse.json(
        { error: '타임라인을 최소 1단계 이상 입력해 주세요.' },
        { status: 400 },
      )
    }
  }

  if (isJobReview) {
    if (!jobReviewType) {
      return NextResponse.json(
        { error: '인턴 / 신입 / 경력 / 계약 유형을 선택해 주세요.' },
        { status: 400 },
      )
    }
    if (jobReviewTimeline.length === 0) {
      return NextResponse.json(
        { error: '채용 단계를 최소 1건 이상 입력해 주세요.' },
        { status: 400 },
      )
    }
  }

  const next = {
    ...existing,
    ...(isCptOpt ? { categoryId: 'status' as const } : {}),
    title,
    contentHtml,
    description: htmlToPlainText(contentHtml).slice(0, 240),
    location: String(body.location ?? existing.location).trim() || (placeName ?? ''),
    detail: isCptOpt
      ? getCptOptTypeLabel(cptOptType)
      : isJobReview
        ? getJobReviewTypeLabel(jobReviewType)
        : isRoommate
          ? getRoommateLookingForLabel(roommateLookingFor)
          : String(body.detail ?? existing.detail).trim(),
    updatedAt: Date.now(),
    thumbnailUrl: isFood || isRoommate ? thumbnailUrl : null,
    partySize: isFood ? partySize : null,
    totalSpend: isFood ? totalSpend : null,
    waitMinutes: isFood ? waitMinutes : null,
    foodCategory,
    menuItems,
    galleryPhotos,
    placeId: isFood ? placeId : null,
    placeName: isFood ? placeName : null,
    latitude: isFood ? latitude : null,
    longitude: isFood ? longitude : null,
    cptOptType: isCptOpt ? cptOptType : null,
    cptOptTimeline: isCptOpt ? cptOptTimeline : [],
    cptOptTips: isCptOpt ? cptOptTips || null : null,
    jobReviewType: isJobReview ? jobReviewType : null,
    jobReviewTimeline: isJobReview ? jobReviewTimeline : [],
    jobReviewTips: isJobReview ? jobReviewTips || null : null,
    jobReviewIndustry: isJobReview ? jobReviewIndustry : null,
    roommateLookingFor: isRoommate ? roommateLookingFor : null,
    roommateBudgetMax: isRoommate ? roommateBudgetMax : null,
    roommateMoveInDate: isRoommate ? roommateMoveInDate : null,
  }

  try {
    const saved = await saveStoredCommunityPost(next)
    return NextResponse.json({
      post: sanitizeAnonymousCommunityPost(saved, user.uid),
    })
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
