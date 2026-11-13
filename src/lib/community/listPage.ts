import type { CommunityPost } from '@/types/nyc'

/*
 * 커뮤니티 목록 페이지 나누기 (앱이 ?limit= 을 보낼 때만, src/app/api/community/route.ts).
 * 목록은 서버 캐시(60초)에서 꺼내 필터 → 정렬 → 자르기만 하고, 작성자 보강·추천/댓글 수는 그 페이지 글만 한다.
 * 필터는 앱이 하던 것과 같은 규칙 (iOS CommunityPost.cuisineId / RoommateType.normalize).
 */

export const LIST_PAGE_DEFAULT = 20
export const LIST_PAGE_MAX = 50

export function pageLimit(value: string | null): number | null {
  if (value == null) return null
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n <= 0) return LIST_PAGE_DEFAULT
  return Math.min(n, LIST_PAGE_MAX)
}

/** 맛집 요리 종류 (detail 에 한국어 이름이나 id 로 저장돼 있다) */
const CUISINE_IDS: Record<string, string> = {
  브런치: 'brunch',
  카페: 'cafe',
  한식: 'korean',
  일식: 'japanese',
  중식: 'chinese',
  양식: 'american',
  프랑스: 'french',
  이탈리안: 'italian',
  멕시칸: 'mexican',
  태국: 'thai',
  베트남: 'vietnamese',
  인도: 'indian',
  기타: 'other',
}

export function cuisineIdOf(post: Pick<CommunityPost, 'detail'>): string {
  const detail = String(post.detail || '')
  return CUISINE_IDS[detail] ?? detail
}

const ROOMMATE_TYPES = ['has-room', 'sublet', 'together', 'room']

/** 룸메이트 글 종류 (예전 글은 detail 문구로 추정) */
export function roommateTypeOf(post: Pick<CommunityPost, 'roommateLookingFor' | 'detail'>): string | null {
  const raw = String(post.roommateLookingFor || '')
  if (ROOMMATE_TYPES.includes(raw)) return raw
  if (raw === 'roommate') return 'has-room'
  const text = String(post.detail || '').toLowerCase()
  if (text.includes('서블') || text.includes('sublet')) return 'sublet'
  if (text.includes('같이') || text.includes('함께 구') || text.includes('together')) return 'together'
  if (text.includes('방만') || (text.includes('방') && !text.includes('룸메')) || text === 'room') return 'room'
  if (text.includes('방 있음') || text.includes('룸메') || text === 'roommate') return 'has-room'
  return null
}

/** 앱이 보내는 목록 필터 (게시판마다 쓰는 것만) */
export type ListFilters = {
  /** 익명: 주제 (post.location) */
  topic?: string
  /** 맛집: foodCategory */
  category?: string
  /** 맛집: 요리 종류 */
  cuisine?: string
  /** 비자: cptOptType · 룸메이트: 글 종류 */
  type?: string
  /** 비자: 작성자 학교 id */
  school?: string
}

export function readListFilters(params: URLSearchParams): ListFilters {
  const get = (key: string) => params.get(key)?.trim() || undefined
  return { topic: get('topic'), category: get('category'), cuisine: get('cuisine'), type: get('type'), school: get('school') }
}

export function matchesListFilters(post: CommunityPost, board: string | undefined, filters: ListFilters): boolean {
  if (filters.topic && post.location !== filters.topic) return false
  if (filters.category && post.foodCategory !== filters.category) return false
  if (filters.cuisine && cuisineIdOf(post) !== filters.cuisine) return false
  if (filters.type) {
    const type = board === 'roommate' ? roommateTypeOf(post) : post.cptOptType
    if (type !== filters.type) return false
  }
  if (filters.school && post.authorSchoolId !== filters.school) return false
  return true
}

/**
 * 다음 페이지 위치: "{지금까지 보낸 개수}.{마지막 글 id}". 그 사이 새 글이 생겨 순서가 밀려도
 * 마지막 글 id 다음부터 이어서 준다. 그 글이 지워졌으면 한 칸 앞부터 (건너뛰는 글이 없게, 앱은 같은 id 를 한 번만 보여 준다).
 */
export function pageAfter<T extends { id: string }>(items: T[], cursor: string | null, limit: number) {
  let start = 0
  if (cursor) {
    const dot = cursor.indexOf('.')
    const offset = Math.max(0, Math.floor(Number(cursor.slice(0, dot))) || 0)
    const lastId = cursor.slice(dot + 1)
    const at = lastId ? items.findIndex((item) => item.id === lastId) : -1
    start = at >= 0 ? at + 1 : Math.max(0, offset - 1)
  }
  const page = items.slice(start, start + limit)
  const end = start + page.length
  const nextCursor = end < items.length && page.length ? `${end}.${page[page.length - 1].id}` : null
  return { page, nextCursor }
}

/**
 * 목록 카드에 필요 없는 무거운 값을 뺀 글 (?view=list). 상세 화면은 /api/community/{id} 로 전체를 다시 받는다.
 * 카드가 쓰는 값은 남긴다: 타임라인 날짜·단계 수(기간, "N단계"), 대표 사진 한 장.
 */
export function toListPost<T extends CommunityPost>(post: T): T {
  return {
    ...post,
    contentHtml: '',
    jobReviewTips: post.jobReviewTips ? '' : post.jobReviewTips,
    cptOptTips: post.cptOptTips ? '' : post.cptOptTips,
    jobReviewTimeline: (post.jobReviewTimeline || []).map((step) => ({ ...step, stageReviewHtml: '' })),
    cptOptTimeline: (post.cptOptTimeline || []).map((step) => ({
      ...step,
      stageReviewHtml: '',
      prepared: '',
      submitted: '',
      resultReceived: '',
      nextStep: '',
    })),
    menuItems: (post.menuItems || []).slice(0, 1),
    galleryPhotos: (post.galleryPhotos || []).slice(0, 1),
  }
}
