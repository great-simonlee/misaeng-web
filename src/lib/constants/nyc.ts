import { cityPath, type CityId } from '@lib/constants/cities'

export const MISAENG_EMAIL_DOMAIN = '@misaeng.com'

export const MISAENG_NY_INSTAGRAM_HANDLE = 'misaeng.ny'
export const MISAENG_NY_INSTAGRAM_URL = `https://instagram.com/${MISAENG_NY_INSTAGRAM_HANDLE}`

/** NYC 네비·푸터·본문 가로 정렬용 컨테이너 */
export const NYC_PAGE_SHELL_CLASS =
  'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'

/** 카카오톡 문의 채널/오픈채팅 URL (미설정 시 문의 버튼에서 안내) */
export const KAKAO_INQUIRY_URL =
  process.env.NEXT_PUBLIC_KAKAO_INQUIRY_URL?.trim() ||
  'https://open.kakao.com/o/sRI0tPJi'

/** 게시판 목록. 화면 문구는 `t('community.categories.<id>.title')` / `.description`({city})으로 번역한다. */
export const NYC_CATEGORIES = [
  {
    id: 'housing',
    href: '/housing',
    postHref: '/housing/new',
    available: true,
  },
  {
    id: 'events',
    href: '/events',
    postHref: '/events/new',
    available: false,
  },
  {
    id: 'food',
    href: '/food',
    postHref: '/food/new',
    available: true,
  },
  {
    id: 'marketplace',
    href: '/marketplace',
    postHref: '/marketplace/new',
    available: false,
  },
  {
    id: 'status',
    href: '/status',
    postHref: '/status/new',
    available: true,
  },
  {
    id: 'job-review',
    href: '/job-review',
    postHref: '/job-review/new',
    available: true,
  },
  {
    id: 'roommate',
    href: '/roommate',
    postHref: '/roommate/new',
    available: true,
  },
  {
    id: 'anonymous',
    href: '/anonymous',
    postHref: '/anonymous/new',
    available: true,
  },
] as const

export type NycCategoryId = (typeof NYC_CATEGORIES)[number]['id']

/** 하우징·룸메이트 제외, 공통 communityPosts 컬렉션을 쓰는 보드 */
export const NYC_COMMUNITY_BOARD_IDS = [
  'events',
  'food',
  'marketplace',
  'status',
  'cpt-opt',
  'visa',
  'job-review',
  'green-card',
  'anonymous',
  'roommate',
] as const

export type NycCommunityBoardId = (typeof NYC_COMMUNITY_BOARD_IDS)[number]

/** 레거시 보드 → 통합 게시판(/status)으로 리다이렉트 */
const LEGACY_STATUS_BOARD_IDS = ['cpt-opt', 'visa', 'green-card'] as const

export function getCityCategories(city: CityId) {
  return NYC_CATEGORIES.map((category) => ({
    ...category,
    href: cityPath(city, category.href),
    postHref: cityPath(city, category.postHref),
  }))
}

/** 목록·글쓰기 UI 대신 준비 중 안내를 보여줄 보드 */
export const NYC_WIP_COMMUNITY_BOARD_IDS = ['marketplace'] as const

export type NycWipCommunityBoardId =
  (typeof NYC_WIP_COMMUNITY_BOARD_IDS)[number]

export function isCommunityBoardWip(
  id: string,
): id is NycWipCommunityBoardId {
  return (NYC_WIP_COMMUNITY_BOARD_IDS as readonly string[]).includes(id)
}

/**
 * 게시판별 글쓰기·목록 설정 (구조 정보만).
 * 문구는 `t('community.boards.<boardId>.<field>')`로 번역한다 (listIntro는 `{city}`에 도시 이름) — `communityBoardKey` 참고.
 * `hasDetail`: 상세 입력(detailLabel)이 있는 보드, `hasDetailPlaceholder`: detailPlaceholder 문구가 있는 보드.
 */
export const NYC_COMMUNITY_BOARD_META: Record<
  NycCommunityBoardId,
  {
    hasDetail: boolean
    hasDetailPlaceholder: boolean
    detailInput: 'text' | 'date' | 'number' | null
  }
> = {
  events: {
    hasDetail: true,
    hasDetailPlaceholder: false,
    detailInput: 'date',
  },
  food: {
    hasDetail: true,
    hasDetailPlaceholder: false,
    detailInput: null,
  },
  marketplace: {
    hasDetail: true,
    hasDetailPlaceholder: true,
    detailInput: 'number',
  },
  status: {
    hasDetail: true,
    hasDetailPlaceholder: false,
    detailInput: null,
  },
  'cpt-opt': {
    hasDetail: true,
    hasDetailPlaceholder: false,
    detailInput: null,
  },
  visa: {
    hasDetail: true,
    hasDetailPlaceholder: true,
    detailInput: 'text',
  },
  'job-review': {
    hasDetail: true,
    hasDetailPlaceholder: false,
    detailInput: null,
  },
  roommate: {
    hasDetail: true,
    hasDetailPlaceholder: true,
    detailInput: 'number',
  },
  'green-card': {
    hasDetail: true,
    hasDetailPlaceholder: true,
    detailInput: 'text',
  },
  anonymous: {
    hasDetail: false,
    hasDetailPlaceholder: false,
    detailInput: null,
  },
}

