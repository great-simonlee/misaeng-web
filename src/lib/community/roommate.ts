import type { Translate } from '@lib/i18n/translate'
import type { RoommateLookingFor } from '@/types/nyc'

/**
 * 화면 표시 문구는 `housing` 네임스페이스의 `roommate.*`에 있다 (`const t = useT('housing')`).
 * - 유형: `roommate.intents.<id>.*`, `roommate.lookingFor.<id>.*`, 작성 폼: `roommate.form.<id>.*`
 * ROOMMATE_LOOKING_FOR_OPTIONS의 한국어 label은 글의 detail 저장값이라 번역하지 않는다.
 */

export type { RoommateLookingFor }

export const ROOMMATE_TITLE_MAX = 40
export const ROOMMATE_BUDGET_MAX = 20_000
export const ROOMMATE_GALLERY_MAX = 6

/** 작성 1단계: 방 올리기 vs 룸메·방 찾기 */
export type RoommateIntent = 'offer-room' | 'seek'

/** 문구: housing `roommate.intents.<id>.*` */
export const ROOMMATE_INTENT_OPTIONS: {
  id: RoommateIntent
  lookingForIds: readonly RoommateLookingFor[]
}[] = [
  {
    id: 'offer-room',
    lookingForIds: ['has-room', 'sublet'],
  },
  {
    id: 'seek',
    lookingForIds: ['together', 'room'],
  },
]

export const ROOMMATE_LOOKING_FOR_OPTIONS: {
  id: RoommateLookingFor
  intent: RoommateIntent
  /** detail 저장값 (한국어 원문). 화면 문구는 housing `roommate.lookingFor.<id>.*` */
  label: string
}[] = [
  {
    id: 'has-room',
    intent: 'offer-room',
    label: '저희 방에 입주할 룸메 찾아요',
  },
  {
    id: 'sublet',
    intent: 'offer-room',
    label: '제 방에 잠깐 지내실 서블렛 올려요',
  },
  {
    id: 'together',
    intent: 'seek',
    label: '같이 입주할 방 찾을 룸메 구해요',
  },
  {
    id: 'room',
    intent: 'seek',
    label: '입주할 수 있는 방만 구해요',
  },
]

/** 작성 폼 구조 (필수 여부). 문구는 housing `roommate.form.<id>.*` */
export type RoommateFormRules = {
  locationRequired: boolean
  budgetRequired: boolean
  moveInStartRequired: boolean
  moveInEndRequired: boolean
  photosRecommended: boolean
}

export type RoommateFormConfig = RoommateFormRules & {
  locationLabel: string
  locationPlaceholder: string
  budgetLabel: string
  budgetPlaceholder: string
  moveInStartLabel: string
  moveInEndLabel: string
  photosHint: string
  titlePlaceholder: string
  bodyPlaceholder: string
}

const FORM_CONFIG: Record<RoommateLookingFor, RoommateFormRules> = {
  'has-room': {
    locationRequired: true,
    budgetRequired: true,
    moveInStartRequired: true,
    moveInEndRequired: false,
    photosRecommended: true,
  },
  together: {
    locationRequired: false,
    budgetRequired: true,
    moveInStartRequired: true,
    moveInEndRequired: false,
    photosRecommended: false,
  },
  room: {
    locationRequired: false,
    budgetRequired: true,
    moveInStartRequired: true,
    moveInEndRequired: false,
    photosRecommended: false,
  },
  sublet: {
    locationRequired: true,
    budgetRequired: true,
    moveInStartRequired: true,
    moveInEndRequired: true,
    photosRecommended: true,
  },
}

export const ROOMMATE_LOOKING_FOR_STYLES: Record<
  RoommateLookingFor,
  { badge: string; soft: string; accent: string }
