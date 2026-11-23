import type { Metadata } from 'next'
import { Suspense } from 'react'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { MarketInboxScreen } from '@screens/nyc/MarketInboxScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'marketInbox', { withoutCity: true, noindex: true })
}

export default function MarketInboxPage() {
  return (
    <Suspense>
      <MarketInboxScreen />
    </Suspense>
  )
}
