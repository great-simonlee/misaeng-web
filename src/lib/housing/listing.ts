import type { Translate } from '@lib/i18n/translate'
import type {
  HousingCreditOffer,
  HousingListing,
  HousingPerkId,
  HousingProperty,
  HousingRoom,
  HousingRoomType,
  HousingUnitPromotion,
  HousingUnitType,
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

const ERP_ROOM_TYPE_ENUM: Record<string, HousingRoomType> = {
  MASTER_WITH_BATH: 'master-w-bath',
  MASTER_WITHOUT_BATH: 'master-wo-bath',
  MASTER_W_BATH: 'master-w-bath',
  MASTER_WO_BATH: 'master-wo-bath',
  REGULAR: 'regular-bedroom',
  REGULAR_BEDROOM: 'regular-bedroom',
  FLEX: 'flexroom',
  FLEXROOM: 'flexroom',
  STUDIO: 'studio',
  ENTIRE: 'entire',
  ENTIRE_UNIT: 'entire',
}

const ERP_ROOM_TYPE_INDEX: Record<string, HousingRoomType> = {
  '0': 'master-w-bath',
  '1': 'master-w-bath',
  '2': 'master-wo-bath',
  '3': 'regular-bedroom',
  '4': 'flexroom',
  '5': 'studio',
}

export function normalizeErpRoomType(label: string): HousingRoomType | null {
  const raw = label.trim()
  if (!raw) return null
  if (ERP_ROOM_TYPE_ENUM[raw] || ERP_ROOM_TYPE_ENUM[raw.toUpperCase().replace(/\s+/g, '_')]) {
    return (
      ERP_ROOM_TYPE_ENUM[raw] ||
      ERP_ROOM_TYPE_ENUM[raw.toUpperCase().replace(/\s+/g, '_')]
    )
  }
  if (ERP_ROOM_TYPE_INDEX[raw]) return ERP_ROOM_TYPE_INDEX[raw]
  const key = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (ERP_ROOM_TYPE_ALIASES[key]) return ERP_ROOM_TYPE_ALIASES[key]
  if (/\bflex\b/.test(key)) return 'flexroom'
  if (key.includes('master') && /(without|w\/o|\bwo\b)/.test(key)) return 'master-wo-bath'
  if (key.includes('master')) return 'master-w-bath'
  if (key.includes('regular')) return 'regular-bedroom'
  if (key.includes('studio')) return 'studio'
  if (key.includes('entire')) return 'entire'
  return null
}

export function parsePropertyAddress(address: string) {
  const parts = address.split('|').map((part) => part.trim())
  return {
    street: parts[0] ?? address,
    buildingName: parts[1] ?? null,
  }
}

function streetBeforeFirstComma(address: string): string {
  const beforeComma = address.split(',')[0]?.trim()
  return beforeComma || address.trim()
}

export function getListingDisplayAddress(listing: HousingListing): string {
  const { property } = listing
  if (property.displayedAddress?.trim()) {
    return streetBeforeFirstComma(property.displayedAddress)
  }
  if (property.buildingName?.trim()) {
    return property.buildingName.trim()
  }
  return property.area?.trim() || 'New York'
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

export function getListingLayoutImage(listing: HousingListing): string | null {
  const url = String(listing.unit.layoutImage || '').trim()
  return url || null
}

/** 상세 갤러리: 사진 → 유닛 레이아웃 → 룸 레이아웃 */
export function getListingGalleryImages(listing: HousingListing): string[] {
  const photos = getListingImages(listing)
  const layout = getListingLayoutImage(listing)
  const roomLayoutEntries = Object.entries(listing.unit.roomLayouts || {})
    .map(([type, url]) => ({
      type: type as HousingRoomType,
      url: String(url || '').trim(),
    }))
    .filter((item) => item.url)
  const order = new Map(
    HOUSING_ROOM_TYPE_ORDER.map((type, index) => [type, index]),
  )
  roomLayoutEntries.sort(
    (a, b) => (order.get(a.type) ?? 99) - (order.get(b.type) ?? 99),
  )
  const seen = new Set<string>()
  const out: string[] = []
  for (const src of [
    ...photos,
    ...(layout ? [layout] : []),
    ...roomLayoutEntries.map((item) => item.url),
  ]) {
    const key = src.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

/** 유닛 레이아웃이 갤러리에서 위치한 인덱스. 없으면 null */
export function getListingLayoutImageIndex(listing: HousingListing): number | null {
  const layout = getListingLayoutImage(listing)
  if (!layout) return null
  const index = getListingGalleryImages(listing).indexOf(layout)
  return index >= 0 ? index : null
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

function asFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** Count rooms that have a positive price. */
export function countPricedRooms(rooms: HousingRoom[]): number {
  return rooms.filter((room) => {
    const n = asFiniteNumber(room.price)
    return n != null && n > 0
  }).length
}

/**
 * Monthly net effective rent from gross + promotion.
 * Free months: $4,000 × 11 / 12 = $3,667 (1 month free on a 12-month lease).
 * Rent credit on a room: split equally across priced rooms.
 * Unit-level (omit roomCount): the full rent credit applies to the unit.
 * Either/or OP-or-free offers do not produce a net (returns null).
 */
export function calculateNetMonthlyPrice(
  grossPrice: number | null | undefined,
  promotion: HousingUnitPromotion | null | undefined,
  { roomCount = null }: { roomCount?: number | null } = {},
): number | null {
  const gross = asFiniteNumber(grossPrice)
  if (gross == null || gross <= 0 || !promotion || typeof promotion !== 'object') {
    return null
  }
  if (promotion.opOrFree) return null

  const freeMonth = asFiniteNumber(promotion.freeMonth) || 0
  const rentCredit = asFiniteNumber(promotion.rentCredit) || 0
  if (freeMonth <= 0 && rentCredit <= 0) return null

  let leaseTerm = asFiniteNumber(promotion.leaseTerm)
  if (leaseTerm == null || leaseTerm <= 0) leaseTerm = 12

  let totalAmount = gross * leaseTerm
  if (freeMonth > 0) totalAmount -= gross * freeMonth
  if (rentCredit > 0) {
    const n = asFiniteNumber(roomCount)
    const creditToApply = n != null && n > 0 ? rentCredit / n : rentCredit
    totalAmount -= creditToApply
  }

  const net = totalAmount / leaseTerm
  if (!Number.isFinite(net)) return null
  const rounded = Math.round(net)
  if (rounded === Math.round(gross)) return null
  return rounded
}

export function calculateLowestNetMonthlyPrice(
  grossPrice: number | null | undefined,
  promotions: HousingUnitPromotion[] | null | undefined,
  opts: { roomCount?: number | null } = {},
): number | null {
  if (!Array.isArray(promotions) || promotions.length === 0) return null
  let lowest: number | null = null
  for (const promo of promotions) {
    const net = calculateNetMonthlyPrice(grossPrice, promo, opts)
    if (net != null && (lowest == null || net < lowest)) lowest = net
  }
  return lowest
}

function storedNetIfDifferent(
  stored: number | null | undefined,
  gross: number,
): number | null {
  const net = asFiniteNumber(stored)
  if (net == null || net <= 0) return null
  if (Math.round(net) === Math.round(gross)) return null
  return Math.round(net)
}

export function getListingUnitNet(listing: HousingListing): number | null {
  const gross = getListingUnitRent(listing)
  const stored = storedNetIfDifferent(listing.unit.netPrice, gross)
  if (stored != null) return stored
  return calculateLowestNetMonthlyPrice(gross, listing.unit.promotions)
}

export function getHousingRoomNet(
  listing: HousingListing,
  room: HousingRoom,
): number | null {
  const stored = storedNetIfDifferent(room.netPrice, room.price)
  if (stored != null) return stored
  return calculateLowestNetMonthlyPrice(room.price, listing.unit.promotions, {
    roomCount: countPricedRooms(getPricedRooms(listing)),
  })
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
  return getListingCreditOffers(listing)[0] ?? null
}

export function getListingCreditOffers(
  listing: HousingListing,
): HousingCreditOffer[] {
  const offers: HousingCreditOffer[] = []
  for (const promo of listing.unit.promotions) {
    const freeMonth = asFiniteNumber(promo.freeMonth) ?? 0
    if (freeMonth > 0 && !promo.opOrFree) {
      offers.push({ kind: 'months-free', months: freeMonth })
    }
    const rentCredit = asFiniteNumber(promo.rentCredit) ?? 0
    if (rentCredit > 0) {
      offers.push({ kind: 'dollar-credit', amount: rentCredit })
    }
  }
  return offers
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

/**
 * 화면 표시 문구는 `housing` 네임스페이스에 있다 (`const t = useT('housing')`).
 * 아래 format/label 함수의 t는 그 번역기다.
 */

/** `roomTypes.<id>` */
export function getHousingRoomTypeLabel(
  roomType: HousingRoomType,
  t: Translate,
): string {
  return t(`roomTypes.${roomType}`)
}

export function getHousingRoomLabel(room: HousingRoom, t: Translate): string {
  return getHousingRoomTypeLabel(room.type, t)
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
  'indoor pool': 'pool',
  'outdoor pool': 'pool',
  'mail room': 'mail-room',
  'package storage': 'package-storage',
  'storage space': 'package-storage',
  sauna: 'sauna',
  'bbq grill': 'bbq-grill',
  'bbq grills': 'bbq-grill',
  barbecue: 'bbq-grill',
  washer: 'washer-dryer',
  'in-unit washer': 'washer-dryer',
  'in-unit washer / dryer': 'washer-dryer',
  'in-unit washer/dryer': 'washer-dryer',
  'washer / dryer': 'washer-dryer',
  'washer/dryer': 'washer-dryer',
  terrace: 'terrace',
  sundeck: 'terrace',
  'working space': 'work-study',
  'business meeting room': 'work-study',
  'business center': 'work-study',
}

function normalizeAmenityKey(value: string) {
  return value.trim().toLowerCase()
}

/** 세탁기 기준 매칭 (식기세척기 제외). 건조기만 있는 매물은 제외. ERP unit option first */
export function listingHasWasher(listing: HousingListing): boolean {
  const features = listing.unit.features
  if (features) return features.washerDryer
  const strings = [
    ...listing.property.amenities,
    ...listing.property.appliances,
  ]
  return strings.some((item) => {
    const key = normalizeAmenityKey(item)
    if (!key.includes('washer')) return false
    if (key.includes('dishwasher')) return false
    return true
  })
}

export function mapAmenityStringToPerkId(value: string): HousingPerkId | null {
  const key = normalizeAmenityKey(value)
  const exact = AMENITY_STRING_TO_PERK[key]
  if (exact) return exact
  if (key.includes('washer') && !key.includes('dishwasher')) {
    return 'washer-dryer'
  }
  return null
}

export function listingHasNoGuarantor(listing: HousingListing): boolean {
  const guarantor = listing.property.incomeRequirements?.personalGuarantor
  return guarantor === '0' || guarantor === 'none'
}

/** Full wall / Regular wall = 플렉스 벽 가능. Curtain only 는 제외. ERP unit option first */
export function listingHasFlexWall(listing: HousingListing): boolean {
  const flexWall = listing.unit.features?.flexWall
  if (flexWall === 'allowed') return true
  if (flexWall === 'not_allowed') return false
  const walls = listing.property.partWall ?? []
  return walls.includes('Full wall') || walls.includes('Regular wall')
}

export function getListingDerivedPerks(listing: HousingListing): HousingPerkId[] {
  const perks = new Set<HousingPerkId>()
  if (listingHasOP(listing)) perks.add('no-broker-fee')
  if (listingHasNoGuarantor(listing)) perks.add('no-guarantor')
  if (getListingCreditOffer(listing)) perks.add('free-credit')
  if (housingHasRoommateWaiting(listing)) perks.add('roommate-waiting')

  const strings = [
    ...listing.property.amenities,
    ...listing.property.appliances,
    ...(listing.property.includedUtility ?? []),
  ]
  for (const item of strings) {
    const perk = mapAmenityStringToPerkId(item)
    if (perk) perks.add(perk)
  }

  // ERP unit options replace the building-text guesses for these three filters.
  if (listing.unit.features) {
    perks.delete('washer-dryer')
    perks.delete('wall-ok')
    perks.delete('terrace')
    if (listing.unit.features.outdoor !== 'none') perks.add('terrace')
  }
  if (listingHasWasher(listing)) perks.add('washer-dryer')
  if (listingHasFlexWall(listing)) perks.add('wall-ok')

  return Array.from(perks)
}

export function housingMatchesPerk(
  listing: HousingListing,
  perk: HousingPerkId,
): boolean {
  if (perk === 'no-guarantor') {
    return listingHasNoGuarantor(listing)
  }
  if (perk === 'wall-ok') {
    return listingHasFlexWall(listing)
  }
  if (perk === 'washer-dryer') {
    return listingHasWasher(listing)
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
  t?: Translate,
): string {
  if (t) {
    return offer.kind === 'months-free'
      ? t('credit.monthsFree', { count: offer.months })
      : t('credit.dollarCredit', { amount: offer.amount.toLocaleString('en-US') })
  }
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
  t: Translate,
): string {
  const fee = property.amenityFee
  const amount = fee?.amount
  if (amount == null || !Number.isFinite(amount) || amount < 0) {
    return t('amenityFee.unknown')
  }
  if (amount === 0) return t('amenityFee.free')
  const kind = fee?.type === 'mandatory' ? 'mandatory' : 'optional'
  const per = fee?.per === 'person' ? 'Person' : 'Unit'
  const period = fee?.period === 'yearly' ? 'Yearly' : 'Monthly'
  return t(`amenityFee.${kind}${per}${period}`, {
    amount: amount.toLocaleString('en-US'),
  })
}

const PART_WALL_KEYS: Record<string, string> = {
  'Full wall': 'fullWall',
  'Regular wall': 'regularWall',
  'Curtain only': 'curtainOnly',
  Curtain: 'curtainOnly',
}

export function formatHousingPartWall(
  partWall: HousingProperty['partWall'] | string | string[] | null | undefined,
  t: Translate,
): string | null {
  const items = Array.isArray(partWall)
    ? partWall
    : String(partWall || '')
        .split(/[,/|·]/)
        .map((s) => s.trim())
        .filter(Boolean)
  if (items.length === 0) return null
  const formatted = items
    .map((item) =>
      PART_WALL_KEYS[item] ? t(`partWall.${PART_WALL_KEYS[item]}`) : item,
    )
    .filter(Boolean)
  return formatted.length > 0 ? formatted.join(' · ') : null
}

export function formatPropertyIncomeRequirements(
  property: HousingProperty,
  t: Translate,
): string {
  const income = property.incomeRequirements
  const parts: string[] = []
  if (income?.personalIncome) {
    parts.push(t('income.personal', { multiple: income.personalIncome }))
  }
  if (income?.personalGuarantor) {
    parts.push(t('income.guarantor', { multiple: income.personalGuarantor }))
  }
  parts.push(t('income.guarantorCompany'))
  return parts.join(' · ')
}

/** 건물 어메니티·유틸리티·가전 원문(ERP 영어) → 메시지 키 조각. `children's playroom` → `childrensPlayroom` */
export function housingFeatureKey(value: string): string {
  const words = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return words
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('')
}

/**
 * 건물 정보 원문 목록을 현재 언어 라벨로 (중복 제거).
 * known: 표시할 원문 키 집합(소문자) — 모르는 값은 예전처럼 숨긴다.
 * group: `amenities` | `utilities` | `appliances` (housing 네임스페이스)
 */
export function translateHousingFeatureLabels(
  values: string[],
  known: Record<string, unknown>,
  group: 'amenities' | 'utilities' | 'appliances',
  t: Translate,
): string[] {
  const labels: string[] = []
  const seen = new Set<string>()
  for (const item of values) {
    const normalized = item.trim().toLowerCase()
    if (!normalized || !(normalized in known)) continue
    const label = t(`${group}.${housingFeatureKey(normalized)}`).trim()
    const dedupeKey = label.toLowerCase()
    if (!label || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    labels.push(label)
  }
  return labels
}

/**
 * 카드·상세 혜택 뱃지 라벨을 현재 언어로.
 * badges는 housingMock `getListingCardBadges` 결과 (key = perk id 또는 `credit-offer-<index>`).
 */
export function translateListingCardBadges(
  listing: HousingListing,
  badges: { key: string; label: string }[],
  t: Translate,
): { key: string; label: string }[] {
  const offers = getListingCreditOffers(listing)
  return badges.map((badge) => {
    const creditMatch = badge.key.match(/^credit-offer-(\d+)$/)
    if (creditMatch) {
      const offer = offers[Number(creditMatch[1])]
      return offer
        ? { key: badge.key, label: formatHousingCreditOfferLabel(offer, t) }
        : badge
    }
    return { key: badge.key, label: t(`perks.${badge.key}`) }
  })
}