> = {
  'has-room': {
    badge: 'bg-[#eff6ff] text-[#1d4ed8] ring-[#93c5fd]/60',
    soft: '#eff6ff',
    accent: '#1d4ed8',
  },
  together: {
    badge: 'bg-[#f5f3ff] text-[#6d28d9] ring-[#c4b5fd]/60',
    soft: '#f5f3ff',
    accent: '#6d28d9',
  },
  room: {
    badge: 'bg-[#eefaf4] text-[#0f766e] ring-[#99f6e4]/60',
    soft: '#eefaf4',
    accent: '#0f766e',
  },
  sublet: {
    badge: 'bg-[#fff7ed] text-[#c2410c] ring-[#fdba74]/60',
    soft: '#fff7ed',
    accent: '#c2410c',
  },
}

export function isRoommateLookingFor(
  value: unknown,
): value is RoommateLookingFor {
  return (
    value === 'has-room' ||
    value === 'together' ||
    value === 'room' ||
    value === 'sublet'
  )
}

export function normalizeRoommateLookingFor(
  raw: unknown,
  detailFallback?: string,
): RoommateLookingFor | null {
  if (isRoommateLookingFor(raw)) return raw
  // 레거시: 예전 'roommate' 단일 유형 → 방 있음으로 매핑
  if (raw === 'roommate') return 'has-room'

  const detail = String(detailFallback || '').trim().toLowerCase()
  if (detail.includes('서블') || detail.includes('sublet')) return 'sublet'
  if (
    detail.includes('같이') ||
    detail.includes('함께 구') ||
    detail.includes('together')
  ) {
    return 'together'
  }
  if (
    detail.includes('방만') ||
    (detail.includes('방') && !detail.includes('룸메')) ||
    detail === 'room'
  ) {
    return 'room'
  }
  if (
    detail.includes('방 있음') ||
    detail.includes('룸메') ||
    detail === 'roommate'
  ) {
    return 'has-room'
  }
  return null
}

/** t(`housing` 네임스페이스)를 넘기면 현재 언어, 없으면 한국어 원문 (API detail 저장값 — 번역하지 않는다) */
export function getRoommateLookingForLabel(
  value: RoommateLookingFor | null | undefined,
  t?: Translate,
) {
  if (t) return isRoommateLookingFor(value) ? t(`roommate.lookingFor.${value}.label`) : ''
  return (
    ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === value)?.label ?? ''
  )
}

/** t는 `useT('housing')` */
export function getRoommateLookingForShortLabel(
  value: RoommateLookingFor | null | undefined,
  t: Translate,
) {
  return isRoommateLookingFor(value)
    ? t(`roommate.lookingFor.${value}.shortLabel`)
    : ''
}

export function getRoommateLookingForStyle(
  value: RoommateLookingFor | null | undefined,
) {
  if (value && value in ROOMMATE_LOOKING_FOR_STYLES) {
    return ROOMMATE_LOOKING_FOR_STYLES[value]
  }
  return ROOMMATE_LOOKING_FOR_STYLES['has-room']
}

export function getRoommateIntent(
  value: RoommateLookingFor | null | undefined,
): RoommateIntent | null {
  if (!value) return null
  return (
    ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === value)?.intent ??
    null
  )
}

export function getRoommateLookingForOptionsByIntent(
  intent: RoommateIntent | null | undefined,
) {
  if (!intent) return []
  return ROOMMATE_LOOKING_FOR_OPTIONS.filter((item) => item.intent === intent)
}

export function isRoommateIntent(value: unknown): value is RoommateIntent {
  return value === 'offer-room' || value === 'seek'
}

export function roommateMatchesIntent(
  lookingFor: RoommateLookingFor | null | undefined,
  intent: RoommateIntent,
) {
  return getRoommateIntent(lookingFor) === intent
}

export function getRoommateFormConfig(
  lookingFor: RoommateLookingFor | null | undefined,
): RoommateFormRules | null {
  if (!lookingFor || !(lookingFor in FORM_CONFIG)) return null
  return FORM_CONFIG[lookingFor]
}

