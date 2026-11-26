import { NextResponse } from 'next/server'
import { localizeListing } from '@lib/translations/localize.server'
import { getRequestLocale } from '@lib/i18n/server'

import { toPublicHousingListing } from '@lib/housing/publicListing'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import { agentHousingListing } from '@lib/agents/listings.server'
import { getBrokerageSettings, withMisaengDisclosure } from '@lib/agents/brokerage.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HousingDetailRouteProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: HousingDetailRouteProps) {
  try {
    const { id } = await params
    // Licensed agents' listings (misaeng_listings) use ids `agent-<uuid>`.
    if (id.startsWith('agent-')) {
      const agent = await agentHousingListing(id)
      if (!agent) return NextResponse.json({ listing: null }, { status: 404 })
      return NextResponse.json({ listing: toPublicHousingListing(agent) })
    }
    const listing = await getStoredHousingListing(id)
    if (!listing || listing.status === 'closed') {
      return NextResponse.json({ listing: null }, { status: 404 })
    }
    const locale = await getRequestLocale(request)
    const [disclosed] = withMisaengDisclosure([listing], await getBrokerageSettings())
    return NextResponse.json({
      listing: toPublicHousingListing(localizeListing(disclosed, locale)),
    })
  } catch (error) {
    console.error('Housing detail error:', error)
    return NextResponse.json(
      { listing: null, error: 'Failed to load housing listing.' },
      { status: 500 },
    )
  }
}
