import type { CommunityPost, FoodCategoryId } from '@/types/nyc'
import { normalizeCptOptType } from '@lib/community/cptOpt'
import { foodCategoriesOf } from '@lib/community/food'
import { normalizeJobReviewType } from '@lib/community/jobReview'
import { resolvePostCity } from '@lib/constants/cities'
import { matchesEmployerFilter, type EmployerFilter } from '@lib/constants/statusEmployer'

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

const STATUS_TYPES_BY_DETAIL: Record<string, string> = {
  cpt: 'cpt',
  opt: 'opt',
  'stem opt': 'stem-opt',
  비자: 'visa',
  영주권: 'green-card',
}

/** 비자 글 종류 (예전 글은 detail 로, 앱과 같은 규칙) */
export function statusTypeOf(post: Pick<CommunityPost, 'cptOptType' | 'detail'>): string {
  if (post.cptOptType) return post.cptOptType
  return STATUS_TYPES_BY_DETAIL[String(post.detail || '').toLowerCase()] ?? ''
}

/** 앱이 보내는 목록 필터 (게시판마다 쓰는 것만) */
export type ListFilters = {
  /** 익명: 주제 (post.location) */
  topic?: string
  /** 맛집: foodCategory · 중고거래: marketCategory (free = 나눔) */
  category?: string
  /** 맛집: 요리 종류 */
  cuisine?: string
  /** 비자: cptOptType · 룸메이트: 글 종류 */
  type?: string
  /** 비자: 작성자 학교 id */
  school?: string
  /** 예전 앱의 판매완료 숨기기 (이제 중고거래 목록은 늘 판매완료를 뺀다) */
  active?: boolean
  /** 웹 목록 (owner 11-23 페이지 나누기): 검색어 — 게시판마다 웹 목록이 보던 칸에서 찾는다 */
  q?: string
  /** 중고거래: 가격 범위 (달러), 무료나눔만 */
  minPrice?: number
  maxPrice?: number
  free?: boolean
  /** 비자: 글의 도시 (목록 city 와 별개) */
  postCity?: string
  /** 면접·취업: 회사 이름 일부 또는 회사 분류 */
  employer?: string
  employerCategory?: string
  /** newest (기본) | oldest — 보내면 서버가 웹 목록과 같은 순서로 정렬한다 */
  sort?: 'newest' | 'oldest'
}

export function readListFilters(params: URLSearchParams): ListFilters {
  const get = (key: string) => params.get(key)?.trim() || undefined
  return {
    topic: get('topic'),
    category: get('category'),
    cuisine: get('cuisine'),
    type: get('type'),
    school: get('school'),
    active: params.get('active') === '1',
    q: get('q')?.slice(0, 80),
    minPrice: priceParam(params.get('min')),
    maxPrice: priceParam(params.get('max')),
    free: params.get('free') === '1',
    postCity: get('postCity'),
    employer: get('employer')?.slice(0, 80),
    employerCategory: get('employerCategory'),
    sort: get('sort') === 'oldest' ? 'oldest' : get('sort') === 'newest' ? 'newest' : undefined,
  }
}

function priceParam(value: string | null) {
  if (value == null || value.trim() === '') return undefined
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** 검색어가 찾는 칸: 웹 목록이 클라이언트에서 찾던 것과 같다 (CommunityListScreen 예전 필터) */
function keywordHaystack(post: CommunityPost, board: string | undefined) {
  const parts: (string | null | undefined)[] = [post.title, post.description, post.location, post.detail]
  if (board === 'status') {
    parts.push(post.authorSchoolName, post.cptOptTips)
    for (const entry of post.cptOptTimeline ?? []) {
      parts.push(entry.stageLabel ?? '', entry.prepared, entry.submitted, entry.resultReceived, entry.nextStep)
    }
  }
  if (board === 'job-review') {
    parts.push(post.jobReviewTips, post.jobReviewIndustry)
    for (const entry of post.jobReviewTimeline ?? []) {
      parts.push(entry.stageLabel, entry.platform, entry.documentsSubmitted, entry.interviewRound, entry.stageReviewHtml, entry.outcome)
    }
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/** 웹 목록 정렬 (sort 를 보냈을 때만): 비자·면접 후기는 고친 시각, 나머지는 쓴 시각 */
export function sortForList<T extends CommunityPost>(posts: T[], board: string | undefined, sort: ListFilters['sort']): T[] {
  if (!sort) return posts
  const updated = board === 'status' || board === 'job-review'
  const time = (post: T) => (updated ? post.updatedAt || post.createdAt : post.createdAt)
  return [...posts].sort((a, b) => (sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)))
}

export function matchesListFilters(post: CommunityPost, board: string | undefined, filters: ListFilters): boolean {
  if (filters.topic && post.location !== filters.topic) return false
  if (board === 'marketplace') {
    // 판매완료는 목록에 안 나온다 (상세·문의는 그대로). "free" 탭 = 가격 0 (나눔), 카테고리와 상관없이
    if (post.marketStatus === 'sold') return false
    if (filters.category === 'free') {
      if ((post as { price?: number | null }).price !== 0) return false
    } else if (filters.category && post.marketCategory !== filters.category) return false
  } else if (
    filters.category &&
    !foodCategoriesOf(post).includes(filters.category as FoodCategoryId)
  ) return false
  if (filters.active && post.marketStatus === 'sold') return false
  if (filters.cuisine && cuisineIdOf(post) !== filters.cuisine) return false
  if (filters.type) {
    const matches =
      board === 'roommate'
        ? roommateTypeOf(post) === filters.type
        : board === 'job-review'
          ? normalizeJobReviewType(post.jobReviewType, post.detail) === filters.type
          : statusTypeOf(post) === filters.type || normalizeCptOptType(post.cptOptType, post.detail) === filters.type
    if (!matches) return false
  }
  if (filters.school && post.authorSchoolId !== filters.school) return false
  if (board === 'marketplace') {
    const price = typeof post.price === 'number' ? post.price : null
    if (filters.free && price !== 0) return false
    if (filters.minPrice != null && (price == null || price < filters.minPrice)) return false
    if (filters.maxPrice != null && (price == null || price > filters.maxPrice)) return false
  }
  if (filters.postCity && resolvePostCity(post.city) !== filters.postCity) return false
  if (filters.employer || filters.employerCategory) {
    const employer: EmployerFilter = filters.employerCategory
      ? { mode: 'category', name: '', category: filters.employerCategory }
      : { mode: 'name', name: filters.employer ?? '', category: '' }
    if (!matchesEmployerFilter(post.location, employer)) return false
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    if (!keywordHaystack(post, board).includes(q)) return false
  }
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
