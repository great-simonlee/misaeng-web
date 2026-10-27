import { NextResponse } from 'next/server'
import { finalizePost, localizePosts } from '@lib/translations/localize.server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getRequestT, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'
import { applyReviewBodyAccess } from '@lib/community/reviewAccess'
import { resolveReviewCompanyId } from '@lib/supabase/companies.server'
import { getOfferVerifiedPostIds } from '@lib/supabase/reviewVerification.server'
import {
  normalizeCptOptTimeline,
  normalizeCptOptTips,
  normalizeCptOptType,
  getCptOptTypeLabel,
  isCptOptTypeId,
} from '@lib/community/cptOpt'
import {
  getJobReviewTypeLabel,
  isJobReviewOutcomeId,
  parseJobReviewSourceInput,
  isJobReviewTypeId,
  normalizeJobReviewTimeline,
  normalizeJobReviewTips,
  normalizeJobReviewType,
} from '@lib/community/jobReview'
import {
  getRoommateFormConfig,
  getRoommateLookingForLabel,
  isRoommateLookingFor,
  normalizeRoommateBudgetMax,
  normalizeRoommateLookingFor,
  normalizeRoommateMoveInDate,
  normalizeRoommateMoveOutDate,
  ROOMMATE_TITLE_MAX,
} from '@lib/community/roommate'
import {
  isSharedCommunityBoard,
  parseCityId,
  resolveCityId,
} from '@lib/constants/cities'
import {
  isAnonymousBoard,
  isCommunityBoardId,
  isStatusCommunityBoard,
} from '@lib/constants/nyc'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import { getViewerBlockedUids, withoutBlockedAuthors } from '@lib/community/blocks.server'
import { CONTENT_BLOCKED_CODE, findBlockedContent } from '@lib/community/contentFilter'
import { withoutModeratedPosts } from '@lib/community/moderation'
import { getViewerReportedKeys } from '@lib/community/reports.server'
import {
  isIdentityVerified,
  SCHOOL_VERIFY_REQUIRED_CODE,
} from '@lib/community/schoolGate'
import {
  COMMUNITY_BODY_MAX,
  isFoodCategoryId,
  normalizeFoodGalleryPhotos,
  normalizeFoodMenuItems,
  normalizePartySize,
  normalizeTipIncluded,
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
  RoommateLookingFor,
} from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** postId → boostedUntil (ISO) of running roommate boosts. Before cutover there are none: no query at all. */
async function loadRoommateBoosts(): Promise<Map<string, string> | null> {
  try {
    const { isPointsLedgerActive } = await import('@lib/points/facade.server')
    if (!(await isPointsLedgerActive())) return null
    const { getActiveBoosts } = await import('@lib/points/boost.server')
    return await getActiveBoosts()
  } catch (error) {
    console.error('Roommate boost load error:', error)
    return null
  }
}

