import type { CityId } from '@lib/constants/cities'
import { normalizeHousingListing } from '@lib/housing/normalize'
import type { HousingListing } from '@/types/nyc'

export async function fetchHousingListings(
  city?: CityId,
): Promise<HousingListing[]> {
  try {
    const query = city ? `?city=${encodeURIComponent(city)}` : ''
    const res = await fetch(`/api/housing${query}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { listings?: unknown }
    if (!Array.isArray(data.listings)) return []
    return data.listings
      .map((item) => normalizeHousingListing(item))
      .filter((item): item is HousingListing => Boolean(item))
      .filter((item) => item.status === 'open')
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export async function fetchHousingListing(
  id: string,
): Promise<HousingListing | null> {
  const listingId = String(id || '').trim()
  if (!listingId) return null
  try {
    const res = await fetch(`/api/housing/${encodeURIComponent(listingId)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { listing?: unknown }
    return normalizeHousingListing(data.listing)
  } catch {
    return null
  }
}

export function shouldUnoptimizeHousingImage(src: string) {
  return !src.includes('images.unsplash.com')
}

/** 한 페이지 (GET /api/housing?limit=&cursor= + 필터): 웹 하우징 목록의 무한 스크롤 (owner 11-23) */
export async function fetchHousingPage(input: {
  city?: CityId
  limit: number
  cursor?: string | null
  filter: Record<string, string>
  signal?: AbortSignal
}): Promise<{ listings: HousingListing[]; nextCursor: string | null; total: number; areaCounts: Record<string, number> }> {
  const params = new URLSearchParams({ limit: String(input.limit), ...input.filter })
  if (input.city) params.set('city', input.city)
  if (input.cursor) params.set('cursor', input.cursor)
  const res = await fetch(`/api/housing?${params.toString()}`, { cache: 'no-store', signal: input.signal })
  if (!res.ok) throw new Error('housing page failed')
  const data = (await res.json()) as { listings?: unknown; nextCursor?: string | null; total?: number; areaCounts?: Record<string, number> }
  const listings = (Array.isArray(data.listings) ? data.listings : [])
    .map((item) => normalizeHousingListing(item))
    .filter((item): item is HousingListing => Boolean(item))
  return { listings, nextCursor: data.nextCursor ?? null, total: data.total ?? listings.length, areaCounts: data.areaCounts ?? {} }
}
