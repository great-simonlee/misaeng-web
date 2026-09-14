import { NextResponse } from 'next/server'

import { parseCityId } from '@lib/constants/cities'
import { toPublicHousingListing } from '@lib/housing/publicListing'
import { listStoredHousingListings } from '@lib/supabase/housing.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const city = parseCityId(new URL(request.url).searchParams.get('city'))
    const listings = (await listStoredHousingListings(city ?? undefined)).map(
      toPublicHousingListing,
    )
    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Housing list error:', error)
    return NextResponse.json(
      { listings: [], error: 'Failed to load housing listings.' },
      { status: 500 },
    )
  }
}
