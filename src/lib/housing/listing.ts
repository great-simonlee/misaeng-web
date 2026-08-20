import type {
  HousingCreditOffer,
  HousingListing,
  HousingPerkId,
  HousingProperty,
  HousingRoom,
  HousingRoomType,
  HousingUnit,
  HousingUnitPromotion,
  HousingUnitType,
  HousingRoommateWaiting,
} from '@/types/nyc'

/** ERP 룸 타입 라벨 → 내부 enum */
export const ERP_ROOM_TYPE_ALIASES: Record<string, HousingRoomType> = {
  'master w/ bath': 'master-w-bath',
  'master w/o bath': 'master-wo-bath',
  master: 'master-w-bath',
  regular: 'regular-bedroom',
  flex: 'flexroom',
  entire: 'entire',
  studio: 'studio',
}

export const HOUSING_ROOM_TYPE_ORDER: HousingRoomType[] = [
  'entire',
  'studio',
  'master-w-bath',
  'master-wo-bath',
  'regular-bedroom',
  'flexroom',
]

export function normalizeErpRoomType(label: string): HousingRoomType | null {
  const key = label.trim().toLowerCase().replace(/\s+/g, ' ')
  return ERP_ROOM_TYPE_ALIASES[key] ?? null
}

export function parsePropertyAddress(address: string) {
  const parts = address.split('|').map((part) => part.trim())
  return {
    street: parts[0] ?? address,
    buildingName: parts[1] ?? null,
  }
}

export function getListingDisplayAddress(listing: HousingListing): string {
  const { property } = listing
  if (property.displayedAddress?.trim()) return property.displayedAddress.trim()
  const { street, buildingName } = parsePropertyAddress(property.address)
  return buildingName ? `${street} · ${buildingName}` : street
}

export function getListingStreetAddress(listing: HousingListing): string {
  const { property } = listing
  return parsePropertyAddress(property.address).street
}

export function getListingArea(listing: HousingListing): string {
  return listing.property.area
}

export function getListingImages(listing: HousingListing): string[] {
  return listing.unit.images
}

export function getListingYoutubeUrl(listing: HousingListing): string | null {
  return listing.unit.youtubeUrl ?? null
}

export function getListingUnitType(listing: HousingListing): HousingUnitType | null {
  if (listing.unit.unitType) return listing.unit.unitType
  return inferHousingUnitType(listing.unit.bedrooms, listing.unit.bathrooms)
}

export function inferHousingUnitType(
  bedrooms: number,
  bathrooms: number,
): HousingUnitType {
  if (bedrooms <= 0) return 'studio'
  if (bedrooms === 1) return '1b1b'
  if (bedrooms === 2) {
    return bathrooms >= 2 ? '2b2b' : '2b1b'
  }
  if (bedrooms === 3) {
    return bathrooms >= 2 ? '3b2b' : '3b1b'
  }
  return '4-plus'
}

export function getListingUnitRent(listing: HousingListing): number {
  if (Number.isFinite(listing.unit.price) && listing.unit.price > 0) {
    return listing.unit.price
  }
  return getListingRoomRentSum(listing)
}

export function getListingRoomRentSum(listing: HousingListing): number {
  return getPricedRooms(listing).reduce((sum, room) => sum + room.price, 0)
}

export function getPricedRooms(listing: HousingListing): HousingRoom[] {
  return listing.unit.rooms.filter((room) => room.price > 0)
}

export function getListingPrimaryPromotion(
  listing: HousingListing,
): HousingUnitPromotion | null {
  return listing.unit.promotions[0] ?? null
}

export function listingHasOP(listing: HousingListing): boolean {
  return listing.unit.promotions.some((promo) => Boolean(promo.hasOP))
}

export function getListingCreditOffer(
  listing: HousingListing,
): HousingCreditOffer | null {
  for (const promo of listing.unit.promotions) {
    const freeMonth = Number(promo.freeMonth ?? 0)
    const leaseTerm = Number(promo.leaseTerm ?? 0)
    if (freeMonth > 0 && leaseTerm > 0 && !promo.opOrFree) {
      return { kind: 'months-free', months: freeMonth }
    }
    const rentCredit = Number(promo.rentCredit ?? 0)
    if (rentCredit > 0) {
      return { kind: 'dollar-credit', amount: rentCredit }
    }
  }
  return null
}

export function getListingAvailableDate(listing: HousingListing): string {
  return listing.unit.availableDate?.trim() ?? ''
}

export function sortHousingRooms(rooms: HousingRoom[]): HousingRoom[] {
  const order = new Map(
    HOUSING_ROOM_TYPE_ORDER.map((type, index) => [type, index]),
  )
  return [...rooms].sort((a, b) => {
    const ai = order.get(a.type) ?? 99
    const bi = order.get(b.type) ?? 99
    if (ai !== bi) return ai - bi
    return a.price - b.price
  })
}

export function getHousingRoomTypeLabel(roomType: HousingRoomType): string {
  const labels: Record<HousingRoomType, string> = {
    'master-w-bath': 'Master w/ Bath',
    'master-wo-bath': 'Master w/o Bath',
    'regular-bedroom': 'Regular',
    flexroom: 'Flex',
    entire: '유닛 전체',
    studio: 'Studio',
  }
  return labels[roomType] ?? roomType
}

export function getHousingRoomLabel(room: HousingRoom): string {
  return getHousingRoomTypeLabel(room.type)
}

