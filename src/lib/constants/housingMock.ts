import {
  formatHousingCreditOfferLabel,
  getListingCreditOffers,
  getListingDerivedPerks,
  getListingUnitRent,
  getListingUnitType,
  getPricedRooms,
} from '@lib/housing/listing'
import type {
  HousingListing,
  HousingPerkId,
  HousingRoomType,
  HousingRoommateAffiliation,
  HousingRoommateComposition,
  HousingRoommateRoomPreference,
  HousingRoommateWaiting,
  HousingUnitType,
} from '@/types/nyc'

export {
  formatHousingCreditOfferLabel,
  formatHousingDateShort,
  formatHousingAvailableDate,
  formatListingBedBath,
  formatPropertyAmenityFee,
  formatHousingPartWall,
  formatPropertyIncomeRequirements,
  findListingRoomByKey,
  getHousingRoomLabel,
  getHousingRoomTypeLabel,
  getListingArea,
  getListingCreditOffer,
  getListingCreditOffers,
  getListingDerivedPerks,
  getListingDisplayAddress,
  getListingImages,
  getListingStreetAddress,
  getListingUnitRent,
  getListingUnitNet,
  getHousingRoomNet,
  getListingUnitType,
  getListingAvailableDate,
  getListingYoutubeUrl,
  getPricedRooms,
  getRoomSelectionKey,
  housingHasRoommateWaiting,
  housingMatchesPerk,
  housingMatchesPrice,
  housingMatchesRoomType,
  inferHousingUnitType,
  listingHasOP,
  mapAmenityStringToPerkId,
  sortHousingRooms,
} from '@lib/housing/listing'

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

export const HOUSING_ROOM_TYPES: {
  id: HousingRoomType
  label: string
}[] = [
  { id: 'master-w-bath', label: 'Master w/ Bath' },
  { id: 'master-wo-bath', label: 'Master w/o Bath' },
  { id: 'regular-bedroom', label: 'Regular' },
  { id: 'flexroom', label: 'Flex' },
  { id: 'entire', label: '유닛 전체' },
  { id: 'studio', label: 'Studio' },
]

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
  { id: 'doorman-24h', label: '24시간 도어맨' },
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

export const HOUSING_UTILITY_LABELS: Record<string, string> = {
  heat: '난방 비용 포함',
  'hot water': '온수 비용 포함',
  gas: '가스 비용 포함',
  electricity: '전기 비용 포함',
  water: '수도 비용 포함',
  sewer: '하수 비용 포함',
}

export function formatHousingUtilityLabel(value: string): string | null {
  return HOUSING_UTILITY_LABELS[value.trim().toLowerCase()] ?? null
}

export const HOUSING_AMENITY_LABELS: Record<string, string> = {
  '24-hour attended lobby': '24시간 도어맨',
  'concierge service': '컨시어지',
  elevator: '엘리베이터',
  'fitness center': '헬스장',
  'mail room': '메일 룸',
  'laundry room': '세탁실',
  'resident lounge': '라운지',
  'rooftop outdoor space': '옥상 실외 공간',
  'rooftop lounge': '옥상 라운지',
  'pet friendly': '반려동물 가능',
  'garage parking': '주차장',
  sauna: '사우나',
  pool: '수영장',
  'swimming pool': '수영장',
  'indoor pool': '실내 수영장',
  'outdoor pool': '실외 수영장',
  'working space': '공부/업무 공간',
  'business meeting room': '미팅 룸',
  'pilates studio': '필라테스',
  'yoga studio': '요가 룸',
  'recovery room': '회복실',
  'indoor basketball court': '실내 농구장',
  'indoor pickleball court': '실내 피클볼',
  'indoor golf simulator': '스크린 골프',
  'bowling alley': '볼링장',
  'poker room': '포커 룸',
  'billiards room': '당구장',
  'arcade room': '게임 룸',
  'ping pong table': '탁구대',
  'tennis courts': '테니스 코트',
  'bbq grills': 'BBQ 그릴',
  'bbq grill': 'BBQ 그릴',
  sundeck: '실외 공간',
  'dog run': '강아지 산책',
  "children's playroom": '놀이방',
  'media room': '영화관',
  garden: '정원',
  'bike room': '자전거 보관',
  'storage space': '창고',
  'valet service': '주차 서비스',
  'live-in super': '수리공',
  'wheelchair access': '휠체어 가능',
  'indoor squash court': '실내 스쿼시',
}

export function formatHousingAmenityLabel(value: string): string | null {
  return HOUSING_AMENITY_LABELS[value.trim().toLowerCase()] ?? null
}

export const HOUSING_APPLIANCE_LABELS: Record<string, string> = {
  dishwasher: '식기세척기',
  microwave: '전자레인지',
  oven: '오븐',
  refrigerator: '냉장고',
  washer: '세탁기',
  dryer: '건조기',
  'air conditioning': '에어컨',
  'in-unit washer': '세탁기',
}

export function formatHousingApplianceLabel(value: string): string | null {
  return HOUSING_APPLIANCE_LABELS[value.trim().toLowerCase()] ?? null
}

