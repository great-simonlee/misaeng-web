import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { BRAND_CONFIG } from '@lib/brand'
import { parseContactSourceInput } from '@lib/community/contactSources'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText, sanitizeCommunityHtml } from '@lib/community/html'
import {
  getJobReviewTypeLabel,
  isJobReviewOutcomeId,
  isJobReviewTypeId,
  normalizeJobReviewTimeline,
  normalizeJobReviewTips,
} from '@lib/community/jobReview'
import {
  isProxyNicknameLanguage,
  randomProxyNickname,
  type ProxyNicknameLanguage,
} from '@lib/community/proxyAuthor'
import { isValidNickname } from '@lib/constants/profile'
import { parseLocale } from '@lib/i18n/locales'
import { resolveReviewCompanyId } from '@lib/supabase/companies.server'
import { saveStoredCommunityPost } from '@lib/supabase/community.server'
import { getContactSourceConfig } from '@lib/supabase/contactSources.server'
import { claimNickname, isNicknameTakenByOther, NicknameTakenError } from '@lib/supabase/nicknameIndex.server'
import type { CommunityPost } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Job reviews the team posts on someone's behalf (ellieo-erp "Add job review"), e.g. reviews collected from
 * Chinese students and translated. Header `x-internal-secret` (INTERNAL_POINTS_SECRET or INTERNAL_PUSH_SECRET,
 * like /api/internal/push). The author has no account: no claim by email, no coffee chat, no career questions.
 * GET ?language=ko|en → { nickname }: a random nickname nobody uses yet.
 * POST { nickname, sourceLocale, title, contentHtml, location, jobReviewIndustry?, jobReviewType,
 *        jobReviewTimeline, jobReviewTips?, jobReviewOutcome, companyId?, jobReviewSource, jobReviewSourceOrgId?,
 *        addedBy } → 201 { post }. The nickname is reserved for this post only (409 when taken).
 */
function authorized(request: Request) {
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  if (!given) return false
  return [process.env.INTERNAL_PUSH_SECRET, process.env.INTERNAL_POINTS_SECRET]
    .map((value) => value?.trim() || '')
    .some((secret) => secret.length === given.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function freeNickname(language: ProxyNicknameLanguage): Promise<string | null> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = randomProxyNickname(language)
    if (!(await isNicknameTakenByOther(candidate, null))) return candidate
  }
  return null
}

export async function GET(request: Request) {
  if (!authorized(request)) return bad('Unauthorized', 401)
  const language = new URL(request.url).searchParams.get('language')
  if (!isProxyNicknameLanguage(language)) return bad('language must be ko or en')
  const nickname = await freeNickname(language)
  if (!nickname) return bad('No free nickname found. Try again.', 503)
  return NextResponse.json({ nickname })
}

export async function POST(request: Request) {
  if (!authorized(request)) return bad('Unauthorized', 401)
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>

  const nickname = String(body.nickname || '').trim()
  if (!isValidNickname(nickname)) return bad('Nickname must be 2-20 Korean or English letters.')
  const addedBy = String(body.addedBy || '').trim().toLowerCase()
  if (!addedBy) return bad('addedBy is required.')
  const sourceLocale = parseLocale(String(body.sourceLocale || '')) ?? 'ko'

  const title = String(body.title || '').trim()
  if (!title) return bad('Title is required.')
  const contentHtml = sanitizeCommunityHtml(String(body.contentHtml || '').trim())
  const plain = htmlToPlainText(contentHtml)
  if (plain.length > COMMUNITY_BODY_MAX) return bad(`Body must be ${COMMUNITY_BODY_MAX} characters or fewer.`)
  if (!isJobReviewTypeId(body.jobReviewType)) return bad('Choose a review type.')
  const jobReviewType = body.jobReviewType
  const jobReviewTimeline = normalizeJobReviewTimeline(body.jobReviewTimeline)
  if (jobReviewTimeline.length === 0) return bad('Add at least one timeline entry.')
  if (!isJobReviewOutcomeId(body.jobReviewOutcome)) return bad('Choose the outcome.')
  const jobReviewOutcome = body.jobReviewOutcome
  const jobReviewSource = parseContactSourceInput(
    await getContactSourceConfig(),
    BRAND_CONFIG.id,
    body.jobReviewSource,
    body.jobReviewSourceOrgId,
  )
  if (!jobReviewSource) return bad('Choose a contact source.')
  const companyResult = await resolveReviewCompanyId(body.companyId)
  if (!companyResult.ok) return bad('Unknown company.')

  const now = Date.now()
  const id = `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  try {
    await claimNickname(`proxy:${id}`, nickname)
  } catch (error) {
    if (error instanceof NicknameTakenError) return bad('This nickname is already taken. Pick another one.', 409)
    throw error
  }

  const post: CommunityPost = {
    id,
    sourceLocale,
    categoryId: 'job-review',
    city: null,
    title,
    contentHtml,
    description: plain.slice(0, 240),
    location: String(body.location || '').trim(),
    detail: getJobReviewTypeLabel(jobReviewType),
    authorUid: '',
    authorEmail: '',
    authorNickname: nickname,
    authorPhotoURL: null,
    authorSchoolId: null,
    authorSchoolName: null,
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
    jobReviewTips: normalizeJobReviewTips(body.jobReviewTips) || null,
    jobReviewIndustry: String(body.jobReviewIndustry || '').trim() || null,
    jobReviewOutcome,
    companyId: companyResult.companyId ?? null,
    roommateLookingFor: null,
    roommateBudgetMax: null,
    roommateMoveInDate: null,
    roommateMoveOutDate: null,
    guestAuthor: null,
    proxyAuthor: { addedBy, addedAt: now },
  }

  const saved = await saveStoredCommunityPost(post, {
    jobReviewSource: jobReviewSource.source,
    jobReviewSourceOrgId: jobReviewSource.orgId,
  })
  return NextResponse.json({ post: saved }, { status: 201 })
}
