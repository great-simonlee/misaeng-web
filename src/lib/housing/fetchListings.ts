import { normalizeHousingListing } from '@lib/housing/normalize'
import type { HousingListing } from '@/types/nyc'

export async function fetchHousingListings(): Promise<HousingListing[]> {
  try {
    const res = await fetch('/api/housing', { cache: 'no-store' })
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
