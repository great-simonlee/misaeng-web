import type {
  HousingCreditOffer,
  HousingPerkId,
  HousingPost,
  HousingRoommateAffiliation,
  HousingRoommateComposition,
  HousingRoommateGender,
  HousingRoommateProfile,
  HousingRoommateRoomPreference,
  HousingRoommateWaiting,
  HousingRoomOption,
  HousingRoomType,
  HousingUnitType,
} from '@/types/nyc'

export const HOUSING_UNIT_TYPES: {
  id: HousingUnitType
  label: string
}[] = [
  { id: 'studio', label: 'Studio' },
  { id: '1b1b', label: '1B1B' },
  { id: '2b1b', label: '2B1B' },
  { id: '2b2b', label: '2B2B' },
  { id: '3b1b', label: '3B1B' },
  { id: '3b2b', label: '3B2B' },
  { id: '4-plus', label: '4+ Bedrooms' },
]

/** 룸(침실) 타입 — 유닛 타입과 완전 독립 */
export const HOUSING_ROOM_TYPES: {
  id: HousingRoomType
  label: string
}[] = [
  { id: 'master-w-bath', label: 'Master w/ Bath' },
  { id: 'regular-bedroom', label: 'Regular' },
  { id: 'flexroom', label: 'Flexroom' },
]

/** NYC 지역 필터 (표시 순서) */
export const HOUSING_NEIGHBORHOODS = [
  'Manhattan',
  'Upper West Side',
  'Upper East Side',
  'Morningside Heights',
  'Harlem',
  'Midtown',
  'Flatiron',
  'Chelsea',
  'East Village',
  'West Village',
  'Lower East Side',
  'Financial District',
  'Brooklyn',
  'Brooklyn Heights',
  'Williamsburg',
  'Park Slope',
  'Bushwick',
  'Downtown Brooklyn',
  'Queens',
  'Astoria',
  'Long Island City',
  'Flushing',
  'Bronx',
  'Staten Island',
] as const

export type HousingNeighborhood = (typeof HOUSING_NEIGHBORHOODS)[number]

export const HOUSING_PERKS: {
  id: HousingPerkId
  label: string
}[] = [
  { id: 'roommate-waiting', label: '룸메이트 대기중' },
  { id: 'no-broker-fee', label: '중개비 무료' },
  { id: 'no-guarantor', label: '게런터 무료' },
  { id: 'free-credit', label: '무료 크레딧' },
  { id: 'doorman-24h', label: '24h 도어맨' },
  { id: 'washer-dryer', label: '세탁기/건조기' },
  { id: 'terrace', label: '테라스' },
  { id: 'gym', label: '헬스장' },
  { id: 'pool', label: '수영장' },
  { id: 'wall-ok', label: '플렉스 벽 가능' },
  { id: 'package-storage', label: '택배 보관' },
  { id: 'mail-room', label: '메일 룸' },
  { id: 'rooftop', label: '루프탑' },
  { id: 'bbq-grill', label: '바베큐 그릴' },
  { id: 'work-study', label: '업무 및 공부 공간' },
  { id: 'sauna', label: '사우나' },
]

/** 필터 시트 · 혜택 */
export const HOUSING_BENEFIT_PERKS: HousingPerkId[] = [
  'roommate-waiting',
  'no-broker-fee',
  'no-guarantor',
  'free-credit',
]

/** 필터 시트 · 어메니티 */
export const HOUSING_AMENITY_PERKS: HousingPerkId[] = HOUSING_PERKS.map(
  (p) => p.id,
).filter((id) => !HOUSING_BENEFIT_PERKS.includes(id))

/** 목록 카드 사진 위에 노출하는 혜택 배지 (무료 크레딧은 creditOffer로 별도 표시) */
export const HOUSING_CARD_BADGE_PERKS: HousingPerkId[] = [
  'no-broker-fee',
  'no-guarantor',
]

/** 월세 필터 — 전체 유닛 vs 개인 방 */
export type HousingListingKind = 'unit' | 'room'

export const HOUSING_LISTING_KINDS: {
  id: HousingListingKind
  label: string
  description: string
}[] = [
  { id: 'unit', label: '전체 유닛', description: '아파트 전체를 찾아요' },
  { id: 'room', label: '개인 방', description: '룸 하나만 찾아요' },
]

export const HOUSING_PRICE_STEP = 100

export const HOUSING_UNIT_PRICE = {
  min: 1000,
  max: 8000,
} as const

export const HOUSING_ROOM_PRICE = {
  min: 1000,
  max: 3000,
} as const

export const HOUSING_UNIT_PRICE_PRESETS = [
  { id: 'unit-3500', label: '$3,500 이하', min: HOUSING_UNIT_PRICE.min, max: 3500 },
  { id: 'unit-5000', label: '$5,000 이하', min: HOUSING_UNIT_PRICE.min, max: 5000 },
  { id: 'unit-4000plus', label: '$4,000+', min: 4000, max: HOUSING_UNIT_PRICE.max },
] as const

