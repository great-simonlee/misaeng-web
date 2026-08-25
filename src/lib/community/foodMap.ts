import type { CommunityPost } from '@/types/nyc'

/** NYC 대략 중심 (핀이 없을 때) */
export const NYC_MAP_CENTER = { lat: 40.758, lng: -73.985 } as const
export const NYC_MAP_DEFAULT_ZOOM = 12

export type FoodMapPin = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  /** 최신순 */
  posts: CommunityPost[]
}

function hasValidCoords(post: Pick<CommunityPost, 'latitude' | 'longitude'>) {
  const { latitude: lat, longitude: lng } = post
  if (lat == null || lng == null) return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  return true
}

export function hasFoodMapCoords(
  post: Pick<CommunityPost, 'latitude' | 'longitude'>,
) {
  return hasValidCoords(post)
}

export type FoodPlacePoint = {
  name: string
  address: string
  latitude: number
  longitude: number
}

/** 상세 페이지용 단일 식당 좌표 */
export function resolveFoodPlacePoint(
  post: Pick<
    CommunityPost,
    'latitude' | 'longitude' | 'placeName' | 'title' | 'location'
  >,
): FoodPlacePoint | null {
  if (!hasValidCoords(post)) return null
  return {
    name:
      post.placeName?.trim() ||
      post.title?.trim() ||
      post.location?.trim() ||
      '맛집',
    address: post.location?.trim() || '',
    latitude: post.latitude as number,
    longitude: post.longitude as number,
  }
}

function pinKey(post: CommunityPost) {
  if (post.placeId?.trim()) return `place:${post.placeId.trim()}`
  const lat = post.latitude as number
  const lng = post.longitude as number
  return `geo:${lat.toFixed(4)},${lng.toFixed(4)}`
}

function pinName(post: CommunityPost) {
  return (
    post.placeName?.trim() ||
    post.title?.trim() ||
    post.location?.trim() ||
    '맛집'
  )
}

/** 좌표 있는 맛집 후기를 식당 단위로 묶어 지도 핀 생성 */
export function buildFoodMapPins(posts: CommunityPost[]): FoodMapPin[] {
  const byKey = new Map<string, FoodMapPin>()

  for (const post of posts) {
    if (!hasValidCoords(post)) continue
    const key = pinKey(post)
    const existing = byKey.get(key)
    if (existing) {
      existing.posts.push(post)
      if (!existing.name.trim() || existing.name === '맛집') {
        existing.name = pinName(post)
      }
      if (!existing.address.trim() && post.location?.trim()) {
        existing.address = post.location.trim()
      }
      continue
    }
    byKey.set(key, {
      id: key,
      name: pinName(post),
      address: post.location?.trim() || '',
      latitude: post.latitude as number,
      longitude: post.longitude as number,
      posts: [post],
    })
  }

  return Array.from(byKey.values()).map((pin) => ({
    ...pin,
    posts: [...pin.posts].sort((a, b) => b.createdAt - a.createdAt),
  }))
}
