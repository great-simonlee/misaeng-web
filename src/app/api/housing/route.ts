import { NextResponse } from 'next/server'

import { toPublicHousingListing } from '@lib/housing/publicListing'
import { listStoredHousingListings } from '@lib/supabase/housing.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const listings = (await listStoredHousingListings()).map(toPublicHousingListing)
    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Housing list error:', error)
    return NextResponse.json(
      { listings: [], error: 'Failed to load housing listings.' },
      { status: 500 },
    )
  }
}
