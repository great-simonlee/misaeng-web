import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import {
  GUEST_NICKNAME_MAX,
  GUEST_NICKNAME_MIN,
  isValidGuestEmail,
  isValidGuestNickname,
  normalizeGuestEmail,
  normalizeGuestNickname,
  normalizeLinkedinUrl,
} from '@lib/community/guest'
import {
  estimateTimelinePostCredit,
  firstPostBonusAmount,
} from '@lib/community/guestLink.server'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import {
  getJobReviewTypeLabel,
  isJobReviewOutcomeId,
  parseJobReviewSourceInput,
  isJobReviewTypeId,
  normalizeJobReviewTimeline,
  normalizeJobReviewTips,
  normalizeJobReviewType,
} from '@lib/community/jobReview'
import { isAccountSuspended } from '@lib/community/schoolGate'
import { WRITE_GUIDELINES_VERSION } from '@lib/constants/communityGuidelines'
import { getClientIp } from '@lib/consent/requestMeta'
import {
  isCommunityStorageConfigured,
  saveStoredCommunityPost,
} from '@lib/supabase/community.server'
import { isNicknameTakenByOther } from '@lib/supabase/nicknameIndex.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { resolveReviewCompanyId } from '@lib/supabase/companies.server'
import type {
  CommunityPost,
  JobReviewTimelineEntry,
  JobReviewTypeId,
} from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 가입 없이 남기는 면접·취업 후기.
 * - 로그인 없이 호출 가능 (학교·직장 인증 게이트 없음)
 * - 로그인 상태면 그 계정에 바로 연결 + 크레딧 적립
 * - 비로그인은 guestAuthor에 연락처를 보관하고, 가입 시 이메일로 연결
 */

