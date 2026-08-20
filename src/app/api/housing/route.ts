import { NextResponse } from 'next/server'

import { listStoredHousingListings } from '@lib/supabase/housing.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const listings = await listStoredHousingListings()
    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Housing list error:', error)
    return NextResponse.json(
      { listings: [], error: 'Failed to load housing listings.' },
      { status: 500 },
    )
  }
}