const FORM_TEXT_FIELDS = [
  'locationLabel',
  'locationPlaceholder',
  'budgetLabel',
  'budgetPlaceholder',
  'moveInStartLabel',
  'moveInEndLabel',
  'photosHint',
  'titlePlaceholder',
  'bodyPlaceholder',
] as const

/** 작성 폼 설정 + 현재 언어 문구. t는 `useT('housing')` */
export function getRoommateFormConfigText(
  lookingFor: RoommateLookingFor | null | undefined,
  t: Translate,
): RoommateFormConfig | null {
  const config = getRoommateFormConfig(lookingFor)
  if (!config || !lookingFor) return null
  const text = Object.fromEntries(
    FORM_TEXT_FIELDS.map((field) => [
      field,
      t(`roommate.form.${lookingFor}.${field}`),
    ]),
  ) as Record<(typeof FORM_TEXT_FIELDS)[number], string>
  return { ...config, ...text }
}

export function normalizeRoommateBudgetMax(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(Math.floor(n), ROOMMATE_BUDGET_MAX)
}

export function normalizeRoommateMoveInDate(raw: unknown): string | null {
  const value = String(raw || '').trim()
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

/** 종료일이 시작일보다 앞서면 null */
export function normalizeRoommateMoveOutDate(
  raw: unknown,
  moveInDate?: string | null,
): string | null {
  const end = normalizeRoommateMoveInDate(raw)
  if (!end) return null
  const start = normalizeRoommateMoveInDate(moveInDate)
  if (start && end < start) return null
  return end
}

export function formatRoommateBudget(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return `$${Math.floor(value).toLocaleString('en-US')}`
}

export function formatRoommateMoveInDate(value: string | null | undefined) {
  const date = String(value || '').trim()
  if (!date) return null
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return date
  return `${match[1]}.${match[2]}.${match[3]}`
}

/** 입주 시작~종료 기간 표시 */
export function formatRoommateMoveInRange(
  start: string | null | undefined,
  end?: string | null | undefined,
) {
  const from = formatRoommateMoveInDate(start)
  const to = formatRoommateMoveInDate(end)
  if (from && to) return `${from} – ${to}`
  if (from) return from
  if (to) return `~ ${to}`
  return null
}

export function isRoommateBoard(id: string) {
  return id === 'roommate'
}

/** 'YYYY-MM-DD' → 그 날 0시 (현지). new Date('2026-09-01')은 UTC 0시라 뉴욕에선 하루 전날이 된다 */
export function parseRoommateDate(value: string | null | undefined): Date | null {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** 오늘 날짜 'YYYY-MM-DD' (보는 사람 기준) */
export function roommateToday(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 방 올리기(has-room·sublet)면 금액은 월세, 찾는 글(together·room)이면 예산 상한 */
export function isRoommateOffer(value: RoommateLookingFor | null | undefined) {
  return getRoommateIntent(value) === 'offer-room'
}

/**
 * 입주 상태: 종료일이 지났으면 ended, 입주일이 오늘이거나 지났으면 availableNow.
 * 날짜는 'YYYY-MM-DD' 문자열이라 그대로 비교한다.
 */
export function getRoommateTimeline(
  post: { roommateMoveInDate?: string | null; roommateMoveOutDate?: string | null },
  today: string = roommateToday(),
) {
  const start = normalizeRoommateMoveInDate(post.roommateMoveInDate)
  const end = normalizeRoommateMoveInDate(post.roommateMoveOutDate)
  const ended = Boolean(end && end < today)
  return { ended, availableNow: !ended && Boolean(start && start <= today) }
}

/** 시작~종료 기간: 8주 미만은 주, 그 이상은 개월 (번역: housing `roommate.card.stay.<unit>`) */
export function getRoommateStayLength(
  start: string | null | undefined,
  end: string | null | undefined,
): { unit: 'weeks' | 'months'; count: number } | null {
  const from = parseRoommateDate(start)
  const to = parseRoommateDate(end)
  if (!from || !to) return null
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000)
  if (days <= 0) return null
  if (days < 56) return { unit: 'weeks', count: Math.max(1, Math.round(days / 7)) }
  return { unit: 'months', count: Math.max(2, Math.round(days / 30.44)) }
}

/** 상단 노출이 아직 진행 중인지 (목록 응답의 boostedUntil) */
export function isRoommateBoostActive(
  post: { boostedUntil?: string | null },
  now: number = Date.now(),
) {
  const until = post.boostedUntil ? Date.parse(post.boostedUntil) : NaN
  return Number.isFinite(until) && until > now
}

type DateFormatter = {
  date: (value: Date, options?: Intl.DateTimeFormatOptions) => string
}

/** 'YYYY-MM-DD' → 현재 언어의 짧은 날짜 (올해가 아니면 연도까지). format은 `useFormat()` */
export function formatRoommateDateShort(
  format: DateFormatter,
  value: string | null | undefined,
  now: Date = new Date(),
) {
  const date = parseRoommateDate(value)
  if (!date) return null
  return format.date(date, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/**
 * 동네 묶음 필터. 글의 location은 자유 입력(한/영 섞임)이라 별칭을 부분 일치로 찾는다.
 * 영문 별칭은 단어 단위로만 맞춘다 (les ≠ Los Angeles). 이름: housing `roommate.areas.<id>`
 */
export const ROOMMATE_AREA_GROUPS: Record<string, { id: string; aliases: string[] }[]> = {
  nyc: [
    {
      id: 'manhattan',
      aliases: [
        'manhattan', '맨해튼', '맨하탄', '맨하튼', 'ues', 'uws', 'upper east', 'upper west', 'midtown', '미드타운',
        'harlem', '할렘', 'chelsea', '첼시', 'soho', 'noho', 'tribeca', 'east village', 'west village',
        'greenwich', 'les', 'lower east', 'fidi', 'financial district', 'murray hill', 'kips bay', 'gramercy',
        'hell\'s kitchen', 'hells kitchen', 'morningside', 'washington heights', 'inwood', 'koreatown', 'k-town',
        '코리아타운', '한인타운', 'columbia', '컬럼비아', 'nyu', 'roosevelt island', '루즈벨트',
      ],
    },
    {
      id: 'brooklyn',
      aliases: [
        'brooklyn', '브루클린', '브룩클린', 'williamsburg', '윌리엄스버그', 'bushwick', '부시윅', 'greenpoint',
        '그린포인트', 'park slope', 'dumbo', 'bed-stuy', 'bedford', 'crown heights', 'prospect', 'sunset park',
        'bay ridge', 'clinton hill', 'fort greene', 'cobble hill', 'carroll gardens', 'boerum hill',
      ],
    },
    {
      id: 'queens',
      aliases: [
        'queens', '퀸즈', '퀸스', 'flushing', '플러싱', 'astoria', '아스토리아', 'long island city', 'lic',
        '롱아일랜드시티', '롱아일랜드 시티', 'sunnyside', '서니사이드', 'woodside', '우드사이드', 'jackson heights',
        'elmhurst', '엘름허스트', 'forest hills', 'bayside', '베이사이드', 'fresh meadows',
        'rego park', 'corona', 'little neck', 'douglaston',
      ],
    },
    { id: 'bronx', aliases: ['bronx', '브롱스', '브롱크스', 'riverdale', 'fordham'] },
    { id: 'staten-island', aliases: ['staten', '스태튼', '스테이튼'] },
    {
      id: 'new-jersey',
      aliases: [
        'new jersey', 'jersey', 'nj', '뉴저지', '저지시티', '저지 시티', 'hoboken', '호보켄', 'fort lee', '포트리',
        'edgewater', '엣지워터', '에지워터', 'weehawken', '위호켄', 'palisades park', '팰팍', '팰리세이드',
        'newport', '뉴포트', 'cliffside', 'englewood', '잉글우드', 'ridgefield', 'leonia',
      ],
    },
    {
      id: 'connecticut',
      aliases: [
        'connecticut', '코네티컷', '커네티컷', 'stamford', '스탬퍼드', '스탠포드', 'greenwich, ct',
        'norwalk', 'new haven', '뉴헤이븐', '뉴 헤이븐', 'yale', '예일', 'hartford', '하트퍼드', 'storrs',
        'uconn', 'bridgeport',
      ],
    },
  ],
  boston: [
    {
      id: 'boston',
      aliases: [
        'boston', '보스턴', 'back bay', '백베이', 'fenway', '펜웨이', 'allston', '올스턴', '올스톤', 'brighton',
        '브라이튼', 'jamaica plain', 'south end', 'beacon hill', 'mission hill', 'seaport', 'north end',
        'south boston', 'southie', 'charlestown', 'bu', 'northeastern', 'longwood',
      ],
    },
    {
      id: 'cambridge',
      aliases: [
        'cambridge', '캠브리지', '케임브리지', 'harvard', '하버드', 'mit', 'kendall', 'central square',
        'porter', 'inman',
      ],
    },
    { id: 'somerville', aliases: ['somerville', '서머빌', '소머빌', 'davis square', 'union square'] },
    { id: 'brookline', aliases: ['brookline', '브루클라인', 'coolidge'] },
    {
      id: 'rhode-island',
      aliases: [
        'rhode island', 'ri', '로드아일랜드', '로드 아일랜드', 'providence', '프로비던스', '프로비덴스',
        'brown university', '브라운대', 'risd', 'newport, ri',
      ],
    },
  ],
  dc: [
    {
      id: 'washington-dc',
      aliases: [
        'washington dc', 'washington, dc', 'd.c.', 'dc', '워싱턴', '디씨', 'georgetown', '조지타운',
        'foggy bottom', 'dupont', 'adams morgan', 'capitol hill', 'navy yard', 'columbia heights', 'u street',
        'logan circle', 'noma', 'gwu', 'george washington', 'howard', 'american university', 'tenleytown',
      ],
    },
    {
      id: 'virginia',
      aliases: [
        'virginia', 'va', '버지니아', 'arlington', '알링턴', 'rosslyn', 'ballston', 'clarendon', 'crystal city',
        'alexandria', '알렉산드리아', 'fairfax', '페어팩스', 'annandale', '애넌데일', 'centreville', '센터빌',
        'mclean', 'tysons', 'reston', 'herndon', 'vienna', 'falls church', 'gmu', 'george mason',
      ],
    },
    {
      id: 'maryland',
      aliases: [
        'maryland', 'md', '메릴랜드', 'bethesda', '베데스다', 'silver spring', '실버스프링', 'rockville', '락빌',
        'college park', '칼리지파크', 'umd', 'gaithersburg', 'ellicott city', '엘리콧시티', 'columbia, md',
        'hyattsville', 'chevy chase',
      ],
    },
  ],
}

export function getRoommateAreaGroups(city: string | null | undefined) {
  return ROOMMATE_AREA_GROUPS[city || ''] ?? []
}

function aliasMatches(haystack: string, alias: string) {
  const needle = alias.trim()
  if (!needle) return false
  // 한글 등 영문이 아닌 별칭은 부분 일치
  if (!/^[a-z0-9 .'&-]+$/.test(needle)) return haystack.includes(needle)
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack)
}

/** 글 위치가 동네 묶음에 속하는지 */
export function roommateLocationInArea(
  location: string | null | undefined,
  city: string | null | undefined,
  areaId: string,
) {
  const haystack = String(location || '').toLowerCase()
  if (!haystack.trim()) return false
  const group = getRoommateAreaGroups(city).find((item) => item.id === areaId)
  if (!group) return false
  return group.aliases.some((alias) => aliasMatches(haystack, alias.toLowerCase()))
}
