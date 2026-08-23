import type { HousingListing, HousingRoomType } from '@/types/nyc'
import { normalizeErpRoomType } from './listing'

const ROOM_TYPES = new Set([
  'master-w-bath',
  'master-wo-bath',
  'regular-bedroom',
  'flexroom',
  'entire',
  'studio',
])

const UNIT_TYPES = new Set([
  'studio',
  '1b1b',
  '2b1b',
  '2b2b',
  '3b1b',
  '3b2b',
  '4-plus',
])

function asNumber(value: unknown, fallback = 0) {
  if (value == null || value === '') return fallback
  const n =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

function asCoordinate(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const n = Number(value.trim().replace(/[^0-9.+-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return asCoordinate(record.latitude ?? record.lat ?? record.longitude ?? record.lng)
  }
  return null
}

function readCoordinates(propertyRaw: Record<string, unknown>): {
  latitude: number | null
  longitude: number | null
} {
  const nested =
    propertyRaw.location && typeof propertyRaw.location === 'object'
      ? (propertyRaw.location as Record<string, unknown>)
      : propertyRaw.geo && typeof propertyRaw.geo === 'object'
        ? (propertyRaw.geo as Record<string, unknown>)
        : propertyRaw.coordinates && typeof propertyRaw.coordinates === 'object'
          ? (propertyRaw.coordinates as Record<string, unknown>)
          : null
  const latitude =
    asCoordinate(propertyRaw.latitude ?? propertyRaw.lat) ??
    (nested ? asCoordinate(nested.latitude ?? nested.lat) : null)
  const longitude =
    asCoordinate(propertyRaw.longitude ?? propertyRaw.lng ?? propertyRaw.lon) ??
    (nested ? asCoordinate(nested.longitude ?? nested.lng ?? nested.lon) : null)
  if (
    latitude == null ||
    longitude == null ||
    (latitude === 0 && longitude === 0) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { latitude: null, longitude: null }
  }
  return { latitude, longitude }
}

/** null = unknown, 0 = free, greater than 0 = paid */
function asAmenityAmount(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = asNumber(value, Number.NaN)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function normalizePromotions(value: unknown): HousingListing['unit']['promotions'] {
  const list = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const freeMonth = asNumber(item.freeMonth, 0)
      const rentCredit = asNumber(item.rentCredit, 0)
      const leaseTerm = asNumber(item.leaseTerm, 0)
      const opMonths = asNumber(item.opMonths, 0)
      return {
        hasOP: Boolean(item.hasOP),
        opMonths: opMonths > 0 ? opMonths : undefined,
        opBasis: item.opBasis === 'net' ? 'net' as const : item.opBasis === 'gross' ? 'gross' as const : undefined,
        opOrFree: Boolean(item.opOrFree) || undefined,
        opOrFreeFreeMonth:
          asNumber(item.opOrFreeFreeMonth, 0) > 0
            ? asNumber(item.opOrFreeFreeMonth, 0)
            : undefined,
        freeMonth: freeMonth > 0 ? freeMonth : undefined,
        leaseTerm: leaseTerm > 0 ? leaseTerm : undefined,
        rentCredit: rentCredit > 0 ? rentCredit : undefined,
      }
    })
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
}

export function normalizeHousingListing(raw: unknown): HousingListing | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const propertyRaw =
    data.property && typeof data.property === 'object'
      ? (data.property as Record<string, unknown>)
      : null
  const unitRaw =
    data.unit && typeof data.unit === 'object'
      ? (data.unit as Record<string, unknown>)
      : null
  const id = String(data.id || '').trim()
  if (!id || !propertyRaw || !unitRaw) return null

  const rooms = Array.isArray(unitRaw.rooms)
    ? unitRaw.rooms.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const room = item as Record<string, unknown>
        const rawType = String(room.type || room.name || room.label || '').trim()
        const type = (ROOM_TYPES.has(rawType)
          ? rawType
          : normalizeErpRoomType(rawType)) as HousingRoomType | null
        const price = asNumber(room.price ?? room.rent ?? room.amount, 0)
        if (!type || !ROOM_TYPES.has(type) || price <= 0) return []
        const netPriceRaw = asNumber(room.netPrice, 0)
        const netPrice =
          netPriceRaw > 0 && Math.round(netPriceRaw) !== Math.round(price)
            ? Math.round(netPriceRaw)
            : null
        return netPrice != null ? [{ type, price, netPrice }] : [{ type, price }]
      })
    : []

  const unitType = String(unitRaw.unitType || '').trim()
  const partWall = String(propertyRaw.partWall || '').trim()
  const amenityFeeRaw =
    propertyRaw.amenityFee && typeof propertyRaw.amenityFee === 'object'
      ? (propertyRaw.amenityFee as Record<string, unknown>)
      : null
  const incomeRaw =
    propertyRaw.incomeRequirements &&
    typeof propertyRaw.incomeRequirements === 'object'
      ? (propertyRaw.incomeRequirements as Record<string, unknown>)
      : null

  const status = data.status === 'closed' ? 'closed' : 'open'

  return {
    id,
    property: {
      address: String(propertyRaw.address || '').trim(),
      displayedAddress: String(propertyRaw.displayedAddress || '').trim() || null,
      buildingName: String(propertyRaw.buildingName || '').trim() || null,
      area: String(propertyRaw.area || '').trim() || 'New York',
      zipcode: String(propertyRaw.zipcode || '').trim() || null,
      ...readCoordinates(propertyRaw),
      subway: asStringArray(propertyRaw.subway),
      amenities: asStringArray(propertyRaw.amenities),
      appliances: asStringArray(propertyRaw.appliances),
      includedUtility: asStringArray(propertyRaw.includedUtility),
      partWall:
        partWall === 'Full wall' ||
        partWall === 'Regular wall' ||
        partWall === 'Curtain only'
          ? partWall
          : null,
      amenityFee: amenityFeeRaw
        ? {
            type: amenityFeeRaw.type === 'mandatory' ? 'mandatory' : 'optional',
            amount: asAmenityAmount(amenityFeeRaw.amount),
            period: amenityFeeRaw.period === 'yearly' ? 'yearly' : 'monthly',
            per: amenityFeeRaw.per === 'person' ? 'person' : 'unit',
          }
        : {
            type: 'optional',
            amount: null,
            period: 'monthly',
            per: 'unit',
          },
      incomeRequirements: incomeRaw
        ? {
            personalIncome: String(incomeRaw.personalIncome || '').trim() || undefined,
            personalGuarantor:
              String(incomeRaw.personalGuarantor || '').trim() || undefined,
          }
        : null,
      latestMoveInAllowedDays:
        propertyRaw.latestMoveInAllowedDays == null
          ? null
          : asNumber(propertyRaw.latestMoveInAllowedDays, 0),
    },
    unit: {
      unitNumber: String(unitRaw.unitNumber || '').trim() || null,
      bedrooms: asNumber(unitRaw.bedrooms, 0),
      bathrooms: asNumber(unitRaw.bathrooms, 1),
      price: asNumber(unitRaw.price, 0),
      netPrice: (() => {
        const net = asNumber(unitRaw.netPrice, 0)
        const gross = asNumber(unitRaw.price, 0)
        return net > 0 && Math.round(net) !== Math.round(gross) ? Math.round(net) : null
      })(),
      availableDate: String(unitRaw.availableDate || '').trim() || null,
      available: unitRaw.available !== false,
      rooms,
      promotions: normalizePromotions(unitRaw.promotions),
      images: asStringArray(unitRaw.images),
      layoutImage: String(unitRaw.layoutImage || '').trim() || null,
      roomLayouts: (() => {
        const raw = unitRaw.roomLayouts
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
        const out: Partial<Record<HousingRoomType, string>> = {}
        for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
          const type = (ROOM_TYPES.has(key)
            ? key
            : normalizeErpRoomType(key)) as HousingRoomType | null
          const url = String(value || '').trim()
          if (!type || !ROOM_TYPES.has(type) || !url) continue
          out[type] = url
        }
        return out
      })(),
      youtubeUrl: String(unitRaw.youtubeUrl || '').trim() || null,
      listingUrl: String(unitRaw.listingUrl || '').trim() || null,
      unitType: UNIT_TYPES.has(unitType)
        ? (unitType as HousingListing['unit']['unitType'])
        : null,
    },
    description: String(data.description || '').trim(),
    roommateWaiting:
      data.roommateWaiting && typeof data.roommateWaiting === 'object'
        ? (data.roommateWaiting as HousingListing['roommateWaiting'])
        : null,
    contactEmail: String(data.contactEmail || '').trim() || 'housing@misaeng.com',
    sourcePropertyId: String(data.sourcePropertyId || '').trim() || null,
    sourceUnitId: String(data.sourceUnitId || '').trim() || null,
    authorUid: String(data.authorUid || '').trim() || 'erp',
    authorEmail: String(data.authorEmail || '').trim() || 'housing@misaeng.com',
    authorSchoolId: String(data.authorSchoolId || '').trim() || null,
    authorSchoolName: String(data.authorSchoolName || '').trim() || null,
    createdAt: asNumber(data.createdAt, Date.now()),
    updatedAt: asNumber(data.updatedAt, Date.now()),
    status,
  }
}
