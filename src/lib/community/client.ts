import type { CommunityPost } from '@/types/nyc'
import type { Translate, TranslateParams } from '@lib/i18n/translate'
import {
  DEFAULT_CITY_ID,
  isSharedCommunityBoard,
  type CityId,
} from '@lib/constants/cities'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import {
  getMockCommunityPost,
  listMockCommunityPosts,
} from '@lib/constants/communityMock'
import { applyLocalViewCount } from '@lib/community/engagement.client'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import type {
  JobReviewOutcomeId,
  JobReviewSourceId,
} from '@lib/community/jobReview'
import {
  listLocalBeenThere,
  listLocalRecommendsForTarget,
} from '@lib/community/engagement.local'
import {
  countOpenComments,
  listMockCommunityComments,
} from '@lib/constants/communityCommentsMock'
import { listLocalCommunityComments } from '@lib/community/comments.local'

/**
 * 클라이언트에서 만든 에러 (서버 응답에 에러 문구가 없을 때).
 * `key`는 community 네임스페이스 번역 키 — 화면에서 `localizeCommunityError(err, t)`로 바꿔 보여 준다.
 */
export class CommunityClientError extends Error {
  readonly key: string
  readonly params?: TranslateParams

  constructor(key: string, params?: TranslateParams) {
    super(key)
    this.name = 'CommunityClientError'
    this.key = key
    this.params = params
  }
}

/** 서버가 준 (이미 번역된) 에러 문구가 있으면 그대로, 없으면 클라이언트 키로 에러를 던진다. */
export function throwCommunityRequestError(
  serverError: string | null | undefined,
  key: string,
): never {
  if (serverError) throw new Error(serverError)
  throw new CommunityClientError(key)
}

/**
 * CommunityClientError를 현재 언어 문구의 Error로 바꾼다 (그 밖의 에러는 그대로).
 * `t`는 `useT('community')`. 토스트: `getErrorMessage(localizeCommunityError(err, t), t('errors.xxx'))`
 */
export function localizeCommunityError(err: unknown, t: Translate): unknown {
  if (err instanceof CommunityClientError) {
    return new Error(t(err.key, err.params))
  }
  return err
}

function withLocalCounts(post: CommunityPost): CommunityPost {
  const localBeenThere = listLocalBeenThere(post.id).length
  const localRecommends = listLocalRecommendsForTarget('post', post.id).length
  const localComments = listLocalCommunityComments(post.id).filter(
    (item) => item.status === 'open',
  ).length
  const mockComments = post.id.startsWith('mock-')
    ? countOpenComments(listMockCommunityComments(post.id))
    : 0

  return {
    ...post,
    viewCount: applyLocalViewCount(post.viewCount, post.id),
    recommendCount: Math.max(post.recommendCount || 0, localRecommends),
    commentCount: Math.max(
      post.commentCount || 0,
      localComments,
      mockComments,
    ),
    beenThereCount: Math.max(post.beenThereCount || 0, localBeenThere),
    thumbnailUrl: post.thumbnailUrl ?? null,
    partySize: post.partySize ?? null,
    totalSpend: post.totalSpend ?? null,
    tipIncluded: post.tipIncluded ?? null,
    waitMinutes: post.waitMinutes ?? null,
    foodCategory: post.foodCategory ?? null,
    menuItems: Array.isArray(post.menuItems) ? post.menuItems : [],
    placeId: post.placeId ?? null,
    placeName: post.placeName ?? null,
    latitude: post.latitude ?? null,
    longitude: post.longitude ?? null,
    cptOptType: post.cptOptType ?? null,
    cptOptTimeline: Array.isArray(post.cptOptTimeline) ? post.cptOptTimeline : [],
    cptOptTips: post.cptOptTips ?? null,
    jobReviewType: post.jobReviewType ?? null,
    jobReviewTimeline: Array.isArray(post.jobReviewTimeline)
      ? post.jobReviewTimeline
      : [],
    jobReviewTips: post.jobReviewTips ?? null,
    jobReviewIndustry: post.jobReviewIndustry ?? null,
    jobReviewSource: post.jobReviewSource ?? null,
    jobReviewSourceOrgId: post.jobReviewSourceOrgId ?? null,
    jobReviewOutcome: post.jobReviewOutcome ?? null,
    roommateLookingFor: post.roommateLookingFor ?? null,
    roommateBudgetMax: post.roommateBudgetMax ?? null,
    roommateMoveInDate: post.roommateMoveInDate ?? null,
    roommateMoveOutDate: post.roommateMoveOutDate ?? null,
    guestAuthor: post.guestAuthor ?? null,
    city: post.city ?? null,
  }
}

