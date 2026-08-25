import { NextResponse } from 'next/server'

import { searchAddresses } from '@lib/community/places.server'
import { getListingArea, getListingDisplayAddress } from '@lib/housing/listing'
import { getHousingMapCoordinates } from '@lib/housing/publicListing'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import type { HousingListing } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HousingMapRouteProps {
  params: Promise<{ id: string }>
}

function mapSearchQuery(listing: HousingListing) {
  const coords = getHousingMapCoordinates(listing)
  if (coords) return `${coords.latitude},${coords.longitude}`
  const displayed = getListingDisplayAddress(listing).trim()
  const area = getListingArea(listing).trim()
  return [displayed, area, 'New York, NY'].filter(Boolean).join(', ')
}

function googleOpenHref(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

async function resolveCoordinates(listing: HousingListing) {
  const stored = getHousingMapCoordinates(listing)
  if (stored) return stored

  const query = mapSearchQuery(listing)
  if (!query.trim()) return null

  try {
    const results = await searchAddresses(query)
    const hit = results.find(
      (item) =>
        item.latitude != null &&
        item.longitude != null &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude),
    )
    if (!hit || hit.latitude == null || hit.longitude == null) return null
    return { latitude: hit.latitude, longitude: hit.longitude }
  } catch {
    return null
  }
}

export async function GET(request: Request, { params }: HousingMapRouteProps) {
  try {
    const { id } = await params
    const listing = await getStoredHousingListing(id)
    if (!listing || listing.status === 'closed') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const query = mapSearchQuery(listing)
    const mapsUrl = googleOpenHref(query)
    const openExternal = new URL(request.url).searchParams.get('open') === '1'
    if (openExternal) {
      return NextResponse.redirect(mapsUrl, 302)
    }

    const coords = await resolveCoordinates(listing)
    const name = getListingDisplayAddress(listing) || '위치'
    const neighborhood = getListingArea(listing).trim()
    const address = neighborhood
      ? `${neighborhood}, New York`
      : 'New York'

    return NextResponse.json({
      name,
      address,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      mapsUrl,
    })
  } catch (error) {
    console.error('Housing map error:', error)
    return NextResponse.json({ error: 'Failed to load map.' }, { status: 500 })
  }
}
