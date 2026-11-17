import { NextResponse } from 'next/server'

import { PointsStoreError } from '@lib/points/rest.server'
import { getPublishedVisaBulletin } from '@lib/visaNews/visaNews.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/visa-bulletin → { current: { month: "2026-11", sourceUrl, finalAction, datesForFiling } | null, previous }
 * Employment-based dates of the latest published Visa Bulletin month and the month before.
 */
export async function GET() {
  try {
    return NextResponse.json(await getPublishedVisaBulletin(), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
    })
  } catch (error) {
    if (error instanceof PointsStoreError && error.setupRequired) return NextResponse.json({ current: null, previous: null })
    console.error('Visa bulletin error:', error)
    return NextResponse.json({ error: 'Failed to load the visa bulletin.' }, { status: 500 })
  }
}
