import { NextResponse } from 'next/server'

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
  isJobReviewTypeId,
  normalizeJobReviewTimeline,
  normalizeJobReviewTips,
  normalizeJobReviewType,
} from '@lib/community/jobReview'
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  isAccountSuspended,
} from '@lib/community/schoolGate'
import { WRITE_GUIDELINES_VERSION } from '@lib/constants/communityGuidelines'
import { getClientIp } from '@lib/consent/requestMeta'
import {
  isCommunityStorageConfigured,
  saveStoredCommunityPost,
} from '@lib/supabase/community.server'
import { isNicknameTakenByOther } from '@lib/supabase/nicknameIndex.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
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
  if (!isCommunityStorageConfigured()) {
    return bad(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
      503,
    )
  }

  const body = (await request.json().catch(() => null)) as GuestCreateBody | null
  if (!body) return bad('요청 내용을 확인해 주세요.')
  if (String(body.website || '').trim()) {
    // 봇 허니팟 — 성공한 것처럼 응답만 하고 저장하지 않는다.
    return NextResponse.json({ ok: true })
  }

  const user = await resolveAuthenticatedUser()
  const profile = user?.uid ? await getSupabaseProfile(user.uid) : null
  if (user && isAccountSuspended(profile)) {
    return bad(ACCOUNT_SUSPENDED_MESSAGE, 403)
  }

  const guest = body.guest || {}
  const nickname = normalizeGuestNickname(
    guest.nickname || (user ? profile?.nickname || '' : ''),
  )
  if (!isValidGuestNickname(nickname)) {
    return bad(
      `게시용 닉네임을 ${GUEST_NICKNAME_MIN}~${GUEST_NICKNAME_MAX}자로 입력해 주세요. (이메일 형식 제외)`,
    )
  }
  try {
    if (await isNicknameTakenByOther(nickname, user?.uid)) {
      return bad('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.', 409)
    }
  } catch (error) {
    console.error('Guest nickname check error:', error)
    return bad('닉네임 확인에 실패했어요. 잠시 후 다시 시도해 주세요.', 500)
  }
  const email = normalizeGuestEmail(guest.email || user?.email || '')
  if (!isValidGuestEmail(email)) {
    return bad('기프트카드·크레딧 안내를 받을 이메일을 정확히 입력해 주세요.')
  }
  const linkedinUrl = normalizeLinkedinUrl(guest.linkedinUrl)
  if (!linkedinUrl) {
    return bad(
      'LinkedIn 프로필 주소를 입력해 주세요. 예: linkedin.com/in/your-name',
    )
  }
  if (guest.guidelinesAccepted !== true) {
    return bad('커뮤니티 작성 안내에 동의해 주세요.')
  }
  const coffeeChatOk = guest.coffeeChatOk === true

  const title = String(body.title || '').trim()
  const contentHtml = sanitizeCommunityHtml(String(body.contentHtml || '').trim())
  if (!title) return bad('제목을 입력해 주세요.')
  if (!contentHtml || contentHtml === '<p></p>') {
    return bad('조심해야 할 점을 입력해 주세요.')
  }
  const plain = htmlToPlainText(contentHtml)
  if (plain.length > COMMUNITY_BODY_MAX) {
    return bad(
      `조심해야 할 점은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요.`,
    )
  }

  const jobReviewType = isJobReviewTypeId(body.jobReviewType)
    ? body.jobReviewType
    : normalizeJobReviewType(body.jobReviewType, body.detail)
  if (!jobReviewType) {
    return bad('인턴 / 신입 / 경력 / 이직 / 계약 중 유형을 선택해 주세요.')
  }
  const jobReviewTimeline = normalizeJobReviewTimeline(body.jobReviewTimeline)
  if (jobReviewTimeline.length === 0) {
    return bad('채용 단계를 최소 1건 이상 입력해 주세요.')
  }
  const jobReviewTips = normalizeJobReviewTips(body.jobReviewTips) || null
  const jobReviewIndustry = String(body.jobReviewIndustry || '').trim() || null

  if (!user && isRateLimited(getClientIp(request))) {
    return bad('잠시 후 다시 시도해 주세요. (짧은 시간에 너무 많은 요청)', 429)
  }

  const now = Date.now()
  const id = `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const isMember = Boolean(user?.uid && user.email)

  const post: CommunityPost = {
    id,
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
    const saved = await saveStoredCommunityPost(post)

    const estimated = estimateTimelinePostCredit(jobReviewTimeline.length)
    let awarded = 0
    if (isMember) {
      try {
        const { awardPostCredit } = await import('@lib/community/creditLedger')
        const { getStoredCommunityCreditAccount } = await import(
          '@lib/supabase/communityCredit.server'
        )
        const before = await getStoredCommunityCreditAccount(user!.uid).catch(
          () => null,
        )
        const after = await awardPostCredit({
          uid: user!.uid,
          postId: saved.id,
          boardId: saved.categoryId,
          timelineCount: jobReviewTimeline.length,
        })
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
        firstPostBonus: firstPostBonusAmount(),
        /** 이번 요청에서 실제로 적립된 금액 (회원만) */
        awarded,
        linked: isMember,
      },
    })
  } catch (error) {
    console.error('Guest community create error:', error)
    return bad(
      error instanceof Error ? error.message : '게시글 저장에 실패했어요.',
      500,
    )
  }
}
