import {
  formatHousingCreditOfferLabel,
  formatHousingDateShort,
  formatListingBedBath,
  getListingArea,
  getListingCreditOffer,
  getListingCreditOffers,
  getListingDerivedPerks,
  getListingDisplayAddress,
  getListingUnitRent,
  getListingUnitNet,
  getHousingRoomNet,
  getListingUnitType,
  getListingAvailableDate,
  getPricedRooms,
  getRoomSelectionKey,
  housingHasRoommateWaiting,
  housingMatchesPerk,
  housingMatchesPrice,
  housingMatchesRoomType,
  inferHousingUnitType,
  listingHasOP,
  sortHousingRooms,
} from '@lib/housing/listing'
import type {
  HousingCreditOffer,
  HousingListing,
  HousingPerkId,
  HousingPost,
  HousingProperty,
  HousingRoom,
  HousingRoomType,
  HousingRoommateAffiliation,
  HousingRoommateComposition,
  HousingRoommateGender,
  HousingRoommateProfile,
  HousingRoommateRoomPreference,
  HousingRoommateWaiting,
  HousingUnit,
  HousingUnitPromotion,
  HousingUnitType,
} from '@/types/nyc'

export {
  formatHousingCreditOfferLabel,
  formatHousingDateShort,
  formatHousingAvailableDate,
  formatListingBedBath,
  formatPropertyAmenityFee,
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
]