export const HOUSING_ROOM_PRICE_PRESETS = [
  { id: 'room-1500', label: '$1,500 이하', min: HOUSING_ROOM_PRICE.min, max: 1500 },
  { id: 'room-2000', label: '$2,000 이하', min: HOUSING_ROOM_PRICE.min, max: 2000 },
  { id: 'room-2500', label: '$2,500 이하', min: HOUSING_ROOM_PRICE.min, max: 2500 },
] as const

export function getHousingPriceBounds(kind: HousingListingKind) {
  return kind === 'unit' ? HOUSING_UNIT_PRICE : HOUSING_ROOM_PRICE
}

export function getHousingPricePresets(kind: HousingListingKind) {
  return kind === 'unit' ? HOUSING_UNIT_PRICE_PRESETS : HOUSING_ROOM_PRICE_PRESETS
}

const UNIT_TYPE_IDS = new Set<string>(HOUSING_UNIT_TYPES.map((t) => t.id))
const ROOM_TYPE_IDS = new Set<string>(HOUSING_ROOM_TYPES.map((t) => t.id))
const PERK_IDS = new Set<string>(HOUSING_PERKS.map((t) => t.id))

/** 레거시 perk → free-credit 로 통합 */
const LEGACY_FREE_CREDIT_PERKS = new Set(['one-month-free', 'credit-1500'])

export function isHousingUnitType(value: string): value is HousingUnitType {
  return UNIT_TYPE_IDS.has(value)
}

export function isHousingRoomType(value: string): value is HousingRoomType {
  return ROOM_TYPE_IDS.has(value)
}

export function isHousingPerkId(value: string): value is HousingPerkId {
  return PERK_IDS.has(value)
}

export function getHousingUnitTypeLabel(unitType: HousingUnitType): string {
  return (
    HOUSING_UNIT_TYPES.find((item) => item.id === unitType)?.label ?? unitType
  )
}

export function getHousingRoomTypeLabel(roomType: HousingRoomType): string {
  return (
    HOUSING_ROOM_TYPES.find((item) => item.id === roomType)?.label ?? roomType
  )
}

export function getHousingRoomOptionLabel(option: HousingRoomOption): string {
  if (option.roomType) return getHousingRoomTypeLabel(option.roomType)
  return '유닛 전체'
}

export function getHousingListingTypeLabel(post: {
  unitType: HousingUnitType | null
}): string {
  if (post.unitType) return getHousingUnitTypeLabel(post.unitType)
  return '타입 미정'
}

export function getHousingPerkLabel(perkId: HousingPerkId): string {
  return HOUSING_PERKS.find((item) => item.id === perkId)?.label ?? perkId
}

export function getHousingMinRent(post: HousingPost): number {
  if (post.roomOptions.length === 0) return 0
  return Math.min(...post.roomOptions.map((option) => option.rent))
}

/** 룸 옵션 월세 합산 (레거시·검증용) */
export function getHousingRoomRentSum(post: HousingPost): number {
  if (post.roomOptions.length === 0) return 0
  return post.roomOptions.reduce((sum, option) => sum + option.rent, 0)
}

/** 카드에 표시하는 전체 유닛 월세 */
export function getHousingUnitRent(post: HousingPost): number {
  if (Number.isFinite(post.unitRent) && post.unitRent > 0) {
    return post.unitRent
  }
  return getHousingRoomRentSum(post)
}

export function isHousingPriceFilterActive(
  kind: HousingListingKind | 'all',
  min: number,
  max: number,
): boolean {
  if (kind === 'all') return false
  const bounds = getHousingPriceBounds(kind)
  return min > bounds.min || max < bounds.max
}

export function housingMatchesPrice(
  post: HousingPost,
  kind: HousingListingKind | 'all',
  min: number,
  max: number,
  roomType?: HousingRoomType | 'all',
): boolean {
  if (!isHousingPriceFilterActive(kind, min, max)) return true
  if (kind === 'unit') {
    const rent = getHousingUnitRent(post)
    return rent >= min && rent <= max
  }
  const options =
    roomType && roomType !== 'all'
      ? post.roomOptions.filter((option) => option.roomType === roomType)
      : post.roomOptions
  if (options.length === 0) return false
  return options.some((option) => option.rent >= min && option.rent <= max)
}

export function formatHousingPriceFilterLabel(
  kind: HousingListingKind | 'all',
  min: number,
  max: number,
): string {
  if (kind === 'all' || !isHousingPriceFilterActive(kind, min, max)) return ''
  const bounds = getHousingPriceBounds(kind)
  if (min <= bounds.min) return `$${max.toLocaleString()} 이하`
  if (max >= bounds.max) return `$${min.toLocaleString()}+`
  return `$${min.toLocaleString()} – $${max.toLocaleString()}`
}