export function getNycCategory(id: string) {
  return NYC_CATEGORIES.find((c) => c.id === id)
}

export function isCommunityBoardId(id: string): id is NycCommunityBoardId {
  return (NYC_COMMUNITY_BOARD_IDS as readonly string[]).includes(id)
}

export function getCommunityBoardRedirect(
  id: string,
  city: CityId = 'nyc',
): string | null {
  if (!isCommunityBoardId(id)) return null
  if ((LEGACY_STATUS_BOARD_IDS as readonly string[]).includes(id)) {
    return cityPath(city, '/status')
  }
  return null
}

/** 레거시 cpt-opt·비자·영주권 보드를 통합 게시판(status)으로 매핑 */
export function resolveMergedCommunityBoardId(
  id: string,
): NycCommunityBoardId | null {
  if (!isCommunityBoardId(id)) return null
  if ((LEGACY_STATUS_BOARD_IDS as readonly string[]).includes(id)) {
    return 'status'
  }
  return id
}

export function getCommunityBoardMeta(boardId: NycCommunityBoardId) {
  return NYC_COMMUNITY_BOARD_META[boardId]
}

/** 게시판 문구 번역 키 (`community` 네임스페이스 기준): `t(communityBoardKey(id, 'listIntro'), { city })` */
export function communityBoardKey(
  boardId: NycCommunityBoardId,
  field:
    | 'writeLabel'
    | 'listIntro'
    | 'locationLabel'
    | 'locationPlaceholder'
    | 'detailLabel'
    | 'detailPlaceholder'
    | 'titlePlaceholder'
    | 'descriptionPlaceholder',
): string {
  return `boards.${boardId}.${field}`
}

/** 비자·OPT·영주권 통합 게시판 여부 (레거시 id 포함) */
export function isStatusCommunityBoard(id: string): boolean {
  return resolveMergedCommunityBoardId(id) === 'status'
}

export function isAnonymousBoard(id: string): boolean {
  return id === 'anonymous'
}

export function isMisaengEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(MISAENG_EMAIL_DOMAIN)
}

export {
  INFLUENCER_PLATFORMS as NYC_INFLUENCER_PLATFORMS,
  PARTNER_INFLUENCERS as NYC_PARTNER_INFLUENCERS,
  PARTNER_ORGS as NYC_PARTNER_ORGS,
  type InfluencerPlatformId as NycInfluencerPlatformId,
} from '@lib/constants/partners'

/** 화면 문구: hub.professionals.categories.<id>.title / description */
export const NYC_PROFESSIONAL_CATEGORIES = [
  { id: 'real-estate' },
  { id: 'lawyer' },
  { id: 'moving' },
  { id: 'accountant' },
] as const

export type NycProfessionalCategoryId =
  (typeof NYC_PROFESSIONAL_CATEGORIES)[number]['id']

/** 실제 파트너 정보로 교체 예정인 플레이스홀더. 화면 문구: hub.professionals.items.<id>.name / specialty */
export const NYC_PROFESSIONALS = [
  {
    id: 're-1',
    categoryId: 'real-estate' as const,
    contact: null,
  },
  {
    id: 're-2',
    categoryId: 'real-estate' as const,
    contact: null,
  },
  {
    id: 'law-1',
    categoryId: 'lawyer' as const,
    contact: null,
  },
  {
    id: 'law-2',
    categoryId: 'lawyer' as const,
    contact: null,
  },
  {
    id: 'mv-1',
    categoryId: 'moving' as const,
    contact: null,
  },
  {
    id: 'mv-2',
    categoryId: 'moving' as const,
    contact: null,
  },
  {
    id: 'acc-1',
    categoryId: 'accountant' as const,
    contact: null,
  },
  {
    id: 'acc-2',
    categoryId: 'accountant' as const,
    contact: null,
  },
] as const

/**
 * 매거진형 에디터 콘텐츠 프리뷰 (게시판과 별개).
 * 문구는 `t('hub.magazine.items.<id>.tag|title|excerpt')`.
 */
export const NYC_MAGAZINE_PREVIEWS = [
  {
    id: 'mag-1',
    image: '/img/banner_1.png',
  },
  {
    id: 'mag-2',
    image: '/img/ourservice_banner.png',
  },
  {
    id: 'mag-3',
    image: '/img/main_banner_1.png',
  },
  {
    id: 'mag-4',
    image: '/img/map_2.png',
  },
] as const
