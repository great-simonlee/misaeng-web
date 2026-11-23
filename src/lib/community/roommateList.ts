import type { CommunityPost } from '@/types/nyc'
import {
  ROOMMATE_BUDGET_MAX,
  getRoommateTimeline,
  isRoommateBoostActive,
  normalizeRoommateLookingFor,
  roommateLocationInArea,
  roommateMatchesIntent,
  type RoommateIntent,
  type RoommateLookingFor,
} from '@lib/community/roommate'

/*
 * 룸메이트·서블렛 목록 필터와 정렬 — the web list screen and GET /api/community?board=roommate&limit= share these
 * (owner 11-23 paging: the server filters and sorts before it pages).
 */

export const BUDGET_STEP = 100
/** 슬라이더 끝값. 오른쪽 끝(max)은 "그 이상 전부"로 본다 */
export const BUDGET_BOUNDS = { min: 0, max: Math.min(5000, ROOMMATE_BUDGET_MAX) }
/** 입주 시기 칩: 이번 달 + 다음 N달, 그 뒤는 "이후" 하나로 */
export const MOVE_IN_MONTHS = 4

/** 라벨: housing `roommate.list.budgetPresets.<id>` */
export const BUDGET_PRESETS = [
  { id: 'under-1500', min: 0, max: 1500 },
  { id: '1500-2000', min: 1500, max: 2000 },
  { id: '2000-2500', min: 2000, max: 2500 },
  { id: '2500-plus', min: 2500, max: BUDGET_BOUNDS.max },
] as const

/** 라벨: housing `roommate.list.sortOptions.<id>` */
export const SORT_OPTIONS = ['newest', 'moveInSoon', 'priceLow', 'priceHigh'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export type Filters = {
  intent: 'all' | RoommateIntent
  lookingFor: 'all' | RoommateLookingFor
  /** 'all' | 동네 묶음 id (ROOMMATE_AREA_GROUPS) */
  area: string
  /** 'all' | 'YYYY-MM' | 'later' */
  moveIn: string
  budgetMin: number
  budgetMax: number
  query: string
  sort: SortOption
}

export const DEFAULT_FILTERS: Filters = {
  intent: 'all',
  lookingFor: 'all',
  area: 'all',
  moveIn: 'all',
  budgetMin: BUDGET_BOUNDS.min,
  budgetMax: BUDGET_BOUNDS.max,
  query: '',
  sort: 'newest',
}

export function budgetFiltered(filters: Filters) {
  return filters.budgetMin > BUDGET_BOUNDS.min || filters.budgetMax < BUDGET_BOUNDS.max
}

/** 입주일이 속한 달 'YYYY-MM'. 이미 입주 가능하면 이번 달 */
export function moveInMonthOf(post: CommunityPost, today: string) {
  const start = post.roommateMoveInDate?.trim()
  if (!start) return null
  return (start < today ? today : start).slice(0, 7)
}

export function matchesFilters(
  post: CommunityPost,
  filters: Filters,
  ctx: { city: string; today: string; months: string[] },
) {
  const type = normalizeRoommateLookingFor(post.roommateLookingFor, post.detail)
  if (filters.lookingFor !== 'all' && type !== filters.lookingFor) return false
  if (
    filters.lookingFor === 'all' &&
    filters.intent !== 'all' &&
    !roommateMatchesIntent(type, filters.intent)
  ) {
    return false
  }
  if (
    filters.area !== 'all' &&
    !roommateLocationInArea(post.location, ctx.city, filters.area)
  ) {
    return false
  }
  if (filters.moveIn !== 'all') {
    const month = moveInMonthOf(post, ctx.today)
    if (!month) return false
    if (filters.moveIn === 'later') {
      if (month <= ctx.months[ctx.months.length - 1]) return false
    } else if (month !== filters.moveIn) {
      return false
    }
  }
  if (budgetFiltered(filters)) {
    const budget = post.roommateBudgetMax
    if (budget == null) return false
    if (budget < filters.budgetMin) return false
    // 오른쪽 끝이면 상한 없음 ($5,000 넘는 글도 포함)
    if (filters.budgetMax < BUDGET_BOUNDS.max && budget > filters.budgetMax) return false
  }
  const q = filters.query.trim().toLowerCase()
  if (q) {
    const haystack = [post.title, post.description, post.location]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

/**
 * 정렬: 상단 노출 중인 글이 항상 먼저, 기간이 지난 글은 항상 뒤로.
 * 그 안에서 고른 정렬 (값이 없는 글은 뒤로).
 */
export function sortPosts(posts: CommunityPost[], sort: SortOption, today: string) {
  const now = Date.now()
  const rank = (post: CommunityPost) =>
    isRoommateBoostActive(post, now) ? 0 : getRoommateTimeline(post, today).ended ? 2 : 1
  const compareOptional = (a: number | string | null, b: number | string | null, dir: 1 | -1) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    return a < b ? -dir : a > b ? dir : 0
  }
  return [...posts].sort((a, b) => {
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    let result = 0
    if (sort === 'priceLow') result = compareOptional(a.roommateBudgetMax, b.roommateBudgetMax, 1)
    else if (sort === 'priceHigh') result = compareOptional(a.roommateBudgetMax, b.roommateBudgetMax, -1)
    else if (sort === 'moveInSoon') {
      result = compareOptional(a.roommateMoveInDate || null, b.roommateMoveInDate || null, 1)
    }
    return result !== 0 ? result : b.createdAt - a.createdAt
  })
}


/** 'YYYY-MM' for this month and the next MOVE_IN_MONTHS - 1 (입주 시기 칩) */
export function moveInMonthsFrom(today: string) {
  const [year, month] = today.split('-').map(Number)
  return Array.from({ length: MOVE_IN_MONTHS }, (_, index) => {
    const date = new Date(year, month - 1 + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

/** Web list filters → query params (rsort marks a web request) */
export function roommateFilterParams(filters: Filters): Record<string, string> {
  return {
    rsort: filters.sort,
    intent: filters.intent,
    lookingFor: filters.lookingFor,
    area: filters.area,
    moveIn: filters.moveIn,
    bmin: String(filters.budgetMin),
    bmax: String(filters.budgetMax),
    ...(filters.query.trim() ? { q: filters.query.trim().slice(0, 80) } : {}),
  }
}

/** Query params → filters; null when the request isn't from the web list (no rsort) */
export function readRoommateFilters(params: URLSearchParams): Filters | null {
  const sort = params.get('rsort')
  if (!sort) return null
  const num = (key: string, fallback: number) => {
    const n = Number(params.get(key))
    return params.get(key) != null && Number.isFinite(n) ? n : fallback
  }
  return {
    intent: (params.get('intent') as Filters['intent']) || 'all',
    lookingFor: (params.get('lookingFor') as Filters['lookingFor']) || 'all',
    area: params.get('area') || 'all',
    moveIn: params.get('moveIn') || 'all',
    budgetMin: num('bmin', BUDGET_BOUNDS.min),
    budgetMax: num('bmax', BUDGET_BOUNDS.max),
    query: params.get('q') || '',
    sort: (SORT_OPTIONS as readonly string[]).includes(sort) ? (sort as SortOption) : 'newest',
  }
}