export function pickMockHousingImages(seed: number): string[] {
  const pool = MOCK_HOUSING_IMAGES
  const counts = [3, 7, 1, 5, 14, 2, 9, 4, 11, 6]
  const count = Math.min(
    HOUSING_MAX_IMAGES,
    Math.max(1, counts[seed % counts.length] ?? 3),
  )

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

const now = Date.now()

type MockListingSeed = {
  id: string
  address: string
  area: string
  zipcode?: string
  latitude?: number
  longitude?: number
  subway?: string[]
  amenities?: string[]
  appliances?: string[]
  includedUtility?: string[]
  partWall?: HousingProperty['partWall']
  amenityFee?: HousingProperty['amenityFee']
  incomeRequirements?: HousingProperty['incomeRequirements']
  unitNumber?: string
  bedrooms: number
  bathrooms: number
  price: number
  availableDate?: string
  rooms: HousingRoom[]
  promotions?: HousingUnitPromotion[]
  description: string
  roommateWaiting?: HousingRoommateWaiting | null
  youtubeUrl?: string | null
  imageSeed: number
  hoursAgo: number
}

function buildMockListing(seed: MockListingSeed): HousingListing {
  const parts = seed.address.split('|').map((part) => part.trim())
  const street = parts[0] ?? seed.address
  const buildingName = parts[1] ?? null
  const property: HousingProperty = {
    address: seed.address,
    displayedAddress: buildingName ? `${street} · ${buildingName}` : street,
    buildingName,
    area: seed.area,
    zipcode: seed.zipcode ?? null,
    latitude: seed.latitude ?? null,
    longitude: seed.longitude ?? null,
    subway: seed.subway ?? [],
    amenities: seed.amenities ?? [],
    appliances: seed.appliances ?? [],
    includedUtility: seed.includedUtility ?? [],
    partWall: seed.partWall ?? null,
    amenityFee: seed.amenityFee ?? null,
    incomeRequirements: seed.incomeRequirements ?? null,
  }

  const unit: HousingUnit = {
    unitNumber: seed.unitNumber ?? null,
    bedrooms: seed.bedrooms,
    bathrooms: seed.bathrooms,
    price: seed.price,
    availableDate: seed.availableDate ?? null,
    available: true,
    rooms: seed.rooms,
    promotions: seed.promotions ?? [],
    images: pickMockHousingImages(seed.imageSeed),
    youtubeUrl: seed.youtubeUrl ?? null,
    unitType: inferHousingUnitType(seed.bedrooms, seed.bathrooms),
  }

  const timestamp = now - seed.hoursAgo * 60 * 60 * 1000

  return {
    id: seed.id,
    property,
    unit,
    description: seed.description,
    roommateWaiting: seed.roommateWaiting ?? null,
    contactEmail: 'housing@misaeng.com',
    sourcePropertyId: `mock-property-${seed.id}`,
    sourceUnitId: `mock-unit-${seed.id}`,
    authorUid: 'mock-misaeng',
    authorEmail: 'housing@misaeng.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'open',
  }
}

export const MOCK_HOUSING_LISTINGS: HousingListing[] = [
  buildMockListing({
    id: 'mock-housing-1',
    address: '2950 Broadway | Pre-War Co-op',
    area: 'Morningside Heights',
    zipcode: '10027',
    latitude: 40.8075,
    longitude: -73.9626,
    subway: ['🚇 1 min walk to 116 St-Columbia Univ (1)'],
    amenities: ['Fitness Center', 'Package Storage', 'Resident Lounge'],
    appliances: ['Dishwasher', 'Refrigerator'],
    includedUtility: ['Heat', 'Hot Water'],
    partWall: 'Full wall',
    incomeRequirements: { personalIncome: '40', personalGuarantor: '0' },
    unitNumber: '4B',
    bedrooms: 2,
    bathrooms: 1,
    price: 3400,
    availableDate: '2026-09-28',
    rooms: [
      { type: 'master-w-bath', price: 1850 },
      { type: 'regular-bedroom', price: 1550 },
    ],
    promotions: [{ hasOP: true, freeMonth: 1, leaseTerm: 12 }],
    description:
      'Morningside Heights 캠퍼스 도보 8분. 마스터·레귤러 룸 옵션. 세탁기·건조기 건물 내 구비.',
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
            '레귤러 룸 쪽 여학생이에요. 주중엔 캠퍼스, 주말엔 가끔 브런치 나가요.',
        },
      ],
    },
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    imageSeed: 0,
    hoursAgo: 5,
  }),
  buildMockListing({
    id: 'mock-housing-2',
    address: '31-15 Ditmars Blvd | Astoria Towers',
    area: 'Astoria',
    zipcode: '11105',
    subway: ['🚇 6 min walk to Ditmars Blvd (N/W)'],
    amenities: ['Fitness Center'],
    appliances: ['Dishwasher', 'Microwave'],
    bedrooms: 2,
    bathrooms: 1,
    price: 2600,
    availableDate: '2026-08-20',
    rooms: [
      { type: 'regular-bedroom', price: 1400 },
      { type: 'flexroom', price: 1200 },
    ],
    promotions: [{ hasOP: true }],
    description:
      'Queens Astoria 중심. N/W 역 도보 6분. 레귤러·플렉스 옵션. 가구 일부 포함.',
    imageSeed: 1,
    hoursAgo: 20,
  }),
  buildMockListing({
    id: 'mock-housing-3',
    address: '188 Avenue A',
    area: 'East Village',
    zipcode: '10009',
    subway: ['🚇 4 min walk to 1st Ave (L)'],
    amenities: ['Rooftop Outdoor Space', 'Terrace'],
    partWall: 'Full wall',
    bedrooms: 1,
    bathrooms: 1,
    price: 2700,
    availableDate: '2026-09-15',
    rooms: [
      { type: 'regular-bedroom', price: 1450 },
      { type: 'flexroom', price: 1250 },
    ],
    promotions: [{ rentCredit: 1500, leaseTerm: 12 }],
    description:
      'L 라인 인근, 주방 리모델링 완료. Regular / Flexroom 가격이 다릅니다.',
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
    imageSeed: 2,
    hoursAgo: 36,
  }),
  buildMockListing({
    id: 'mock-housing-4',
    address: '75 Pierrepont St | Brooklyn Heights',
    area: 'Brooklyn Heights',
    zipcode: '11201',
    amenities: ['Fitness Center', 'Laundry Room'],
    appliances: ['Dishwasher', 'In-Unit Washer'],
    bedrooms: 0,
    bathrooms: 1,
    price: 2800,
    availableDate: '2026-10-01',
    rooms: [{ type: 'studio', price: 2800 }],
    promotions: [{ hasOP: true, freeMonth: 2, leaseTerm: 14 }],
    incomeRequirements: { personalIncome: '40', personalGuarantor: '0' },
    description:
      '프로메나드 인근 스튜디오. 맨해튼 스카이라인 전망, 엘리베이터·세탁실 완비.',
    imageSeed: 3,
    hoursAgo: 48,
  }),
  buildMockListing({
    id: 'mock-housing-5',
    address: '11 W 19th St | Flatiron House',
    area: 'Flatiron',
    zipcode: '10011',
    amenities: ['Fitness Center', 'Swimming Pool'],
    bedrooms: 1,
    bathrooms: 1,
    price: 5400,
    availableDate: '2026-08-25',
    rooms: [
      { type: 'regular-bedroom', price: 2950 },
      { type: 'flexroom', price: 2450 },
    ],
    promotions: [{ hasOP: true }],
    description:
      'Flatiron 근처 1베드. Regular / Flex 선택 가능. 와이파이·청소 서비스 포함.',
    imageSeed: 4,
    hoursAgo: 72,
  }),
  buildMockListing({
    id: 'mock-housing-6',
    address: '250 N 10th St | Williamsburg Lofts',
    area: 'Williamsburg',
    zipcode: '11211',
    subway: ['🚇 5 min walk to Bedford Ave (L)'],
    amenities: ['Rooftop Outdoor Space', 'BBQ Grill', 'Laundry Room'],
    appliances: ['Dishwasher'],
    bedrooms: 2,
    bathrooms: 1,
    price: 5400,
    availableDate: '2026-09-10',
    rooms: [
      { type: 'master-w-bath', price: 2100 },
      { type: 'regular-bedroom', price: 1800 },
      { type: 'flexroom', price: 1500 },
    ],
    description:
      'Bedford L 역 도보 5분. Master / Regular / Flex 룸별 가격. 루프탑 BBQ·공용 라운지.',
    roommateWaiting: {
      profiles: [
        {
          id: 'm6-rm-male',
          gender: 'male',
          affiliation: { kind: 'professional' },
          preferredRoomTypes: ['master-w-bath'],
          intro:
            'Williamsburg 직장인입니다. 루프탑·BBQ는 가끔 친구 초대해요.',
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
    imageSeed: 5,
    hoursAgo: 96,
  }),
  buildMockListing({
    id: 'mock-housing-7',
    address: '245 W 75th St | The Regent',
    area: 'Upper West Side',
    zipcode: '10023',
    amenities: [
      '24-hour Attended Lobby',
      'Fitness Center',
      'Swimming Pool',
      'Mail Room',
      'Sauna',
    ],
    incomeRequirements: { personalIncome: '40', personalGuarantor: '0' },
    bedrooms: 2,
    bathrooms: 2,
    price: 6250,
    availableDate: '2026-09-01',
    rooms: [
      { type: 'master-w-bath', price: 2400 },
      { type: 'regular-bedroom', price: 2100 },
      { type: 'flexroom', price: 1750 },
    ],
    promotions: [{ hasOP: true, rentCredit: 2000, leaseTerm: 12 }],
    description:
      'Central Park 인근 2베드 2배스. Master / Regular / Flex 각각 다른 월세.',
    imageSeed: 6,
    hoursAgo: 110,
  }),
  buildMockListing({
    id: 'mock-housing-8',
    address: '27-28 Thomson Ave | City View',
    area: 'Long Island City',
    zipcode: '11101',
    subway: ['🚇 3 min walk to Court Sq (7/E/M)'],
    appliances: ['Dishwasher', 'In-Unit Washer'],
    incomeRequirements: { personalIncome: '40', personalGuarantor: '80' },
    bedrooms: 3,
    bathrooms: 1,
    price: 3150,
    availableDate: '2026-10-01',
    rooms: [
      { type: 'master-w-bath', price: 1700 },
      { type: 'regular-bedroom', price: 1450 },
    ],
    description: '7·E·M 환승 편리. Master / Regular 쉐어에 적합한 구조.',
    imageSeed: 7,
    hoursAgo: 130,
  }),
  buildMockListing({
    id: 'mock-housing-9',
    address: '222 Berkeley Pl | Park Slope Classic',
    area: 'Park Slope',
    zipcode: '11217',
    amenities: ['Fitness Center', 'Terrace'],
    bedrooms: 3,
    bathrooms: 2,
    price: 5050,
    availableDate: '2026-09-20',
    rooms: [
      { type: 'master-w-bath', price: 1950 },
      { type: 'regular-bedroom', price: 1700 },
      { type: 'flexroom', price: 1400 },
    ],
    promotions: [{ hasOP: true }],
    description:
      'Prospect Park 도보권. Master / Regular / Flex. 조용한 주거 지역.',
    imageSeed: 8,
    hoursAgo: 150,
  }),
  buildMockListing({
    id: 'mock-housing-10',
    address: '301 W 118th St | Harlem Heritage',
    area: 'Harlem',
    zipcode: '10026',
    subway: ['🚇 2 min walk to 116 St (2/3/B/C)'],
    amenities: ['Fitness Center', 'Swimming Pool'],
    appliances: ['Dishwasher'],
    incomeRequirements: { personalIncome: '40', personalGuarantor: '0' },
    bedrooms: 4,
    bathrooms: 2,
    price: 5200,
    availableDate: '2026-11-01',
    rooms: [{ type: 'entire', price: 5200 }],
    promotions: [{ hasOP: true, freeMonth: 1, leaseTerm: 12 }],
    description:
      '침실 4개 이상 대형 유닛. 그룹 쉐어·가족 거주 가능. 2·3·B·C 라인 접근성 좋음.',
    imageSeed: 9,
    hoursAgo: 170,
  }),
]

/** @deprecated MOCK_HOUSING_LISTINGS 사용 */
export const MOCK_HOUSING_POSTS: HousingPost[] = MOCK_HOUSING_LISTINGS

export function listMockHousingListings(): HousingListing[] {
  return MOCK_HOUSING_LISTINGS.filter((listing) => listing.status === 'open')
}

/** @deprecated listMockHousingListings 사용 */
export function listMockHousingPosts(): HousingListing[] {
  return listMockHousingListings()
}

export function getMockHousingListing(id: string): HousingListing | null {
  return MOCK_HOUSING_LISTINGS.find((listing) => listing.id === id) ?? null
}

/** @deprecated getMockHousingListing 사용 */
export function getMockHousingPost(id: string): HousingListing | null {
  return getMockHousingListing(id)
}

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
