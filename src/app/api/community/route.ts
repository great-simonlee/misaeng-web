import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'
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
import { isCommunityBoardId, isAnonymousBoard } from '@lib/constants/nyc'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
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
import {
  isCommunityStorageConfigured,
  listStoredCommunityPosts,
  listStoredCommunityPostsByAuthor,
  saveStoredCommunityPost,
} from '@lib/supabase/community.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import type {
  CommunityPost,
  CptOptTimelineEntry,
  CptOptTypeId,
  FoodCategoryId,
  FoodGalleryPhoto,
  FoodMenuItem,
  JobReviewTimelineEntry,
  JobReviewTypeId,
} from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get('mine') === '1'
    const board = searchParams.get('board')?.trim() || undefined
    if (board && !isCommunityBoardId(board)) {
      return NextResponse.json({ error: '잘못된 게시판입니다.' }, { status: 400 })
    }

    if (mine) {
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
      const posts = await listStoredCommunityPostsByAuthor(user.uid)
      return NextResponse.json({
        posts: posts.map((item) =>
          sanitizeAnonymousCommunityPost(item, user.uid),
        ),
      })
    }

    const user = await resolveAuthenticatedUser()
    const posts = await listStoredCommunityPosts(board)
    return NextResponse.json({
      posts: posts.map((item) =>
        sanitizeAnonymousCommunityPost(item, user?.uid),
      ),
    })
  } catch (error) {
    console.error('Community list error:', error)
    return NextResponse.json(
      { posts: [], error: 'Failed to load community posts.' },
      { status: 500 },
    )
  }
}

type CreateBody = {
  categoryId?: string
  title?: string
  contentHtml?: string
  location?: string
  detail?: string
  authorSchoolId?: string | null
  authorSchoolName?: string | null
  authorNickname?: string | null
  authorPhotoURL?: string | null
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
}

export async function POST(request: Request) {
  if (!isCommunityStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid || !user.email) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as CreateBody | null
  const categoryId = String(body?.categoryId || '').trim()
  if (!isCommunityBoardId(categoryId)) {
    return NextResponse.json({ error: '잘못된 게시판입니다.' }, { status: 400 })
  }

  const title = String(body?.title || '').trim()
  const contentHtml = sanitizeCommunityHtml(
    String(body?.contentHtml || '').trim(),
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

  const now = Date.now()
  const id = `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const isFood = categoryId === 'food'
  const isCptOpt = categoryId === 'status' || categoryId === 'cpt-opt'
  const isJobReview = categoryId === 'job-review'
  const isAnonymous = isAnonymousBoard(categoryId)
  const menuItems = isFood ? normalizeFoodMenuItems(body?.menuItems) : []
  const galleryPhotos = isFood
    ? normalizeFoodGalleryPhotos(body?.galleryPhotos)
    : []
  const partySize = isFood ? normalizePartySize(body?.partySize) : null
  const totalSpend = isFood ? normalizeTotalSpend(body?.totalSpend) : null
  const waitMinutes = isFood ? normalizeWaitMinutes(body?.waitMinutes) : null
  const thumbnailUrl =
    typeof body?.thumbnailUrl === 'string' && body.thumbnailUrl.trim()
      ? body.thumbnailUrl.trim()
      : null
  const placeId =
    isFood && typeof body?.placeId === 'string' && body.placeId.trim()
      ? body.placeId.trim()
      : null
  const placeName =
    isFood && typeof body?.placeName === 'string' && body.placeName.trim()
      ? body.placeName.trim()
      : null
  const latitudeRaw = Number(body?.latitude)
  const longitudeRaw = Number(body?.longitude)
  const latitude =
    isFood && Number.isFinite(latitudeRaw) && Math.abs(latitudeRaw) <= 90
      ? latitudeRaw
      : null
  const longitude =
    isFood && Number.isFinite(longitudeRaw) && Math.abs(longitudeRaw) <= 180
      ? longitudeRaw
      : null

  const cptOptType = isCptOpt
    ? isCptOptTypeId(body?.cptOptType)
      ? body!.cptOptType!
      : normalizeCptOptType(body?.cptOptType, body?.detail)
    : null
  const cptOptTimeline = isCptOpt
    ? normalizeCptOptTimeline(body?.cptOptTimeline)
    : []
  const cptOptTips = isCptOpt ? normalizeCptOptTips(body?.cptOptTips) : null

  const jobReviewType = isJobReview
    ? isJobReviewTypeId(body?.jobReviewType)
      ? body!.jobReviewType!
      : normalizeJobReviewType(body?.jobReviewType, body?.detail)
    : null
  const jobReviewTimeline = isJobReview
    ? normalizeJobReviewTimeline(body?.jobReviewTimeline)
    : []
  const jobReviewTips = isJobReview
    ? normalizeJobReviewTips(body?.jobReviewTips)
    : null
  const jobReviewIndustry = isJobReview
    ? String(body?.jobReviewIndustry || '').trim() || null
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
    if (!isFoodCategoryId(body?.foodCategory)) {
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

  const profile = await getSupabaseProfile(user.uid)
  const authorNickname = isAnonymous
    ? null
    : profile?.nickname?.trim() ||
      (typeof body?.authorNickname === 'string'
        ? body.authorNickname.trim()
        : '') ||
      null
  const authorPhotoURL = isAnonymous
    ? null
    : (typeof profile?.photoURL === 'string' && profile.photoURL.trim()) ||
      (typeof body?.authorPhotoURL === 'string' && body.authorPhotoURL.trim()) ||
      null

  const post: CommunityPost = {
    id,
    categoryId,
    title,
    contentHtml,
    description: htmlToPlainText(contentHtml).slice(0, 240),
    location: String(body?.location || '').trim() || (placeName ?? ''),
    detail: isCptOpt
      ? getCptOptTypeLabel(cptOptType)
      : isJobReview
        ? getJobReviewTypeLabel(jobReviewType)
        : String(body?.detail || '').trim(),
    authorUid: user.uid,
    authorEmail: user.email,
    authorNickname,
    authorPhotoURL,
    authorSchoolId: isAnonymous
      ? null
      : typeof body?.authorSchoolId === 'string'
        ? body.authorSchoolId
        : null,
    authorSchoolName: isAnonymous
      ? null
      : typeof body?.authorSchoolName === 'string'
        ? body.authorSchoolName
        : null,
    createdAt: now,
    updatedAt: now,
    status: 'open',
    viewCount: 0,
    recommendCount: 0,
    commentCount: 0,
    beenThereCount: 0,
    thumbnailUrl: isFood ? thumbnailUrl : null,
    partySize: isFood ? partySize : null,
    totalSpend: isFood ? totalSpend : null,
    waitMinutes: isFood ? waitMinutes : null,
    foodCategory: isFood ? body!.foodCategory! : null,
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
  }

  try {
    const saved = await saveStoredCommunityPost(post)
    return NextResponse.json({
      post: sanitizeAnonymousCommunityPost(saved, user.uid),
    })
  } catch (error) {
    console.error('Community create error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '게시글 저장에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
