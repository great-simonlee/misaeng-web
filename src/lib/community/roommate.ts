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