export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get('mine') === '1'
    const board = searchParams.get('board')?.trim() || undefined
    if (board && !isCommunityBoardId(board)) {
      return NextResponse.json({ error: t('community.invalidBoard') }, { status: 400 })
    }

    if (mine) {
      if (!isCommunityStorageConfigured()) {
        return NextResponse.json(
          { error: t('common.supabaseNotConfigured') },
          { status: 503 },
        )
      }
      const user = await resolveAuthenticatedUser()
      if (!user?.uid) {
        return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
      }
      // 같은 이메일로 가입 없이 남긴 후기가 있으면 내 글로 연결 (크레딧 적립 포함)
      if (user.email) {
        try {
          const { claimGuestPostsForAccount } = await import(
            '@lib/community/guestLink.server'
          )
          await claimGuestPostsForAccount({ uid: user.uid, email: user.email })
        } catch (claimError) {
          console.error('Guest post auto-claim error:', claimError)
        }
      }
      const locale = await getRequestLocale(request)
      const posts = localizePosts(await listStoredCommunityPostsByAuthor(user.uid), locale, {
        hidePending: false,
      })
      return NextResponse.json({
        posts: posts.map((item) =>
          finalizePost(
            applyReviewBodyAccess(sanitizeAnonymousCommunityPost(item, user.uid), user),
          ),
        ),
      })
    }

    const user = await resolveAuthenticatedUser()
    const city = resolveCityId(searchParams.get('city'))
    const locale = await getRequestLocale(request)
    // 차단한 작성자는 캐시된 목록을 꺼낸 뒤 보는 사람마다 거른다 (익명 정리 전에)
    const [stored, blocked, reported] = await Promise.all([
      listStoredCommunityPosts(board, city),
      getViewerBlockedUids(user?.uid),
      getViewerReportedKeys(user?.uid),
    ])
    // 숨김 글은 목록 캐시에서 이미 빠진다. 내가 신고한 글은 보는 사람마다 뺀다 (차단과 같은 방식)
    const visible = withoutModeratedPosts(withoutBlockedAuthors(stored, blocked), reported)
    // 룸메이트 게시판: 포인트로 부스트한 글을 위로 (부스트는 전환 후에만 생긴다, WIRING.md 5)
    const boosts = board === 'roommate' ? await loadRoommateBoosts() : null
    const ordered =
      boosts && boosts.size > 0
        ? [...visible].sort((a, b) => {
            const ua = boosts.get(a.id) ?? ''
            const ub = boosts.get(b.id) ?? ''
            if (ua === ub) return 0
            return ua < ub ? 1 : -1
          })
        : visible
    // 면접·취업 후기: 작성자가 그 글로 합격 인증을 받았는지 (authorUid는 익명 정리 전 원본으로 확인)
    const offerVerified =
      board === 'job-review' ? await getOfferVerifiedPostIds(ordered) : null
    const posts = localizePosts(ordered, locale)
    return NextResponse.json({
      posts: posts.map((item) => {
        const finalized = finalizePost(
          applyReviewBodyAccess(sanitizeAnonymousCommunityPost(item, user?.uid), user),
        )
        const boostedUntil = boosts?.get(item.id)
        const withBoost = boostedUntil ? { ...finalized, boostedUntil } : finalized
        return offerVerified ? { ...withBoost, offerVerified: offerVerified.has(item.id) } : withBoost
      }),
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
  city?: string | null
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
  tipIncluded?: boolean | null
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
  jobReviewSource?: string | null
  jobReviewSourceOrgId?: string | null
  jobReviewOutcome?: string | null
  companyId?: string | null
  roommateLookingFor?: RoommateLookingFor | null
  roommateBudgetMax?: number | null
  roommateMoveInDate?: string | null
  roommateMoveOutDate?: string | null
}

export async function POST(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  if (!isCommunityStorageConfigured()) {
    return NextResponse.json(
      {
        error: t('common.supabaseNotConfiguredDetail'),
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid || !user.email) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }

  const profile = await getSupabaseProfile(user.uid)
  if (profile?.status === 'suspended') {
    return NextResponse.json(
      { error: t('common.accountSuspended') },
      { status: 403 },
    )
  }
  if (!isIdentityVerified(profile)) {
    return NextResponse.json(
      {
        error: t('common.identityVerificationRequired'),
        code: SCHOOL_VERIFY_REQUIRED_CODE,
      },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => null)) as CreateBody | null
  const categoryId = String(body?.categoryId || '').trim()
  if (!isCommunityBoardId(categoryId)) {
    return NextResponse.json({ error: t('community.invalidBoard') }, { status: 400 })
  }

  const title = String(body?.title || '').trim()
  const contentHtml = sanitizeCommunityHtml(
    String(body?.contentHtml || '').trim(),
  )
  if (!title || !contentHtml || contentHtml === '<p></p>') {
    return NextResponse.json(
      { error: t('community.write.titleBodyRequired') },
      { status: 400 },
    )
  }
  const plainLength = htmlToPlainText(contentHtml).length
  if (plainLength > COMMUNITY_BODY_MAX) {
    return NextResponse.json(
      {
        error: t('community.write.bodyTooLong', {
          max: formatNumber(locale, COMMUNITY_BODY_MAX),
        }),
      },
      { status: 400 },
    )
  }
  // 욕설·혐오·성희롱 표현 (src/lib/community/contentFilter.ts)
  if (
    findBlockedContent(
      title,
      htmlToPlainText(contentHtml),
      body?.location,
      body?.detail,
      body?.placeName,
      body?.menuItems,
      body?.galleryPhotos,
      body?.cptOptTimeline,
      body?.cptOptTips,
      body?.jobReviewTimeline,
      body?.jobReviewTips,
    )
  ) {
    return NextResponse.json(
      { error: t('community.contentBlocked'), code: CONTENT_BLOCKED_CODE },
      { status: 400 },
    )
  }

  const now = Date.now()
  const id = `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const isFood = categoryId === 'food'
  const isCptOpt = categoryId === 'status' || categoryId === 'cpt-opt'
  const isJobReview = categoryId === 'job-review'
  const isRoommate = categoryId === 'roommate'
  const isAnonymous = isAnonymousBoard(categoryId)
  const menuItems = isFood ? normalizeFoodMenuItems(body?.menuItems) : []
  const galleryPhotos =
    isFood || isRoommate
      ? normalizeFoodGalleryPhotos(body?.galleryPhotos)
      : []
  const partySize = isFood ? normalizePartySize(body?.partySize) : null
  const totalSpend = isFood ? normalizeTotalSpend(body?.totalSpend) : null
  const tipIncluded = isFood ? normalizeTipIncluded(body?.tipIncluded) : null
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
  const jobReviewSource = isJobReview
    ? parseJobReviewSourceInput(body?.jobReviewSource, body?.jobReviewSourceOrgId)
    : null
  const jobReviewOutcome =
    isJobReview && isJobReviewOutcomeId(body?.jobReviewOutcome)
      ? body!.jobReviewOutcome
      : null

  const roommateLookingFor = isRoommate
    ? isRoommateLookingFor(body?.roommateLookingFor)
      ? body!.roommateLookingFor!
      : normalizeRoommateLookingFor(body?.roommateLookingFor, body?.detail)
    : null
  const roommateBudgetMax = isRoommate
    ? normalizeRoommateBudgetMax(body?.roommateBudgetMax ?? body?.detail)
    : null
  const roommateMoveInDate = isRoommate
    ? normalizeRoommateMoveInDate(body?.roommateMoveInDate)
    : null
  const roommateMoveOutDate = isRoommate
    ? normalizeRoommateMoveOutDate(
        body?.roommateMoveOutDate,
        roommateMoveInDate,
      )
    : null

  if (isRoommate) {
    const mine = await listStoredCommunityPostsByAuthor(user.uid)
    const existing = mine.find(
      (item) => item.categoryId === 'roommate' && item.status === 'open',
    )
    if (existing) {
      return NextResponse.json(
        {
          error: t('community.write.roommateOnePerAccount'),
          existingPostId: existing.id,
        },
        { status: 409 },
      )
    }
    if (!roommateLookingFor) {
      return NextResponse.json(
        { error: t('community.write.roommateTypeRequired') },
        { status: 400 },
      )
    }
    if (title.length > ROOMMATE_TITLE_MAX) {
      return NextResponse.json(
        {
          error: t('community.write.roommateTitleTooLong', {
            max: formatNumber(locale, ROOMMATE_TITLE_MAX),
          }),
        },
        { status: 400 },
      )
    }
    const formConfig = getRoommateFormConfig(roommateLookingFor)
    if (formConfig?.locationRequired && !String(body?.location || '').trim()) {
      return NextResponse.json(
        { error: t(`community.roommate.required.${roommateLookingFor}.location`) },
        { status: 400 },
      )
    }
    if (formConfig?.budgetRequired && roommateBudgetMax == null) {
      return NextResponse.json(
        { error: t(`community.roommate.required.${roommateLookingFor}.budget`) },
        { status: 400 },
      )
    }
    if (formConfig?.moveInStartRequired && !roommateMoveInDate) {
      return NextResponse.json(
        { error: t(`community.roommate.required.${roommateLookingFor}.moveInStart`) },
        { status: 400 },
      )
    }
    if (formConfig?.moveInEndRequired && !roommateMoveOutDate) {
      return NextResponse.json(
        { error: t(`community.roommate.required.${roommateLookingFor}.moveInEnd`) },
        { status: 400 },
      )
    }
    if (
      body?.roommateMoveOutDate &&
      roommateMoveInDate &&
      !roommateMoveOutDate
    ) {
      return NextResponse.json(
        { error: t('community.write.endDateAfterStart') },
        { status: 400 },
      )
    }
  }

  if (isFood) {
    if (partySize == null) {
      return NextResponse.json(
        { error: t('community.write.partySizeRequired') },
        { status: 400 },
      )
    }
    if (totalSpend == null) {
      return NextResponse.json(
        { error: t('community.write.totalSpendRequired') },
        { status: 400 },
      )
    }
    if (tipIncluded == null) {
      return NextResponse.json(
        { error: t('community.write.tipIncludedRequired') },
        { status: 400 },
      )
    }
    if (waitMinutes == null) {
      return NextResponse.json(
        { error: t('community.write.waitMinutesRequired') },
        { status: 400 },
      )
    }
    if (!isFoodCategoryId(body?.foodCategory)) {
      return NextResponse.json(
        { error: t('community.write.foodCategoryRequired') },
        { status: 400 },
      )
    }
    if (latitude == null || longitude == null || !placeName) {
      return NextResponse.json(
        { error: t('community.write.placeRequired') },
        { status: 400 },
      )
    }
  }

  if (isCptOpt) {
    if (!cptOptType) {
      return NextResponse.json(
        { error: t('community.write.cptOptTypeRequired') },
        { status: 400 },
      )
    }
    if (cptOptTimeline.length === 0) {
      return NextResponse.json(
        { error: t('community.write.cptOptTimelineRequired') },
        { status: 400 },
      )
    }
  }

  if (isJobReview) {
    if (!jobReviewType) {
      return NextResponse.json(
        { error: t('community.write.jobReviewTypeRequired') },
        { status: 400 },
      )
    }
    if (jobReviewTimeline.length === 0) {
      return NextResponse.json(
        { error: t('community.write.jobReviewTimelineRequired') },
        { status: 400 },
      )
    }
    if (!jobReviewSource) {
      return NextResponse.json(
        { error: t('community.write.jobReviewSourceRequired') },
        { status: 400 },
      )
    }
    if (!jobReviewOutcome) {
      return NextResponse.json({ error: t('community.write.jobReviewOutcomeRequired') }, { status: 400 })
    }
  }

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
  const authorSchoolId = isAnonymous
    ? null
    : (typeof profile?.verifiedSchoolId === 'string' &&
        profile.verifiedSchoolId.trim()) ||
      null
  const authorSchoolName = isAnonymous
    ? null
    : (typeof profile?.verifiedSchoolName === 'string' &&
        profile.verifiedSchoolName.trim()) ||
      null

  const city = isStatusCommunityBoard(categoryId)
    ? parseCityId(body?.city)
    : isSharedCommunityBoard(categoryId)
      ? null
      : parseCityId(body?.city)
  if (
    (!isSharedCommunityBoard(categoryId) ||
      isStatusCommunityBoard(categoryId)) &&
    !city
  ) {
    return NextResponse.json(
      { error: t('community.write.cityRequired') },
      { status: 400 },
    )
  }

  const companyResult = isJobReview
    ? await resolveReviewCompanyId(body?.companyId)
    : ({ ok: true, companyId: null } as const)
  if (!companyResult.ok) {
    return NextResponse.json({ error: t(companyResult.errorKey) }, { status: 400 })
  }

  const post: CommunityPost = {
    id,
    // 작성 화면 언어 = 원문 언어 (번역이 다르면 ERP 번역 단계에서 바로잡는다)
    sourceLocale: locale,
    categoryId,
    city,
    title,
    contentHtml,
    description: htmlToPlainText(contentHtml).slice(0, 240),
    location: String(body?.location || '').trim() || (placeName ?? ''),
    detail: isCptOpt
      ? getCptOptTypeLabel(cptOptType)
      : isJobReview
        ? getJobReviewTypeLabel(jobReviewType)
        : isRoommate
          ? getRoommateLookingForLabel(roommateLookingFor)
          : String(body?.detail || '').trim(),
    authorUid: user.uid,
    authorEmail: user.email,
    authorNickname,
    authorPhotoURL,
    authorSchoolId,
    authorSchoolName,
    createdAt: now,
    updatedAt: now,
    status: 'open',
    viewCount: 0,
    recommendCount: 0,
    commentCount: 0,
    beenThereCount: 0,
    thumbnailUrl: isFood || isRoommate ? thumbnailUrl : null,
    partySize: isFood ? partySize : null,
    totalSpend: isFood ? totalSpend : null,
    tipIncluded: isFood ? tipIncluded : null,
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
    jobReviewOutcome,
    companyId: isJobReview ? (companyResult.companyId ?? null) : null,
    roommateLookingFor: isRoommate ? roommateLookingFor : null,
    roommateBudgetMax: isRoommate ? roommateBudgetMax : null,
    roommateMoveInDate: isRoommate ? roommateMoveInDate : null,
    roommateMoveOutDate: isRoommate ? roommateMoveOutDate : null,
    guestAuthor: null,
  }

  try {
    const saved = await saveStoredCommunityPost(
      post,
      jobReviewSource
        ? {
            jobReviewSource: jobReviewSource.source,
            jobReviewSourceOrgId: jobReviewSource.orgId,
          }
        : undefined,
    )
    try {
      // 포인트: 전환(cutover) 전에는 기존 크레딧 적립, 후에는 검수 대기 claim (src/lib/points/WIRING.md)
      const { onPostCreated } = await import('@lib/points/facade.server')
      await onPostCreated({ uid: user.uid, post: saved })
    } catch (creditError) {
      console.error('Community credit award (post) error:', creditError)
    }
    return NextResponse.json({
      post: sanitizeAnonymousCommunityPost(saved, user.uid),
    })
  } catch (error) {
    console.error('Community create error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'community.saveFailed'),
      },
      { status: 500 },
    )
  }
}
