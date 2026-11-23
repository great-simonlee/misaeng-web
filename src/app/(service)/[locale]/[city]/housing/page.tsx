import type { Metadata } from 'next'

import { cityDescription, namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { HousingListScreen } from '@screens/nyc/HousingListScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'housing', { description: await cityDescription(locale, city, 'housing') })
}

export default function HousingPage() {
  return <HousingListScreen />
}
