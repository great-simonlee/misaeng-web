import { isLocale } from '@lib/i18n/locales'

/** 도시 사이트 슬러그. URL 첫 세그먼트(언어 접두사 다음)와 동일하다. */
export const CITY_IDS = ['nyc', 'boston', 'dc'] as const

export type CityId = (typeof CITY_IDS)[number]

export const DEFAULT_CITY_ID: CityId = 'nyc'

/** 화면 문구(헤드라인·소개)는 hub.cities.<id>.headline / description */
export const CITIES: Record<
  CityId,
  {
    id: CityId
    name: string
    shortLabel: string
    brand: string
    /** 도시 선택에서 이름 아래에 작게 쓰는 주 약자. 중심은 도시이고, 주변 주는 범위만 알려 준다 */
    regions: string
  }
> = {
  nyc: {
    id: 'nyc',
    name: 'New York',
    shortLabel: 'NYC',
    brand: 'MISAENG NYC',
    regions: 'NY · NJ · CT',
  },
  boston: {
    id: 'boston',
    name: 'Boston',
    shortLabel: 'Boston',
    brand: 'MISAENG BOSTON',
    regions: 'MA · RI',
  },
  dc: {
    id: 'dc',
    name: 'Washington DC',
    shortLabel: 'DC',
    brand: 'MISAENG DC',
    regions: 'DC · MD · VA',
  },
}

/** 모든 도시가 같은 글을 보는 게시판 */
export const SHARED_COMMUNITY_BOARD_IDS = ['status', 'job-review'] as const

/** 모든 도시가 같은 목록을 보는 페이지 */
export const SHARED_CITY_PAGE_IDS = ['partners', 'influencers'] as const

export type SharedCityPageId = (typeof SHARED_CITY_PAGE_IDS)[number]

export function isSharedCityPage(path: string): boolean {
  const slug = path.replace(/^\//, '').split('/')[0]
  return (SHARED_CITY_PAGE_IDS as readonly string[]).includes(slug)
}

export type SharedCommunityBoardId =
  (typeof SHARED_COMMUNITY_BOARD_IDS)[number]

export function isCityId(value: string | null | undefined): value is CityId {
  return Boolean(value && (CITY_IDS as readonly string[]).includes(value))
}

export function parseCityId(
  value: string | null | undefined,
): CityId | null {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
  return isCityId(slug) ? slug : null
}

export function resolveCityId(
  value: string | null | undefined,
): CityId {
  return parseCityId(value) ?? DEFAULT_CITY_ID
}

export function getCity(city: CityId) {
  return CITIES[city]
}

/** 언어 접두사(`/vi`)를 건너뛴 경로 세그먼트 */
function pathSegments(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean)
  return isLocale(parts[0]) ? parts.slice(1) : parts
}

export function getCityFromPathname(pathname: string): CityId {
  return resolveCityId(pathSegments(pathname)[0])
}

/** Pages shown inside the native app (no site header/footer): /{city}/app-view/… */
export function isAppViewPathname(pathname: string): boolean {
  return pathSegments(pathname)[1] === 'app-view'
}

export function isCitySitePathname(pathname: string): boolean {
  return isCityId(pathSegments(pathname)[0])
}

/** `/boston/food` + nyc → `/nyc/food` (언어 접두사는 떼고 돌려준다) */
export function replaceCityInPath(pathname: string, nextCity: CityId): string {
  const parts = pathSegments(pathname)
  if (parts[0] && isCityId(parts[0])) {
    const rest = parts.slice(1).join('/')
    return rest ? cityPath(nextCity, `/${rest}`) : cityPath(nextCity)
  }
  return cityPath(nextCity)
}

/** `cityPath('boston', '/status')` → `/boston/status` */
export function cityPath(city: CityId, suffix = ''): string {
  const path = !suffix
    ? ''
    : suffix.startsWith('/')
      ? suffix
      : `/${suffix}`
  return `/${city}${path}`
}

/**
 * 로그인 페이지 경로. next가 언어 접두사로 시작하면(`/vi/nyc/...`) 로그인 페이지도 같은 언어로 연다.
 */
export function cityLoginPath(city: CityId, next?: string): string {
  const base = `${localePrefixOf(next)}${cityPath(city, '/login')}`
  if (!next) return base
  return `${base}?next=${encodeURIComponent(next)}`
}

/** `/vi/nyc/food` → `/vi`, 접두사 없으면 '' */
export function localePrefixOf(path: string | null | undefined): string {
  const first = String(path || '').split('?')[0].split('/').filter(Boolean)[0]
  return isLocale(first) ? `/${first}` : ''
}

/** 레거시 OPT·비자·영주권 id 포함 */
export function isSharedCommunityBoard(boardId: string): boolean {
  return (
    boardId === 'status' ||
    boardId === 'job-review' ||
    boardId === 'cpt-opt' ||
    boardId === 'visa' ||
    boardId === 'green-card'
  )
}

/** 도시 전용 글. city가 없으면 NYC 레거시로 본다. */
export function resolvePostCity(
  city: string | null | undefined,
): CityId {
  return resolveCityId(city)
}

export function communityPostMatchesCity(
  post: { categoryId: string; city?: CityId | null },
  city: CityId,
): boolean {
  if (isSharedCommunityBoard(post.categoryId)) return true
  return resolvePostCity(post.city) === city
}

export function housingListingMatchesCity(
  listing: { city?: CityId | null },
  city: CityId,
): boolean {
  return resolvePostCity(listing.city) === city
}

function canonicalBoardPath(boardId: string): string {
  if (
    boardId === 'cpt-opt' ||
    boardId === 'visa' ||
    boardId === 'green-card'
  ) {
    return 'status'
  }
  return boardId
}

/** 공유 보드는 현재 도시 URL, 도시 전용 글은 글의 city */
export function hrefForCommunityPost(
  post: { id: string; categoryId: string; city?: CityId | null },
  currentCity: CityId,
  extra = '',
): string {
  const board = canonicalBoardPath(post.categoryId)
  const city = isSharedCommunityBoard(post.categoryId)
    ? currentCity
    : resolvePostCity(post.city)
  const suffix = extra.startsWith('/') ? extra : extra ? `/${extra}` : ''
  return cityPath(city, `/${board}/${post.id}${suffix}`)
}

export function hrefForHousingListing(
  listing: { id: string; city?: CityId | null },
  extra = '',
): string {
  const city = resolvePostCity(listing.city)
  const suffix = extra.startsWith('/') || extra.startsWith('?')
    ? extra
    : extra
      ? `/${extra}`
      : ''
  return cityPath(city, `/housing/${listing.id}${suffix}`)
}