export function getRoomSelectionKey(room: HousingRoom, index: number): string {
  return room.type === 'entire' || room.type === 'studio'
    ? room.type
    : `${room.type}-${index}`
}

export function findListingRoomByKey(
  listing: HousingListing,
  key: string | null,
): HousingRoom | null {
  if (!key) return null
  const rooms = sortHousingRooms(getPricedRooms(listing))
  return (
    rooms.find((room, index) => getRoomSelectionKey(room, index) === key) ??
    rooms.find((room) => room.type === key) ??
    null
  )
}

export function housingHasRoommateWaiting(listing: HousingListing): boolean {
  return (listing.roommateWaiting?.profiles.length ?? 0) > 0
}

/** 건물 amenity/appliance 문자열 → 필터 perk id */
const AMENITY_STRING_TO_PERK: Record<string, HousingPerkId> = {
  'fitness center': 'gym',
  gym: 'gym',
  '24-hour attended lobby': 'doorman-24h',
  doorman: 'doorman-24h',
  'rooftop outdoor space': 'rooftop',
  'rooftop lounge': 'rooftop',
  rooftop: 'rooftop',
  pool: 'pool',
  'swimming pool': 'pool',
  'mail room': 'mail-room',
  'package storage': 'package-storage',
  sauna: 'sauna',
  'bbq grill': 'bbq-grill',
  barbecue: 'bbq-grill',
  dishwasher: 'washer-dryer',
  'in-unit washer': 'washer-dryer',
  'laundry room': 'washer-dryer',
  terrace: 'terrace',
  'resident lounge': 'work-study',
  'business center': 'work-study',
}

function normalizeAmenityKey(value: string) {
  return value.trim().toLowerCase()
}

export function getListingDerivedPerks(listing: HousingListing): HousingPerkId[] {
  const perks = new Set<HousingPerkId>()
  if (listingHasOP(listing)) perks.add('no-broker-fee')
  if (getListingCreditOffer(listing)) perks.add('free-credit')
  if (housingHasRoommateWaiting(listing)) perks.add('roommate-waiting')

  const strings = [
    ...listing.property.amenities,
    ...listing.property.appliances,
    ...(listing.property.includedUtility ?? []),
  ]
  for (const item of strings) {
    const key = normalizeAmenityKey(item)
    const perk = AMENITY_STRING_TO_PERK[key]
    if (perk) perks.add(perk)
  }

  if (listing.property.partWall === 'Full wall') perks.add('wall-ok')

  return Array.from(perks)
}

export function housingMatchesPerk(
  listing: HousingListing,
  perk: HousingPerkId,
): boolean {
  if (perk === 'no-guarantor') {
    const guarantor = listing.property.incomeRequirements?.personalGuarantor
    return guarantor === '0' || guarantor === 'none'
  }
  return getListingDerivedPerks(listing).includes(perk)
}

export function housingMatchesRoomType(
  listing: HousingListing,
  roomType: HousingRoomType,
): boolean {
  return getPricedRooms(listing).some((room) => room.type === roomType)
}

export function housingMatchesPrice(
  listing: HousingListing,
  kind: 'unit' | 'room' | 'all',
  min: number,
  max: number,
  roomType?: HousingRoomType | 'all',
): boolean {
  if (kind === 'all') return true
  if (kind === 'unit') {
    const rent = getListingUnitRent(listing)
    return rent >= min && rent <= max
  }
  const rooms =
    roomType && roomType !== 'all'
      ? getPricedRooms(listing).filter((room) => room.type === roomType)
      : getPricedRooms(listing)
  if (rooms.length === 0) return false
  return rooms.some((room) => room.price >= min && room.price <= max)
}

export function formatHousingDateShort(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${Number(match[2])}/${Number(match[3])}`
  return trimmed
}

export function formatHousingAvailableDate(value: string): string {
  return formatHousingDateShort(value)
}

export function formatHousingCreditOfferLabel(
  offer: HousingCreditOffer,
): string {
  if (offer.kind === 'months-free') return `${offer.months}개월 무료`
  return `$${offer.amount.toLocaleString()} 크레딧`
}

export function formatListingBedBath(listing: HousingListing): string {
  const { bedrooms, bathrooms } = listing.unit
  const bedLabel = bedrooms <= 0 ? 'Studio' : `${bedrooms} Bed`
  const bathLabel =
    bathrooms % 1 === 0 ? `${bathrooms} Ba` : `${bathrooms} Ba`
  return `${bedLabel} · ${bathLabel}`
}

export function formatPropertyAmenityFee(
  property: HousingProperty,
): string | null {
  const fee = property.amenityFee
  if (!fee || !Number.isFinite(fee.amount) || fee.amount <= 0) return null
  const period = fee.period === 'yearly' ? '년' : '월'
  const prefix = fee.type === 'mandatory' ? '필수' : '선택'
  return `${prefix} $${fee.amount.toLocaleString()}/${period}`
}

export function formatPropertyIncomeRequirements(
  property: HousingProperty,
): string | null {
  const income = property.incomeRequirements
  if (!income) return null
  const parts: string[] = []
  if (income.personalIncome) {
    parts.push(`개인 ${income.personalIncome}x`)
  }
  if (income.personalGuarantor) {
    parts.push(`게런터 ${income.personalGuarantor}x`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
