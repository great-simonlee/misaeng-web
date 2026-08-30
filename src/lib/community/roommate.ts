import type { RoommateLookingFor } from '@/types/nyc'

export type { RoommateLookingFor }

export const ROOMMATE_TITLE_MAX = 40
export const ROOMMATE_BUDGET_MAX = 20_000

/** 작성 1단계: 방 올리기 vs 룸메·방 찾기 */
export type RoommateIntent = 'offer-room' | 'seek'

export const ROOMMATE_INTENT_OPTIONS: {
  id: RoommateIntent
  label: string
  description: string
  lookingForIds: readonly RoommateLookingFor[]
}[] = [
  {
    id: 'offer-room',
    label: '방 올리기',
    description: '있는 방에 룸메를 구하거나 서블렛을 올려요',
    lookingForIds: ['has-room', 'sublet'],
  },
  {
    id: 'seek',
    label: '룸메 찾기',
    description: '같이 구할 룸메나 들어갈 방을 찾아요',
    lookingForIds: ['together', 'room'],
  },
]

export const ROOMMATE_LOOKING_FOR_OPTIONS: {
  id: RoommateLookingFor
  intent: RoommateIntent
  /** 작성·상세·필터 시트용 */
  label: string
  /** 목록 빠른 필터 칩용 짧은 라벨 */
  shortLabel: string
  description: string
}[] = [
  {
    id: 'has-room',
    intent: 'offer-room',
    label: '저희 방에 입주할 룸메 찾아요',
    shortLabel: '방 있음',
    description: '이미 방이 있고, 함께 살 사람을 구해요',
  },
  {
    id: 'sublet',
    intent: 'offer-room',
    label: '제 방에 잠깐 지내실 서블렛 올려요',
    shortLabel: '서블렛',
    description: '단기 임대·서블렛으로 방을 빌려드려요',
  },
  {
    id: 'together',
    intent: 'seek',
    label: '같이 입주할 방 찾을 룸메 구해요',
    shortLabel: '같이 구함',
    description: '아직 방이 없고, 같이 구할 룸메를 찾아요',
  },
  {
    id: 'room',
    intent: 'seek',
    label: '입주할 수 있는 방만 구해요',
    shortLabel: '방 구함',
    description: '룸메 없이 들어갈 방·집만 찾아요',
  },
]

export type RoommateFormConfig = {
  locationLabel: string
  locationPlaceholder: string
  locationRequired: boolean
  budgetLabel: string
  budgetPlaceholder: string
  budgetRequired: boolean
  moveInStartLabel: string
  moveInEndLabel: string
  moveInStartRequired: boolean
  moveInEndRequired: boolean
  photosRecommended: boolean
  photosHint: string
  titlePlaceholder: string
  bodyPlaceholder: string
}

const FORM_CONFIG: Record<RoommateLookingFor, RoommateFormConfig> = {
  'has-room': {
    locationLabel: '현재 동네 / 위치',
    locationPlaceholder: '예: Brooklyn Bushwick',
    locationRequired: true,
    budgetLabel: '룸메 월세 ($)',
    budgetPlaceholder: '예: 1400',
    budgetRequired: true,
    moveInStartLabel: '입주 가능일',
    moveInEndLabel: '이사 나가는 날',
    moveInStartRequired: true,
    moveInEndRequired: false,
    photosRecommended: true,
    photosHint: '방·집 사진 권장 · 여러 장 한 번에 선택 · 첫 장이 대표',
    titlePlaceholder: '예: Bushwick 2bed 룸메이트 구해요',
    bodyPlaceholder:
      '방 구조, 생활 패턴, 유틸·보증금, 선호하는 룸메 스타일을 적어 주세요.',
  },
  together: {
    locationLabel: '희망 동네',
    locationPlaceholder: '예: Queens Astoria / Brooklyn',
    locationRequired: false,
    budgetLabel: '월 예산 상한 ($)',
    budgetPlaceholder: '예: 1600',
    budgetRequired: true,
    moveInStartLabel: '입주 희망일',
    moveInEndLabel: '이사 나가는 날',
    moveInStartRequired: true,
    moveInEndRequired: false,
    photosRecommended: false,
    photosHint: '참고 사진이 있으면 올려 주세요 · 여러 장 한 번에 선택 가능',
    titlePlaceholder: '예: 9월 입주, Astoria 같이 구해요',
    bodyPlaceholder:
      '예산, 희망 동네, 생활 패턴, 같이 구하고 싶은 조건을 적어 주세요.',
  },
  room: {
    locationLabel: '희망 동네',
    locationPlaceholder: '예: Manhattan UES / Jersey City',
    locationRequired: false,
    budgetLabel: '월 예산 상한 ($)',
    budgetPlaceholder: '예: 1800',
    budgetRequired: true,
    moveInStartLabel: '입주 희망일',
    moveInEndLabel: '이사 나가는 날',
    moveInStartRequired: true,
    moveInEndRequired: false,
    photosRecommended: false,
    photosHint: '참고 사진이 있으면 올려 주세요 · 여러 장 한 번에 선택 가능',
    titlePlaceholder: '예: Midtown 근처 방 구해요',
    bodyPlaceholder: '예산, 희망 위치, 입주 시기, 필요한 조건을 적어 주세요.',
  },
  sublet: {
    locationLabel: '서블렛 위치',
    locationPlaceholder: '예: Upper East Side',
    locationRequired: true,
    budgetLabel: '월세 ($)',
    budgetPlaceholder: '예: 2200',
    budgetRequired: true,
    moveInStartLabel: '서블렛 시작일',
    moveInEndLabel: '서블렛 종료일',
    moveInStartRequired: true,
    moveInEndRequired: true,
    photosRecommended: true,
    photosHint: '방·집 사진 권장 · 여러 장 한 번에 선택 · 첫 장이 대표',
    titlePlaceholder: '예: UES 스튜디오 9~11월 서블렛',
    bodyPlaceholder:
      '기간, 가구 포함 여부, 교통, 유틸·보증금, 연락 방법을 적어 주세요.',
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

export function getRoommateLookingForLabel(
  value: RoommateLookingFor | null | undefined,
) {
  return (
    ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === value)?.label ?? ''
  )
}

export function getRoommateLookingForShortLabel(
  value: RoommateLookingFor | null | undefined,
) {
  return (
    ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === value)
      ?.shortLabel ?? ''
  )
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
): RoommateFormConfig | null {
  if (!lookingFor || !(lookingFor in FORM_CONFIG)) return null
  return FORM_CONFIG[lookingFor]
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
