import type { Metadata } from 'next'

import { cityDescription, namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { InfluencersScreen } from '@screens/nyc/InfluencersScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'influencers', { description: await cityDescription(locale, city, 'influencers') })
}

export default function NycInfluencersPage() {
  return <InfluencersScreen />
}