export function getHousingPricePresetId(
  kind: HousingListingKind | 'all',
  min: number,
  max: number,
): string | null {
  if (kind === 'all') return null
  const preset = getHousingPricePresets(kind).find(
    (item) => item.min === min && item.max === max,
  )
  return preset?.id ?? null
}

export function getHousingEarliestAvailable(post: HousingPost): string {
  const dates = post.roomOptions
    .map((option) => option.availableFrom)
    .filter(Boolean)
    .sort()
  return dates[0] ?? ''
}

/** 가장 빠른 입주 시작일을 가진 룸 옵션 */
export function getHousingEarliestAvailableOption(
  post: HousingPost,
): HousingRoomOption | null {
  if (post.roomOptions.length === 0) return null
  return [...post.roomOptions].sort((a, b) =>
    a.availableFrom.localeCompare(b.availableFrom),
  )[0] ?? null
}

/** YYYY-MM-DD → M/D (앞에 0 없음) */
export function formatHousingDateShort(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${Number(match[2])}/${Number(match[3])}`
  return trimmed
}

/** 입주 기간 표시 — 예: 9/28 ~ 10/27 */
export function formatHousingAvailableRange(
  from: string,
  to?: string | null,
): string {
  const start = formatHousingDateShort(from)
  if (!start) return ''
  const end = formatHousingDateShort(to ?? '')
  if (!end) return start
  return `${start} ~ ${end}`
}

/** @deprecated formatHousingAvailableRange 사용 권장 */
export function formatHousingAvailableFrom(value: string): string {
  return formatHousingDateShort(value)
}

export function housingHasRoommateWaiting(post: HousingPost): boolean {
  return (
    (post.roommateWaiting?.profiles.length ?? 0) > 0 ||
    post.perks.includes('roommate-waiting') ||
    post.roomOptions.some((option) => option.roommateWaiting)
  )
}

export const HOUSING_ROOMMATE_ROOM_PREFERENCES: {
  id: HousingRoommateRoomPreference
  label: string
}[] = [
  { id: 'master-w-bath', label: '마스터 희망' },
  { id: 'regular-bedroom', label: '레귤러 희망' },
  { id: 'flexroom', label: '플렉스 희망' },
  { id: 'any', label: '모두 가능' },
]

export function getHousingRoommateRoomPreferenceLabel(
  id: HousingRoommateRoomPreference,
): string {
  return (
    HOUSING_ROOMMATE_ROOM_PREFERENCES.find((item) => item.id === id)?.label ??
    id
  )
}

export function parseHousingRoommateRoomPreferences(
  value: unknown,
): HousingRoommateRoomPreference[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(
    HOUSING_ROOMMATE_ROOM_PREFERENCES.map((item) => item.id),
  )
  const seen = new Set<HousingRoommateRoomPreference>()
  for (const item of value) {
    const id = String(item) as HousingRoommateRoomPreference
    if (allowed.has(id)) seen.add(id)
  }
  return HOUSING_ROOMMATE_ROOM_PREFERENCES.map((item) => item.id).filter(
    (id) => seen.has(id),
  )
}

export function getHousingRoommateComposition(
  waiting: HousingRoommateWaiting | null | undefined,
): HousingRoommateComposition {
  const profiles = waiting?.profiles ?? []
  return {
    male: profiles.filter((profile) => profile.gender === 'male').length,
    female: profiles.filter((profile) => profile.gender === 'female').length,
  }
}

export function parseHousingRoommateAffiliation(
  value: unknown,
): HousingRoommateAffiliation {
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>
    if (raw.kind === 'student') {
      const school = String(raw.school ?? '').trim()
      if (school) return { kind: 'student', school }
    }
    if (raw.kind === 'professional') return { kind: 'professional' }
  }
  return { kind: 'professional' }
}

export function getHousingRoommateAffiliationLabel(
  affiliation: HousingRoommateAffiliation,
): string {
  if (affiliation.kind === 'student') return affiliation.school
  return '직장인'
}

export function parseHousingRoommateWaiting(
  value: unknown,
  fallbackOptions?: HousingRoomOption[],
): HousingRoommateWaiting | null {
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>

    // 신규: profiles[]
    if (Array.isArray(raw.profiles)) {
      const profiles: HousingRoommateProfile[] = []
      raw.profiles.forEach((item, index) => {
        if (!item || typeof item !== 'object') return
        const row = item as Record<string, unknown>
        const genderRaw = String(row.gender ?? '')
        const gender: HousingRoommateGender | null =
          genderRaw === 'male' || genderRaw === 'female' ? genderRaw : null
        if (!gender) return
        const preferredRoomTypes = parseHousingRoommateRoomPreferences(
          row.preferredRoomTypes,
        )
        profiles.push({
          id: String(row.id ?? `roommate-${index}`),
          gender,
          affiliation: parseHousingRoommateAffiliation(row.affiliation),
          preferredRoomTypes:
            preferredRoomTypes.length > 0 ? preferredRoomTypes : ['any'],
          intro:
            typeof row.intro === 'string' && row.intro.trim()
              ? row.intro.trim()
              : '',
        })
      })
      if (profiles.length > 0) return { profiles }
    }

    // 레거시: composition + intro 단일 블록 → 프로필로 분해
    const composition = parseHousingRoommateComposition(raw.composition)
    const preferredRoomTypes = parseHousingRoommateRoomPreferences(
      raw.preferredRoomTypes,
    )
    const intro =
      typeof raw.intro === 'string' && raw.intro.trim() ? raw.intro.trim() : ''
    if (composition && (composition.male > 0 || composition.female > 0)) {
      const profiles: HousingRoommateProfile[] = []
      for (let i = 0; i < composition.male; i += 1) {
        profiles.push({
          id: `legacy-male-${i}`,
          gender: 'male',
          affiliation: { kind: 'professional' },
          preferredRoomTypes:
            preferredRoomTypes.length > 0 ? preferredRoomTypes : ['any'],
          intro: i === 0 ? intro : '',
        })
      }
      for (let i = 0; i < composition.female; i += 1) {
        profiles.push({
          id: `legacy-female-${i}`,
          gender: 'female',
          affiliation: { kind: 'professional' },
          preferredRoomTypes:
            preferredRoomTypes.length > 0 ? preferredRoomTypes : ['any'],
          intro: composition.male === 0 && i === 0 ? intro : '',
        })
      }
      if (profiles.length > 0) return { profiles }
    }
  }

  // 레거시: roomOptions 기반
  if (!fallbackOptions?.length) return null
  const waiting = fallbackOptions.filter((option) => option.roommateWaiting)
  if (waiting.length === 0) return null

  const profiles: HousingRoommateProfile[] = []
  waiting.forEach((option, optionIndex) => {
    const composition = option.roommateComposition ?? { male: 0, female: 0 }
    const pref: HousingRoommateRoomPreference[] =
      option.roomType === 'master-w-bath'
        ? ['master-w-bath']
        : option.roomType === 'regular-bedroom'
          ? ['regular-bedroom']
          : option.roomType === 'flexroom'
            ? ['flexroom']
            : ['any']
    const intro = option.roommateIntro?.trim() ?? ''
    for (let i = 0; i < composition.male; i += 1) {
      profiles.push({
        id: `${option.id}-male-${i}`,
        gender: 'male',
        affiliation: { kind: 'professional' },
        preferredRoomTypes: pref,
        intro: i === 0 ? intro : '',
      })
    }
    for (let i = 0; i < composition.female; i += 1) {
      profiles.push({
        id: `${option.id}-female-${i}`,
        gender: 'female',
        affiliation: { kind: 'professional' },
        preferredRoomTypes: pref,
        intro: composition.male === 0 && i === 0 ? intro : '',
      })
    }
    if (composition.male === 0 && composition.female === 0) {
      profiles.push({
        id: `${option.id}-unknown-${optionIndex}`,
        gender: 'male',
        affiliation: { kind: 'professional' },
        preferredRoomTypes: pref,
        intro,
      })
    }
  })

  return profiles.length > 0 ? { profiles } : null
}

export function housingMatchesRoomType(
  post: HousingPost,
  roomType: HousingRoomType,
): boolean {
  return post.roomOptions.some((option) => option.roomType === roomType)
}

export function housingMatchesPerk(
  post: HousingPost,
  perk: HousingPerkId,
): boolean {
  if (perk === 'roommate-waiting') return housingHasRoommateWaiting(post)
  return post.perks.includes(perk)
}

export function sortHousingRoomOptions(
  options: HousingRoomOption[],
): HousingRoomOption[] {
  const order = new Map(HOUSING_ROOM_TYPES.map((item, index) => [item.id, index]))
  return [...options].sort((a, b) => {
    const ai = a.roomType == null ? -1 : (order.get(a.roomType) ?? 99)
    const bi = b.roomType == null ? -1 : (order.get(b.roomType) ?? 99)
    if (ai !== bi) return ai - bi
    return a.rent - b.rent
  })
}

export function formatHousingCreditOfferLabel(
  offer: HousingCreditOffer,
): string {
  if (offer.kind === 'months-free') return `${offer.months}개월 무료`
  return `$${offer.amount.toLocaleString()} 크레딧`
}

export function formatHousingRoommateCompositionLabel(
  composition: HousingRoommateComposition,
): string {
  const parts: string[] = []
  if (composition.male > 0) parts.push(`남${composition.male}`)
  if (composition.female > 0) parts.push(`여${composition.female}`)
  return parts.join(' ')
}

export function parseHousingRoommateComposition(
  value: unknown,
): HousingRoommateComposition | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const male = Number(raw.male ?? 0)
  const female = Number(raw.female ?? 0)
  if (
    !Number.isFinite(male) ||
    !Number.isFinite(female) ||
    male < 0 ||
    female < 0 ||
    (male === 0 && female === 0)
  ) {
    return null
  }
  return { male, female }
}

export function parseHousingCreditOffer(
  value: unknown,
): HousingCreditOffer | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const kind = String(raw.kind ?? '')
  if (kind === 'months-free') {
    const months = Number(raw.months)
    if (Number.isFinite(months) && months > 0) {
      return { kind: 'months-free', months }
    }
  }
  if (kind === 'dollar-credit') {
    const amount = Number(raw.amount)
    if (Number.isFinite(amount) && amount > 0) {
      return { kind: 'dollar-credit', amount }
    }
  }
  return null
}

export function parseHousingPerks(value: unknown): HousingPerkId[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<HousingPerkId>()
  for (const item of value) {
    const id = String(item)
    if (isHousingPerkId(id)) seen.add(id)
    else if (LEGACY_FREE_CREDIT_PERKS.has(id)) seen.add('free-credit')
  }
  return HOUSING_PERKS.map((p) => p.id).filter((id) => seen.has(id))
}

export function parseHousingRoomOptions(
  value: unknown,
  legacy?: {
    rent?: number
    roomType?: string
    availableFrom?: string
    roommateComposition?: unknown
    perks?: HousingPerkId[]
  },
): HousingRoomOption[] {
  if (Array.isArray(value) && value.length > 0) {
    const options: HousingRoomOption[] = []
    value.forEach((item, index) => {
      if (!item || typeof item !== 'object') return
      const raw = item as Record<string, unknown>
      const roomRaw = String(raw.roomType ?? '')
      const roomType = isHousingRoomType(roomRaw) ? roomRaw : null
      const rent = Number(raw.rent ?? 0)
      if (!Number.isFinite(rent) || rent < 0) return
      const roommateWaiting = Boolean(raw.roommateWaiting)
      const introRaw = raw.roommateIntro
      const roommateIntro =
        roommateWaiting && typeof introRaw === 'string' && introRaw.trim()
          ? introRaw.trim()
          : null
      options.push({
        id: String(raw.id ?? `option-${index}`),
        roomType,
        rent,
        availableFrom: String(raw.availableFrom ?? ''),
        availableTo: String(raw.availableTo ?? ''),
        roommateWaiting,
        roommateComposition: parseHousingRoommateComposition(
          raw.roommateComposition,
        ),
        roommateIntro,
      })
    })
    if (options.length > 0) return sortHousingRoomOptions(options)
  }

  // 레거시 단일 rent/roomType
  const rent = Number(legacy?.rent ?? 0)
  const roomRaw = String(legacy?.roomType ?? '')
  const roomType = isHousingRoomType(roomRaw) ? roomRaw : null
  const waiting = Boolean(legacy?.perks?.includes('roommate-waiting'))
  return [
    {
      id: 'legacy-option',
      roomType,
      rent: Number.isFinite(rent) ? rent : 0,
      availableFrom: String(legacy?.availableFrom ?? ''),
      availableTo: '',
      roommateWaiting: waiting,
      roommateComposition: parseHousingRoommateComposition(
        legacy?.roommateComposition,
      ),
      roommateIntro: null,
    },
  ]
}

/** bedrooms 숫자에서 대략적인 유닛 타입 추론 */
export function inferHousingUnitType(bedrooms: number): HousingUnitType {
  if (bedrooms <= 0) return 'studio'
  if (bedrooms === 1) return '1b1b'
  if (bedrooms === 2) return '2b1b'
  if (bedrooms === 3) return '3b1b'
  return '4-plus'
}

/** @deprecated inferHousingUnitType 사용 */
export function inferHousingRoomType(bedrooms: number): HousingUnitType {
  return inferHousingUnitType(bedrooms)
}

const now = Date.now()

/** 매물 사진 최대 장수 */
export const HOUSING_MAX_IMAGES = 14

/** UI 테스트용 인테리어 사진 풀 */
export const MOCK_HOUSING_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
  'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&q=80',
  'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=1200&q=80',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80',
  'https://images.unsplash.com/photo-1560448075-bb485b067938?w=1200&q=80',
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cd00?w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
  'https://images.unsplash.com/photo-1600573472591-ee6981cf4216?w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&q=80',
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=80',
]

/** 매물별 서로 다른 장수·구성 (하이드레이션 안정용 결정적 선택) */
export function pickMockHousingImages(seed: number): string[] {
  const pool = MOCK_HOUSING_IMAGES
  const counts = [3, 7, 1, 5, 14, 2, 9, 4, 11, 6]
  const count = Math.min(
    HOUSING_MAX_IMAGES,
    Math.max(1, counts[seed % counts.length] ?? 3),
  )

  // 시드 기반 셔플 후 앞에서 count장
  const order = pool.map((_, index) => index)
  let state = (seed + 1) * 2654435761
  for (let i = order.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    const tmp = order[i]!
    order[i] = order[j]!
    order[j] = tmp
  }

  return order.slice(0, count).map((index) => pool[index]!)
}

/** UI 개발용 하우징 mock 매물 (유닛 + 룸 옵션) */
export const MOCK_HOUSING_POSTS: HousingPost[] = [
  {
    id: 'mock-housing-1',
    title: '2950 Broadway',
    description:
      'Morningside Heights 캠퍼스 도보 8분. 마스터·레귤러 룸 옵션. 세탁기·건조기 건물 내 구비.',
    neighborhood: 'Morningside Heights',
    bedrooms: 2,
    unitType: '2b1b',
    unitRent: 3400,
    roomOptions: [
      {
        id: 'm1-master',
        roomType: 'master-w-bath',
        rent: 1850,
        availableFrom: '2026-09-28',
        availableTo: '2026-10-27',
        roommateWaiting: true,
        roommateComposition: { male: 1, female: 0 },
        roommateIntro:
          '마스터 룸을 쓰고 있는 직장인이에요. 주중엔 재택이 많고, 조용히 지내는 편입니다.',
      },
      {
        id: 'm1-regular',
        roomType: 'regular-bedroom',
        rent: 1550,
        availableFrom: '2026-09-28',
        availableTo: '2026-10-27',
        roommateWaiting: true,
        roommateComposition: { male: 0, female: 1 },
        roommateIntro:
          '레귤러 룸 쪽 여학생이에요. 주중엔 캠퍼스, 주말엔 가끔 브런치 나가요. 반려동물은 없어요.',
      },
    ],
    perks: [
      'no-broker-fee',
      'no-guarantor',
      'free-credit',
      'washer-dryer',
      'work-study',
      'package-storage',
    ],
    creditOffer: { kind: 'months-free', months: 1 },
    roommateWaiting: {
      profiles: [
        {
          id: 'm1-rm-male',
          gender: 'male',
          affiliation: { kind: 'professional' },
          preferredRoomTypes: ['master-w-bath'],
          intro:
            '마스터 룸을 쓰고 있는 직장인이에요. 주중엔 재택이 많고, 조용히 지내는 편입니다.',
        },
        {
          id: 'm1-rm-female',
          gender: 'female',
          affiliation: { kind: 'student', school: 'NYU' },
          preferredRoomTypes: ['regular-bedroom'],
          intro:
            '레귤러 룸 쪽 여학생이에요. 주중엔 캠퍼스, 주말엔 가끔 브런치 나가요. 반려동물은 없어요.',
        },
      ],
    },
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(0),
    /** 실제 매물 투어 영상 URL로 교체 */
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 5,
    updatedAt: now - 1000 * 60 * 60 * 5,
    status: 'open',
  },
  {
    id: 'mock-housing-2',
    title: '31-15 Ditmars Blvd',
    description:
      'Queens Astoria 중심. N/W 역 도보 6분. 레귤러·플렉스 옵션. 가구 일부 포함.',
    neighborhood: 'Astoria',
    bedrooms: 2,
    unitType: '2b1b',
    unitRent: 2600,
    roomOptions: [
      {
        id: 'm2-regular',
        roomType: 'regular-bedroom',
        rent: 1400,
        availableFrom: '2026-08-20',
        availableTo: '2026-09-18',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm2-flex',
        roomType: 'flexroom',
        rent: 1200,
        availableFrom: '2026-08-20',
        availableTo: '2026-09-18',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: ['no-broker-fee', 'gym'],
    creditOffer: null,
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(1),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 20,
    updatedAt: now - 1000 * 60 * 60 * 20,
    status: 'open',
  },
  {
    id: 'mock-housing-3',
    title: '188 Avenue A',
    description:
      'L 라인 인근, 주방 리모델링 완료. Regular / Flexroom 가격이 다릅니다.',
    neighborhood: 'East Village',
    bedrooms: 1,
    unitType: '1b1b',
    unitRent: 2700,
    roomOptions: [
      {
        id: 'm3-regular',
        roomType: 'regular-bedroom',
        rent: 1450,
        availableFrom: '2026-09-15',
        availableTo: '2026-10-14',
        roommateWaiting: true,
        roommateComposition: { male: 1, female: 0 },
        roommateIntro: 'East Village에서 일하는 직장인입니다. 저녁 늦게 들어오는 편이라 낮 시간대는 조용해요.',
      },
      {
        id: 'm3-flex',
        roomType: 'flexroom',
        rent: 1250,
        availableFrom: '2026-09-15',
        availableTo: '2026-10-14',
        roommateWaiting: true,
        roommateComposition: { male: 2, female: 0 },
        roommateIntro: '룸메 두 명과 이미 살고 있어요. 모두 남성·비흡연이고, 공용 공간 정리 규칙을 지켜요.',
      },
    ],
    perks: ['no-guarantor', 'free-credit', 'terrace', 'wall-ok'],
    creditOffer: { kind: 'dollar-credit', amount: 1500 },
    roommateWaiting: {
      profiles: [
        {
          id: 'm3-rm-male',
          gender: 'male',
          affiliation: { kind: 'professional' },
          preferredRoomTypes: ['regular-bedroom', 'flexroom'],
          intro:
            'East Village에서 일하는 직장인입니다. 저녁 늦게 들어오는 편이라 낮 시간대는 조용해요.',
        },
      ],
    },
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(2),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 36,
    updatedAt: now - 1000 * 60 * 60 * 36,
    status: 'open',
  },
  {
    id: 'mock-housing-4',
    title: '75 Pierrepont St',
    description:
      '프로메나드 인근 스튜디오. 맨해튼 스카이라인 전망, 엘리베이터·세탁실 완비.',
    neighborhood: 'Brooklyn Heights',
    bedrooms: 0,
    unitType: 'studio',
    unitRent: 2800,
    roomOptions: [
      {
        id: 'm4-unit',
        roomType: null,
        rent: 2800,
        availableFrom: '2026-10-01',
        availableTo: '2026-10-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: [
      'no-broker-fee',
      'no-guarantor',
      'free-credit',
      'washer-dryer',
      'gym',
    ],
    creditOffer: { kind: 'months-free', months: 2 },
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(3),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 48,
    updatedAt: now - 1000 * 60 * 60 * 48,
    status: 'open',
  },
  {
    id: 'mock-housing-5',
    title: '11 W 19th St',
    description:
      'Flatiron 근처 1베드. Regular / Flex 선택 가능. 와이파이·청소 서비스 포함.',
    neighborhood: 'Flatiron',
    bedrooms: 1,
    unitType: '1b1b',
    unitRent: 5400,
    roomOptions: [
      {
        id: 'm5-regular',
        roomType: 'regular-bedroom',
        rent: 2950,
        availableFrom: '2026-08-25',
        availableTo: '2026-09-23',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm5-flex',
        roomType: 'flexroom',
        rent: 2450,
        availableFrom: '2026-08-25',
        availableTo: '2026-09-23',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: ['no-broker-fee', 'pool', 'gym'],
    creditOffer: null,
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(4),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 72,
    updatedAt: now - 1000 * 60 * 60 * 72,
    status: 'open',
  },
  {
    id: 'mock-housing-6',
    title: '250 N 10th St',
    description:
      'Bedford L 역 도보 5분. Master / Regular / Flex 룸별 가격. 루프탑 BBQ·공용 라운지.',
    neighborhood: 'Williamsburg',
    bedrooms: 2,
    unitType: '2b1b',
    unitRent: 5400,
    roomOptions: [
      {
        id: 'm6-master',
        roomType: 'master-w-bath',
        rent: 2100,
        availableFrom: '2026-09-10',
        availableTo: '2026-10-09',
        roommateWaiting: true,
        roommateComposition: { male: 1, female: 1 },
        roommateIntro: 'Williamsburg 직장인입니다. 루프탑·BBQ는 가끔 친구 초대해요. 주중엔 재택이 많아요.',
      },
      {
        id: 'm6-regular',
        roomType: 'regular-bedroom',
        rent: 1800,
        availableFrom: '2026-09-10',
        availableTo: '2026-10-09',
        roommateWaiting: true,
        roommateComposition: { male: 1, female: 2 },
        roommateIntro: '디자인 전공 학생이에요. 주말 외출이 많고, 조용한 룸메를 찾고 있어요.',
      },
      {
        id: 'm6-flex',
        roomType: 'flexroom',
        rent: 1500,
        availableFrom: '2026-09-20',
        availableTo: '2026-10-19',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: ['washer-dryer', 'terrace', 'rooftop', 'bbq-grill'],
    creditOffer: null,
    roommateWaiting: {
      profiles: [
        {
          id: 'm6-rm-male',
          gender: 'male',
          affiliation: { kind: 'professional' },
          preferredRoomTypes: ['master-w-bath'],
          intro:
            'Williamsburg 직장인입니다. 루프탑·BBQ는 가끔 친구 초대해요. 주중엔 재택이 많아요.',
        },
        {
          id: 'm6-rm-female',
          gender: 'female',
          affiliation: { kind: 'student', school: 'SVA' },
          preferredRoomTypes: ['regular-bedroom', 'any'],
          intro:
            '디자인 전공 학생이에요. 주말 외출이 많고, 조용한 룸메를 찾고 있어요.',
        },
      ],
    },
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(5),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 96,
    updatedAt: now - 1000 * 60 * 60 * 96,
    status: 'open',
  },
  {
    id: 'mock-housing-7',
    title: '245 W 75th St',
    description:
      'Central Park 인근 2베드 2배스. Master / Regular / Flex 각각 다른 월세.',
    neighborhood: 'Upper West Side',
    bedrooms: 2,
    unitType: '2b2b',
    unitRent: 6250,
    roomOptions: [
      {
        id: 'm7-master',
        roomType: 'master-w-bath',
        rent: 2400,
        availableFrom: '2026-09-01',
        availableTo: '2026-09-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm7-regular',
        roomType: 'regular-bedroom',
        rent: 2100,
        availableFrom: '2026-09-01',
        availableTo: '2026-09-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm7-flex',
        roomType: 'flexroom',
        rent: 1750,
        availableFrom: '2026-09-15',
        availableTo: '2026-10-14',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: [
      'no-broker-fee',
      'no-guarantor',
      'free-credit',
      'gym',
      'pool',
      'doorman-24h',
      'mail-room',
      'sauna',
    ],
    creditOffer: { kind: 'dollar-credit', amount: 2000 },
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(6),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 110,
    updatedAt: now - 1000 * 60 * 60 * 110,
    status: 'open',
  },
  {
    id: 'mock-housing-8',
    title: '27-28 Thomson Ave',
    description:
      '7·E·M 환승 편리. Master / Regular 쉐어에 적합한 구조.',
    neighborhood: 'Long Island City',
    bedrooms: 3,
    unitType: '3b1b',
    unitRent: 3150,
    roomOptions: [
      {
        id: 'm8-master',
        roomType: 'master-w-bath',
        rent: 1700,
        availableFrom: '2026-10-01',
        availableTo: '2026-10-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm8-regular',
        roomType: 'regular-bedroom',
        rent: 1450,
        availableFrom: '2026-10-01',
        availableTo: '2026-10-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: ['no-guarantor', 'washer-dryer'],
    creditOffer: null,
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(7),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 130,
    updatedAt: now - 1000 * 60 * 60 * 130,
    status: 'open',
  },
  {
    id: 'mock-housing-9',
    title: '222 Berkeley Pl',
    description:
      'Prospect Park 도보권. Master / Regular / Flex. 조용한 주거 지역.',
    neighborhood: 'Park Slope',
    bedrooms: 3,
    unitType: '3b2b',
    unitRent: 5050,
    roomOptions: [
      {
        id: 'm9-master',
        roomType: 'master-w-bath',
        rent: 1950,
        availableFrom: '2026-09-20',
        availableTo: '2026-10-19',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm9-regular',
        roomType: 'regular-bedroom',
        rent: 1700,
        availableFrom: '2026-09-20',
        availableTo: '2026-10-19',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
      {
        id: 'm9-flex',
        roomType: 'flexroom',
        rent: 1400,
        availableFrom: '2026-10-01',
        availableTo: '2026-10-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: ['no-broker-fee', 'terrace', 'gym'],
    creditOffer: null,
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(8),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 150,
    updatedAt: now - 1000 * 60 * 60 * 150,
    status: 'open',
  },
  {
    id: 'mock-housing-10',
    title: '301 W 118th St',
    description:
      '침실 4개 이상 대형 유닛. 그룹 쉐어·가족 거주 가능. 2·3·B·C 라인 접근성 좋음.',
    neighborhood: 'Harlem',
    bedrooms: 4,
    unitType: '4-plus',
    unitRent: 5200,
    roomOptions: [
      {
        id: 'm10-unit',
        roomType: null,
        rent: 5200,
        availableFrom: '2026-11-01',
        availableTo: '2026-11-30',
        roommateWaiting: false,
        roommateComposition: null,
        roommateIntro: null,
      },
    ],
    perks: [
      'no-broker-fee',
      'no-guarantor',
      'free-credit',
      'washer-dryer',
      'pool',
    ],
    creditOffer: { kind: 'months-free', months: 1 },
    roommateWaiting: null,
    contactEmail: 'housing@misaeng.com',
    images: pickMockHousingImages(9),
    youtubeUrl: null,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: now - 1000 * 60 * 60 * 170,
    updatedAt: now - 1000 * 60 * 60 * 170,
    status: 'open',
  },
]

export function listMockHousingPosts(): HousingPost[] {
  return MOCK_HOUSING_POSTS.filter((post) => post.status === 'open')
}

export function getMockHousingPost(id: string): HousingPost | null {
  return MOCK_HOUSING_POSTS.find((post) => post.id === id) ?? null
}
