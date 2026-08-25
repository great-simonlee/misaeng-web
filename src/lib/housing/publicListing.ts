import type { HousingListing } from '@/types/nyc'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function getHousingMapCoordinates(listing: HousingListing): {
  latitude: number
  longitude: number
} | null {
  const { latitude, longitude } = listing.property
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return null
  if (latitude === 0 && longitude === 0) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

/** Public JSON: keep displayed address only — no exact address or coordinates. */
export function toPublicHousingListing(listing: HousingListing): HousingListing {
  return {
    ...listing,
    property: {
      ...listing.property,
      address: '',
      latitude: null,
      longitude: null,
    },
    unit: {
      ...listing.unit,
      unitNumber: null,
    },
  }
}