export async function fetchCommunityPosts(
  boardId: NycCommunityBoardId,
  city: CityId = DEFAULT_CITY_ID,
): Promise<CommunityPost[]> {
  try {
    const params = new URLSearchParams({ board: boardId })
    if (!isSharedCommunityBoard(boardId)) {
      params.set('city', city)
    }
    const res = await fetch(`/api/community?${params.toString()}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { posts?: CommunityPost[] }
      const posts = Array.isArray(data.posts) ? data.posts : []
      if (posts.length > 0) {
        return posts.map(withLocalCounts)
      }
    }
  } catch {
    // 목 데이터로 폴백
  }
  return listMockCommunityPosts(boardId, city)
    .map(withLocalCounts)
    .map((post) => sanitizeAnonymousCommunityPost(post))
}

/** 보는 사람이 차단한 작성자의 글 (GET /api/community/{id} → 403 BLOCKED_USER) */
export class CommunityBlockedPostError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommunityBlockedPostError'
  }
}

export async function fetchCommunityPost(
  id: string,
): Promise<CommunityPost | null> {
  let blockedMessage: string | null = null
  try {
    const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { post?: CommunityPost }
      if (data.post) return withLocalCounts(data.post)
    } else if (res.status === 403) {
      const data = (await res.json().catch(() => null)) as
        | { code?: string; error?: string }
        | null
      if (data?.code === 'BLOCKED_USER') blockedMessage = data.error || 'blocked'
    }
  } catch {
    // 목 데이터로 폴백
  }
  if (blockedMessage) throw new CommunityBlockedPostError(blockedMessage)
  const mock = getMockCommunityPost(id)
  return mock
    ? sanitizeAnonymousCommunityPost(withLocalCounts(mock))
    : null
}

export async function createCommunityPostRequest(input: {
  categoryId: NycCommunityBoardId
  city?: CityId | null
  title: string
  contentHtml: string
  location: string
  detail: string
  authorSchoolId: string | null
  authorSchoolName: string | null
  authorNickname?: string | null
  authorPhotoURL?: string | null
  thumbnailUrl?: string | null
  partySize?: number | null
  totalSpend?: number | null
  tipIncluded?: boolean | null
  waitMinutes?: number | null
  foodCategory?: CommunityPost['foodCategory']
  menuItems?: CommunityPost['menuItems']
  galleryPhotos?: CommunityPost['galleryPhotos']
  placeId?: string | null
  placeName?: string | null
  latitude?: number | null
  longitude?: number | null
  cptOptType?: CommunityPost['cptOptType']
  cptOptTimeline?: CommunityPost['cptOptTimeline']
  cptOptTips?: CommunityPost['cptOptTips']
  jobReviewType?: CommunityPost['jobReviewType']
  jobReviewTimeline?: CommunityPost['jobReviewTimeline']
  jobReviewTips?: CommunityPost['jobReviewTips']
  jobReviewIndustry?: CommunityPost['jobReviewIndustry'] | null
  jobReviewSource?: JobReviewSourceId | null
  jobReviewSourceOrgId?: string | null
  jobReviewOutcome?: JobReviewOutcomeId | null
  roommateLookingFor?: CommunityPost['roommateLookingFor'] | null
  roommateBudgetMax?: CommunityPost['roommateBudgetMax'] | null
  roommateMoveInDate?: CommunityPost['roommateMoveInDate'] | null
  roommateMoveOutDate?: CommunityPost['roommateMoveOutDate'] | null
}): Promise<CommunityPost> {
  const res = await fetch('/api/community', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => null)) as
    | { post?: CommunityPost; error?: string }
    | null
  if (!res.ok || !data?.post) {
    throwCommunityRequestError(data?.error, 'errors.createFailed')
  }
  return data.post
}

export type GuestJobReviewCreditInfo = {
  estimated: number
  firstPostBonus: number
  awarded: number
  linked: boolean
  /** Points ledger active: nothing is paid right away, points come after the team reviews the post */
  pendingReview?: boolean
}

/** 가입 없이(또는 인증 없이) 남기는 면접·취업 후기 */
export async function createGuestJobReviewRequest(input: {
  title: string
  contentHtml: string
  location: string
  detail: string
  jobReviewType: CommunityPost['jobReviewType']
  jobReviewTimeline: CommunityPost['jobReviewTimeline']
  jobReviewTips?: CommunityPost['jobReviewTips']
  jobReviewIndustry?: CommunityPost['jobReviewIndustry'] | null
  jobReviewSource: JobReviewSourceId
  jobReviewSourceOrgId: string | null
  jobReviewOutcome: JobReviewOutcomeId
  guest: {
    nickname: string
    email: string
    linkedinUrl: string
    coffeeChatOk: boolean
    guidelinesAccepted: boolean
  }
  /** 허니팟 — 항상 빈 값 */
  website?: string
}): Promise<{ post: CommunityPost; credit: GuestJobReviewCreditInfo }> {
  const res = await fetch('/api/community/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => null)) as
    | { post?: CommunityPost; credit?: GuestJobReviewCreditInfo; error?: string }
    | null
  if (!res.ok || !data?.post) {
    throwCommunityRequestError(data?.error, 'errors.createFailed')
  }
  return {
    post: data.post,
    credit: data.credit ?? {
      estimated: 0,
      firstPostBonus: 0,
      awarded: 0,
      linked: false,
    },
  }
}

/** 로그인 계정 이메일과 같은 게스트 글을 내 글로 연결 (가입 직후 호출) */
export async function claimGuestPostsRequest(): Promise<{
  posts: CommunityPost[]
  creditAwarded: number
}> {
  const res = await fetch('/api/community/guest/claim', { method: 'POST' })
  const data = (await res.json().catch(() => null)) as
    | { posts?: CommunityPost[]; creditAwarded?: number; error?: string }
    | null
  if (!res.ok) {
    throwCommunityRequestError(
      data?.error,
      'errors.claimGuestFailed'
    )
  }
  return {
    posts: Array.isArray(data?.posts) ? data.posts : [],
    creditAwarded: Number(data?.creditAwarded) || 0,
  }
}

export async function fetchMyCommunityPosts(): Promise<CommunityPost[]> {
  const res = await fetch('/api/community?mine=1', { cache: 'no-store' })
  const data = (await res.json().catch(() => null)) as
    | { posts?: CommunityPost[]; error?: string }
    | null
  if (!res.ok) {
    throwCommunityRequestError(
      data?.error,
      'errors.myPostsLoadFailed'
    )
  }
  return (Array.isArray(data?.posts) ? data.posts : []).map(withLocalCounts)
}

export async function updateCommunityPostRequest(
  id: string,
  input: {
    title: string
    contentHtml: string
    location: string
    detail: string
    thumbnailUrl?: string | null
    partySize?: number | null
    totalSpend?: number | null
    tipIncluded?: boolean | null
    waitMinutes?: number | null
    foodCategory?: CommunityPost['foodCategory']
    menuItems?: CommunityPost['menuItems']
    galleryPhotos?: CommunityPost['galleryPhotos']
    placeId?: string | null
    placeName?: string | null
    latitude?: number | null
    longitude?: number | null
    cptOptType?: CommunityPost['cptOptType']
    cptOptTimeline?: CommunityPost['cptOptTimeline']
    cptOptTips?: CommunityPost['cptOptTips']
    jobReviewType?: CommunityPost['jobReviewType']
    jobReviewTimeline?: CommunityPost['jobReviewTimeline']
    jobReviewTips?: CommunityPost['jobReviewTips']
    jobReviewIndustry?: CommunityPost['jobReviewIndustry'] | null
    jobReviewSource?: JobReviewSourceId | null
    jobReviewSourceOrgId?: string | null
    jobReviewOutcome?: JobReviewOutcomeId | null
    roommateLookingFor?: CommunityPost['roommateLookingFor'] | null
    roommateBudgetMax?: CommunityPost['roommateBudgetMax'] | null
    roommateMoveInDate?: CommunityPost['roommateMoveInDate'] | null
    roommateMoveOutDate?: CommunityPost['roommateMoveOutDate'] | null
    city?: CityId | null
  },
): Promise<CommunityPost> {
  if (id.startsWith('mock-')) {
    throw new CommunityClientError(
      'errors.mockEditBlocked',
    )
  }
  const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => null)) as
    | { post?: CommunityPost; error?: string }
    | null
  if (!res.ok || !data?.post) {
    throwCommunityRequestError(data?.error, 'errors.updateFailed')
  }
  return data.post
}

export async function deleteCommunityPostRequest(id: string): Promise<void> {
  if (id.startsWith('mock-')) {
    throw new CommunityClientError(
      'errors.mockDeleteBlocked',
    )
  }
  const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null
  if (!res.ok || !data?.ok) {
    throwCommunityRequestError(data?.error, 'errors.deleteFailed')
  }
}
