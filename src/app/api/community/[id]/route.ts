import { NextResponse } from 'next/server'
import { finalizePost, localizePost } from '@lib/translations/localize.server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getRequestT, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { applyReviewBodyAccess } from '@lib/community/reviewAccess'
import { getOfferVerifiedPostIds } from '@lib/supabase/reviewVerification.server'
import { resolveReviewCompanyId } from '@lib/supabase/companies.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'
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
  COMMUNITY_BODY_MAX,
  isFoodCategoryId,
  normalizeFoodGalleryPhotos,
  normalizeFoodMenuItems,
  normalizePartySize,
  normalizeTipIncluded,
  normalizeTotalSpend,
  normalizeWaitMinutes,
} from '@lib/community/food'
import { parseCityId } from '@lib/constants/cities'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import { BLOCKED_USER_CODE, getViewerBlockedUids } from '@lib/community/blocks.server'
import { CONTENT_BLOCKED_CODE, findBlockedContent } from '@lib/community/contentFilter'
import { CONTENT_HIDDEN_CODE, isModerationHidden, reportKey } from '@lib/community/moderation'
import { getViewerReportedKeys } from '@lib/community/reports.server'
import { isMisaengEmail } from '@lib/constants/nyc'
import {
  deleteStoredCommunityPost,
  getStoredCommunityPost,
  getStoredJobReviewSource,
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
  city?: string | null
}

async function withPrivateJobReviewSource<T extends object>(post: T, id: string) {
  const { source, orgId } = await getStoredJobReviewSource(id)
  return { ...post, jobReviewSource: source, jobReviewSourceOrgId: orgId }
}

