import type { HousingListing, HousingPerkId, HousingRoomType, HousingUnitType } from '@/types/nyc'
import {
  getListingArea,
  getListingUnitType,
  housingMatchesPerk,
  housingMatchesPrice,
  housingMatchesRoomType,
  type HousingListingKind,
} from '@lib/constants/housingMock'

/**
 * 하우징 목록 필터 — one rule for the web list screen and GET /api/housing?limit= (owner 11-23 paging: the server
 * filters before it pages, so a page never comes back half empty).
 */
export type HousingListFilter = {
  kind: 'all' | HousingListingKind
  unit: HousingUnitType | 'all'
  room: HousingRoomType | 'all'
  area: string
  perks: HousingPerkId[]
  min: number
  max: number
}

export function matchesHousingFilter(listing: HousingListing, f: HousingListFilter): boolean {
  const matchUnit = f.kind !== 'unit' || f.unit === 'all' || getListingUnitType(listing) === f.unit
  const matchRoom = f.kind !== 'room' || f.room === 'all' || housingMatchesRoomType(listing, f.room)
  const matchArea = f.area === 'all' || getListingArea(listing) === f.area
  const matchPerks = f.perks.length === 0 || f.perks.every((perk) => housingMatchesPerk(listing, perk))
  const matchPrice = housingMatchesPrice(listing, f.kind, f.min, f.max, f.room)
  return matchUnit && matchRoom && matchArea && matchPerks && matchPrice
}

export function housingFilterToParams(f: HousingListFilter): Record<string, string> {
  return {
    kind: f.kind,
    unit: f.unit,
    room: f.room,
    area: f.area,
    perks: f.perks.join(','),
    min: String(f.min),
    max: String(f.max),
  }
}

export function readHousingFilter(params: URLSearchParams): HousingListFilter {
  const num = (key: string, fallback: number) => {
    const n = Number(params.get(key))
    return params.get(key) != null && Number.isFinite(n) ? n : fallback
  }
  return {
    kind: (params.get('kind') as HousingListFilter['kind']) || 'all',
    unit: (params.get('unit') as HousingListFilter['unit']) || 'all',
    room: (params.get('room') as HousingListFilter['room']) || 'all',
    area: params.get('area') || 'all',
    perks: (params.get('perks') || '').split(',').filter(Boolean) as HousingPerkId[],
    min: num('min', 0),
    max: num('max', Number.MAX_SAFE_INTEGER),
  }
}