export const HOUSING_BENEFIT_PERKS: HousingPerkId[] = [
  'roommate-waiting',
  'no-broker-fee',
  'no-guarantor',
  'free-credit',
]

export const HOUSING_AMENITY_PERKS: HousingPerkId[] = HOUSING_PERKS.map(
  (perk) => perk.id,
).filter((id) => !HOUSING_BENEFIT_PERKS.includes(id))

export const HOUSING_CARD_BADGE_PERKS: HousingPerkId[] = [
  'no-broker-fee',
  'no-guarantor',
]

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

const UNIT_TYPE_IDS = new Set<string>(HOUSING_UNIT_TYPES.map((item) => item.id))
const ROOM_TYPE_IDS = new Set<string>(HOUSING_ROOM_TYPES.map((item) => item.id))
const PERK_IDS = new Set<string>(HOUSING_PERKS.map((item) => item.id))

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

export function getHousingListingTypeLabel(listing: HousingListing): string {
  const unitType = getListingUnitType(listing)
  return unitType ? getHousingUnitTypeLabel(unitType) : '타입 미정'
}

export function getHousingPerkLabel(perkId: HousingPerkId): string {
  return HOUSING_PERKS.find((item) => item.id === perkId)?.label ?? perkId
}

/** @deprecated getListingUnitRent 사용 */
export function getHousingUnitRent(listing: HousingListing): number {
  return getListingUnitRent(listing)
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

export const HOUSING_ROOMMATE_ROOM_PREFERENCES: {
  id: HousingRoommateRoomPreference
  label: string
}[] = [
  { id: 'master-w-bath', label: '마스터 희망' },
  { id: 'master-wo-bath', label: '마스터(공용욕실) 희망' },
  { id: 'regular-bedroom', label: '레귤러 희망' },
  { id: 'flexroom', label: '플렉스 희망' },
  { id: 'any', label: '모두 가능' },
]

export function getHousingRoommateRoomPreferenceLabel(
  id: HousingRoommateRoomPreference,
): string {
  return (
    HOUSING_ROOMMATE_ROOM_PREFERENCES.find((item) => item.id === id)?.label ?? id
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

export function getHousingRoommateAffiliationLabel(
  affiliation: HousingRoommateAffiliation,
): string {
  if (affiliation.kind === 'student') return affiliation.school
  return '직장인'
}

export function formatHousingRoommateCompositionLabel(
  composition: HousingRoommateComposition,
): string {
  const parts: string[] = []
  if (composition.male > 0) parts.push(`남${composition.male}`)
  if (composition.female > 0) parts.push(`여${composition.female}`)
  return parts.join(' ')
}

export const HOUSING_MAX_IMAGES = 14

export function getListingCardBadges(listing: HousingListing) {
  const derived = getListingDerivedPerks(listing)
  const badges: { key: string; label: string }[] = derived
    .filter((perk) => HOUSING_CARD_BADGE_PERKS.includes(perk))
    .map((perk) => ({ key: perk, label: getHousingPerkLabel(perk) }))
  const creditOffers = getListingCreditOffers(listing)
  creditOffers.forEach((credit, index) => {
    badges.push({
      key: `credit-offer-${index}`,
      label: formatHousingCreditOfferLabel(credit),
    })
  })
  return badges
}

export function getListingBenefitPerks(listing: HousingListing): HousingPerkId[] {
  return getListingDerivedPerks(listing).filter(
    (perk) =>
      HOUSING_BENEFIT_PERKS.includes(perk) &&
      perk !== 'free-credit' &&
      perk !== 'roommate-waiting',
  )
}

export function getListingAmenityPerks(listing: HousingListing): HousingPerkId[] {
  return getListingDerivedPerks(listing).filter((perk) =>
    HOUSING_AMENITY_PERKS.includes(perk),
  )
}

function collectUniqueLabels(
  values: string[],
  format: (value: string) => string | null,
): string[] {
  const labels: string[] = []
  const seen = new Set<string>()

  for (const item of values) {
    const label = format(item)?.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

export function getListingAmenityLabels(listing: HousingListing): string[] {
  return collectUniqueLabels(listing.property.amenities, formatHousingAmenityLabel)
}

export function getListingUtilityLabels(listing: HousingListing): string[] {
  return collectUniqueLabels(
    listing.property.includedUtility ?? [],
    formatHousingUtilityLabel,
  )
}

export function getListingApplianceLabels(listing: HousingListing): string[] {
  return collectUniqueLabels(
    listing.property.appliances,
    formatHousingApplianceLabel,
  )
}

export function shouldShowListingRoomRows(listing: HousingListing): boolean {
  const rooms = getPricedRooms(listing)
  return (
    rooms.length > 1 ||
    (rooms.length === 1 &&
      rooms[0]?.type !== 'entire' &&
      rooms[0]?.type !== 'studio')
  )
}

export function formatListingPromotionSummary(listing: HousingListing): string[] {
  return getListingCreditOffers(listing).map((credit) =>
    formatHousingCreditOfferLabel(credit),
  )
}