export async function GET(request: Request, context: RouteContext) {
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
    const locale = await getRequestLocale(request)
    // 신고로 숨겨진 글(작성자·운영팀만 볼 수 있음)이나 내가 신고한 글
    const isAuthorViewer = Boolean(user?.uid && user.uid === post.authorUid)
    const hiddenForViewer =
      (isModerationHidden(post) && !isAuthorViewer && !isMisaengEmail(user?.email)) ||
      (!isAuthorViewer && (await getViewerReportedKeys(user?.uid)).has(reportKey('post', post.id)))
    if (hiddenForViewer) {
      const t = await getT(locale, 'api')
      return NextResponse.json(
        { error: t('community.moderation.hidden'), code: CONTENT_HIDDEN_CODE, hidden: true },
        { status: 404 },
      )
    }
    // 차단한 사용자의 글: 내용 대신 "차단한 사용자의 글이에요"를 보여 주도록 코드만 내려준다
    if (user?.uid && post.authorUid && post.authorUid !== user.uid) {
      const blocked = await getViewerBlockedUids(user.uid)
      if (blocked.has(post.authorUid)) {
        const t = await getT(locale, 'api')
        return NextResponse.json(
          { error: t('community.blocks.blockedPost'), code: BLOCKED_USER_CODE, blocked: true },
          { status: 403 },
        )
      }
    }
    const visible = finalizePost(
      applyReviewBodyAccess(
        sanitizeAnonymousCommunityPost(localizePost(post, locale, { viewerUid: user?.uid }), user?.uid),
        user,
      ),
    )
    // 연락 경로는 비공개 — 수정 화면을 위해 작성자 본인에게만 내려준다.
    const isAuthor = Boolean(user?.uid && user.uid === post.authorUid)
    if (post.categoryId !== 'job-review') return NextResponse.json({ post: visible })
    // "합격 인증": the author's approved offer verification for this post (checked on the stored authorUid)
    const [withSource, offerVerified] = await Promise.all([
      isAuthor ? withPrivateJobReviewSource(visible, id) : visible,
      getOfferVerifiedPostIds([post]).then((ids) => ids.has(post.id)),
    ])
    return NextResponse.json({ post: { ...withSource, offerVerified } })
  } catch (error) {
    console.error('Community get error:', error)
    return NextResponse.json({ error: 'Failed to load post.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
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
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended

  const { id } = await context.params
  const existing = await getStoredCommunityPost(id)
  if (!existing) {
    return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
  }
  if (existing.authorUid !== user.uid) {
    return NextResponse.json({ error: t('common.forbidden') }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as UpdateBody | null
  if (!body) {
    return NextResponse.json({ error: t('common.badRequest') }, { status: 400 })
  }

  // 내용 수정
  const title = String(body.title ?? existing.title).trim()
  const contentHtml = sanitizeCommunityHtml(
    String(body.contentHtml ?? existing.contentHtml).trim(),
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
      body.location,
      body.detail,
      body.placeName,
      body.menuItems,
      body.galleryPhotos,
      body.cptOptTimeline,
      body.cptOptTips,
      body.jobReviewTimeline,
      body.jobReviewTips,
    )
  ) {
    return NextResponse.json(
      { error: t('community.contentBlocked'), code: CONTENT_BLOCKED_CODE },
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
  const tipIncluded = isFood
    ? normalizeTipIncluded(
        body.tipIncluded !== undefined
          ? body.tipIncluded
          : existing.tipIncluded,
      )
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
  const jobReviewSource = isJobReview
    ? parseJobReviewSourceInput(body.jobReviewSource, body.jobReviewSourceOrgId)
    : null
  const jobReviewOutcome =
    isJobReview && isJobReviewOutcomeId(body.jobReviewOutcome)
      ? body.jobReviewOutcome
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
  const roommateMoveOutDate = isRoommate
    ? normalizeRoommateMoveOutDate(
        body.roommateMoveOutDate ?? existing.roommateMoveOutDate,
        roommateMoveInDate,
      )
    : null

  if (isRoommate && !roommateLookingFor) {
    return NextResponse.json(
      { error: t('community.write.roommateTypeRequired') },
      { status: 400 },
    )
  }

  if (isRoommate) {
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
    const locationValue = String(
      body.location ?? existing.location ?? '',
    ).trim()
    if (formConfig?.locationRequired && !locationValue) {
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
      (body.roommateMoveOutDate ?? existing.roommateMoveOutDate) &&
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
    if (!foodCategory) {
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

  const companyResult = isJobReview
    ? await resolveReviewCompanyId(body.companyId)
    : ({ ok: true, companyId: undefined } as const)
  if (!companyResult.ok) {
    return NextResponse.json({ error: t(companyResult.errorKey) }, { status: 400 })
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
    tipIncluded: isFood ? tipIncluded : null,
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
    jobReviewOutcome: isJobReview ? jobReviewOutcome : null,
    companyId: isJobReview
      ? companyResult.companyId === undefined
        ? (existing.companyId ?? null)
        : companyResult.companyId
      : (existing.companyId ?? null),
    roommateLookingFor: isRoommate ? roommateLookingFor : null,
    roommateBudgetMax: isRoommate ? roommateBudgetMax : null,
    roommateMoveInDate: isRoommate ? roommateMoveInDate : null,
    roommateMoveOutDate: isRoommate ? roommateMoveOutDate : null,
    city: isCptOpt
      ? parseCityId(body.city) ?? existing.city
      : existing.city,
  }

  try {
    const saved = await saveStoredCommunityPost(
      next,
      jobReviewSource
        ? {
            jobReviewSource: jobReviewSource.source,
            jobReviewSourceOrgId: jobReviewSource.orgId,
          }
        : undefined,
    )
    try {
      // 포인트: 전환 전 = 기존 크레딧 타임라인 추가 적립, 후 = 대기 중인 claim 갱신 (src/lib/points/WIRING.md)
      const { onPostUpdated } = await import('@lib/points/facade.server')
      await onPostUpdated({ uid: user.uid, post: saved })
    } catch (creditError) {
      console.error('Community credit award (post update) error:', creditError)
    }
    return NextResponse.json({
      post: sanitizeAnonymousCommunityPost(saved, user.uid),
    })
  } catch (error) {
    console.error('Community update error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'community.updateFailed'),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
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
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended

  const { id } = await context.params
  const existing = await getStoredCommunityPost(id)
  if (!existing) {
    return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
  }
  if (existing.authorUid !== user.uid) {
    return NextResponse.json({ error: t('common.forbidden') }, { status: 403 })
  }

  try {
    const ok = await deleteStoredCommunityPost(id)
    if (!ok) {
      return NextResponse.json({ error: t('community.deleteFailed') }, { status: 500 })
    }
    try {
      const { onPostDeleted } = await import('@lib/points/facade.server')
      await onPostDeleted({ uid: user.uid, postId: id })
    } catch (creditError) {
      console.error('Community credit revoke (post) error:', creditError)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Community delete error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'community.deleteFailed'),
      },
      { status: 500 },
    )
  }
}
