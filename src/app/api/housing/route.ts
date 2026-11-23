import { NextResponse } from 'next/server'
import { localizeListings } from '@lib/translations/localize.server'
import { getRequestLocale } from '@lib/i18n/server'

import { parseCityId } from '@lib/constants/cities'
import { toPublicHousingListing } from '@lib/housing/publicListing'
import { listStoredHousingListings } from '@lib/supabase/housing.server'
import { pageAfter, pageLimit } from '@lib/community/listPage'
import { getListingArea } from '@lib/constants/housingMock'
import { matchesHousingFilter, readHousingFilter } from '@lib/housing/listFilter'
import { normalizeHousingListing } from '@lib/housing/normalize'
import type { HousingListing } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const city = parseCityId(params.get('city'))
    const locale = await getRequestLocale(request)
    const listings = localizeListings(
      await listStoredHousingListings(city ?? undefined),
      locale,
    ).map(toPublicHousingListing)
    // ?limit= (web list, owner 11-23): open listings newest first, filtered here, one page at a time.
    // Without it the full list as before (apps, hub).
    const limit = pageLimit(params.get('limit'))
    if (limit != null) {
      const open = listings
        .map((raw) => ({ raw, listing: normalizeHousingListing(raw) }))
        .filter((item): item is { raw: (typeof listings)[number]; listing: HousingListing } => Boolean(item.listing) && item.listing!.status === 'open')
        .sort((a, b) => b.listing.createdAt - a.listing.createdAt)
      // 동네 칩 숫자는 필터와 상관없이 전체 매물 기준 (화면이 예전에 하던 것과 같다)
      const areaCounts: Record<string, number> = {}
      for (const { listing } of open) areaCounts[getListingArea(listing)] = (areaCounts[getListingArea(listing)] ?? 0) + 1
      const filter = readHousingFilter(params)
      const matching = open.filter(({ listing }) => matchesHousingFilter(listing, filter)).map(({ raw, listing }) => ({ id: listing.id, raw }))
      const { page, nextCursor } = pageAfter(matching, params.get('cursor'), limit)
      return NextResponse.json({ listings: page.map((item) => item.raw), nextCursor, total: matching.length, areaCounts })
    }
    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Housing list error:', error)
    return NextResponse.json(
      { listings: [], error: 'Failed to load housing listings.' },
      { status: 500 },
    )
  }
}
