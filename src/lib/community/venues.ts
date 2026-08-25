import type { CommunityPost } from '@/types/nyc'

const EARTH_RADIUS_M = 6371000
/** 같은 장소로 볼 거리 (약 건물/블록 단위) */
export const FOOD_VENUE_NEARBY_METERS = 120

export type FoodVenueOption = {
  name: string
  count: number
  placeId: string | null
  latitude: number | null
  longitude: number | null
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** 좌표/placeId 기준으로 기존 맛집 글에서 음식점 이름 후보 추출 */
export function collectNearbyFoodVenues(
  posts: CommunityPost[],
  input: {
    latitude: number
    longitude: number
    placeId?: string | null
    radiusMeters?: number
  },
): FoodVenueOption[] {
  const radius = input.radiusMeters ?? FOOD_VENUE_NEARBY_METERS
  const placeId = input.placeId?.trim() || null
  const counts = new Map<
    string,
    {
      name: string
      count: number
      placeId: string | null
      latitude: number | null
      longitude: number | null
    }
  >()

  for (const post of posts) {
    if (post.categoryId !== 'food' || post.status !== 'open') continue
    const name = post.title?.trim() || post.placeName?.trim() || ''
    if (!name) continue

    const lat = post.latitude
    const lng = post.longitude
    const samePlaceId =
      Boolean(placeId) &&
      Boolean(post.placeId?.trim()) &&
      placeId === post.placeId?.trim()
    const nearby =
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      distanceMeters(input.latitude, input.longitude, lat, lng) <= radius

    if (!samePlaceId && !nearby) continue

    const key = name.toLowerCase()
    const prev = counts.get(key)
    if (prev) {
      prev.count += 1
      if (!prev.placeId && post.placeId) prev.placeId = post.placeId
    } else {
      counts.set(key, {
        name,
        count: 1,
        placeId: post.placeId ?? null,
        latitude: lat,
        longitude: lng,
      })
    }
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'),
  )
}