type GuestCreateBody = {
  city?: string | null
  title?: string
  contentHtml?: string
  location?: string
  detail?: string
  jobReviewType?: JobReviewTypeId | null
  jobReviewTimeline?: JobReviewTimelineEntry[] | null
  jobReviewTips?: string | null
  jobReviewIndustry?: string | null
  jobReviewSource?: string | null
  jobReviewSourceOrgId?: string | null
  jobReviewOutcome?: string | null
  companyId?: string | null
  guest?: {
    nickname?: string
    email?: string
    linkedinUrl?: string
    coffeeChatOk?: boolean
    guidelinesAccepted?: boolean
  } | null
  /** 허니팟 — 사람은 채우지 않는다 */
  website?: string
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_PER_IP = 5
const recentByIp = new Map<string, number[]>()

function isRateLimited(ip: string | null) {
  if (!ip) return false
  const now = Date.now()
  const recent = (recentByIp.get(ip) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  )
  if (recent.length >= RATE_LIMIT_MAX_PER_IP) {
    recentByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  recentByIp.set(ip, recent)
  return false
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

export async function POST(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  if (!isCommunityStorageConfigured()) {
    return bad(t('common.supabaseNotConfiguredDetail'), 503)
  }

  const body = (await request.json().catch(() => null)) as GuestCreateBody | null
  if (!body) return bad(t('guest.invalidRequest'))
  if (String(body.website || '').trim()) {
    // 봇 허니팟 — 성공한 것처럼 응답만 하고 저장하지 않는다.
    return NextResponse.json({ ok: true })
  }

  const user = await resolveAuthenticatedUser()
  const profile = user?.uid ? await getSupabaseProfile(user.uid) : null
  if (user && isAccountSuspended(profile)) {
    return bad(t('common.accountSuspended'), 403)
  }

  const guest = body.guest || {}
  const nickname = normalizeGuestNickname(
    guest.nickname || (user ? profile?.nickname || '' : ''),
  )
  if (!isValidGuestNickname(nickname)) {
    return bad(
      t('guest.nicknameInvalid', {
        min: formatNumber(locale, GUEST_NICKNAME_MIN),
        max: formatNumber(locale, GUEST_NICKNAME_MAX),
      }),
    )
  }
  try {
    if (await isNicknameTakenByOther(nickname, user?.uid)) {
      return bad(t('profile.nicknameTaken'), 409)
    }
  } catch (error) {
    console.error('Guest nickname check error:', error)
    return bad(t('profile.nicknameCheckFailedRetry'), 500)
  }
  const email = normalizeGuestEmail(guest.email || user?.email || '')
  if (!isValidGuestEmail(email)) {
    return bad(t('guest.emailInvalid'))
  }
  const linkedinUrl = normalizeLinkedinUrl(guest.linkedinUrl)
  if (!linkedinUrl) {
    return bad(t('guest.linkedinRequired'))
  }
  if (guest.guidelinesAccepted !== true) {
    return bad(t('guest.guidelinesRequired'))
  }
  const coffeeChatOk = guest.coffeeChatOk === true

  const title = String(body.title || '').trim()
  const contentHtml = sanitizeCommunityHtml(String(body.contentHtml || '').trim())
  if (!title) return bad(t('guest.titleRequired'))
  if (!contentHtml || contentHtml === '<p></p>') {
    return bad(t('guest.bodyRequired'))
  }
  const plain = htmlToPlainText(contentHtml)
  if (plain.length > COMMUNITY_BODY_MAX) {
    return bad(
      t('guest.bodyTooLong', { max: formatNumber(locale, COMMUNITY_BODY_MAX) }),
    )
  }

  const jobReviewType = isJobReviewTypeId(body.jobReviewType)
    ? body.jobReviewType
    : normalizeJobReviewType(body.jobReviewType, body.detail)
  if (!jobReviewType) {
    return bad(t('guest.jobReviewTypeRequired'))
  }
  const jobReviewTimeline = normalizeJobReviewTimeline(body.jobReviewTimeline)
  if (jobReviewTimeline.length === 0) {
    return bad(t('community.write.jobReviewTimelineRequired'))
  }
  const jobReviewTips = normalizeJobReviewTips(body.jobReviewTips) || null
  const jobReviewIndustry = String(body.jobReviewIndustry || '').trim() || null
  const jobReviewSource = parseJobReviewSourceInput(
    body.jobReviewSource,
    body.jobReviewSourceOrgId,
  )
  if (!jobReviewSource) {
    return bad(t('community.write.jobReviewSourceRequired'))
  }
  const jobReviewOutcome = isJobReviewOutcomeId(body.jobReviewOutcome)
    ? body.jobReviewOutcome
    : null
  if (!jobReviewOutcome) {
    return bad(t('community.write.jobReviewOutcomeRequired'))
  }
  const companyResult = await resolveReviewCompanyId(body.companyId)
  if (!companyResult.ok) {
    return NextResponse.json({ error: t(companyResult.errorKey) }, { status: 400 })
  }

  if (!user && isRateLimited(getClientIp(request))) {
    return bad(t('guest.rateLimited'), 429)
  }

  const now = Date.now()
  const id = `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const isMember = Boolean(user?.uid && user.email)

  const post: CommunityPost = {
    id,
    // 작성 화면 언어 = 원문 언어 (번역이 다르면 ERP 번역 단계에서 바로잡는다)
    sourceLocale: locale,
    categoryId: 'job-review',
    city: null,
    title,
    contentHtml,
    description: plain.slice(0, 240),
    location: String(body.location || '').trim(),
    detail: getJobReviewTypeLabel(jobReviewType),
    authorUid: isMember ? user!.uid : '',
    // 게스트 이메일은 guestAuthor에만 두고 공개 필드에는 넣지 않는다.
    authorEmail: isMember ? user!.email : '',
    authorNickname: nickname,
    authorPhotoURL:
      isMember && typeof profile?.photoURL === 'string' && profile.photoURL.trim()
        ? profile.photoURL.trim()
        : null,
    authorSchoolId:
      isMember && typeof profile?.verifiedSchoolId === 'string'
        ? profile.verifiedSchoolId.trim() || null
        : null,
    authorSchoolName:
      isMember && typeof profile?.verifiedSchoolName === 'string'
        ? profile.verifiedSchoolName.trim() || null
        : null,
    createdAt: now,
    updatedAt: now,
    status: 'open',
    viewCount: 0,
    recommendCount: 0,
    commentCount: 0,
    beenThereCount: 0,
    thumbnailUrl: null,
    partySize: null,
    totalSpend: null,
    tipIncluded: null,
    waitMinutes: null,
    foodCategory: null,
    menuItems: [],
    galleryPhotos: [],
    placeId: null,
    placeName: null,
    latitude: null,
    longitude: null,
    cptOptType: null,
    cptOptTimeline: [],
    cptOptTips: null,
    jobReviewType,
    jobReviewTimeline,
    jobReviewTips,
    jobReviewIndustry,
    jobReviewOutcome,
    companyId: companyResult.companyId ?? null,
    roommateLookingFor: null,
    roommateBudgetMax: null,
    roommateMoveInDate: null,
    roommateMoveOutDate: null,
    guestAuthor: {
      nickname,
      email,
      linkedinUrl,
      coffeeChatOk,
      guidelinesVersion: WRITE_GUIDELINES_VERSION,
      linkedUid: isMember ? user!.uid : null,
      linkedAt: isMember ? now : null,
      linkedBy: isMember ? 'self' : null,
      linkedByEmail: null,
    },
  }

  try {
    const saved = await saveStoredCommunityPost(post, {
      jobReviewSource: jobReviewSource.source,
      jobReviewSourceOrgId: jobReviewSource.orgId,
    })

    // 포인트 전환(cutover) 후에는 즉시 적립이 없고 운영팀 검수 뒤 지급된다 (src/lib/points/WIRING.md)
    const { isPointsLedgerActive, onPostCreated } = await import('@lib/points/facade.server')
    const pendingReview = await isPointsLedgerActive().catch(() => false)
    const estimated = pendingReview ? 0 : estimateTimelinePostCredit(jobReviewTimeline.length)
    let awarded = 0
    if (isMember) {
      try {
        const { getStoredCommunityCreditAccount } = await import(
          '@lib/supabase/communityCredit.server'
        )
        const before = pendingReview
          ? null
          : await getStoredCommunityCreditAccount(user!.uid).catch(() => null)
        const result = await onPostCreated({ uid: user!.uid, post: saved })
        const after = result.ok && result.engine === 'legacy' ? result.result : null
        if (after && before) awarded = Math.max(0, after.balance - before.balance)
      } catch (creditError) {
        console.error('Guest job-review credit award error:', creditError)
      }
    }

    return NextResponse.json({
      post: sanitizeAnonymousCommunityPost(saved, user?.uid),
      credit: {
        /** 타임라인 단계 기준 자동 적립액 */
        estimated,
        /** 첫 글 보너스 (가입 후 첫 글이면 추가) */
        firstPostBonus: pendingReview ? 0 : firstPostBonusAmount(),
        /** 이번 요청에서 실제로 적립된 금액 (회원만) */
        awarded,
        linked: isMember,
        /** 포인트 전환 후: 검수 뒤 지급 (전환 전 응답에는 이 필드가 없다) */
        ...(pendingReview ? { pendingReview: true } : {}),
      },
    })
  } catch (error) {
    console.error('Guest community create error:', error)
    return bad(apiErrorMessage(t, error, 'community.saveFailed'), 500)
  }
}
