import { BRAND_CONFIG } from '@lib/brand'
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

/**
 * Public JSON: keep displayed address only — no exact address or coordinates.
 * Ellieo: the Misaeng team's addresses (housing@misaeng.com …) are replaced by Ellieo's contact address.
 */
export function toPublicHousingListing(listing: HousingListing): HousingListing {
  const ellieoContact =
    BRAND_CONFIG.id === 'ellieo'
      ? {
          contactEmail: BRAND_CONFIG.contactEmail,
          authorEmail: /@misaeng\.com$/i.test(listing.authorEmail) ? BRAND_CONFIG.contactEmail : listing.authorEmail,
        }
      : {}
  return {
    ...listing,
    ...ellieoContact,
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
