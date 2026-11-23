import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { HousingNewScreen } from '@screens/nyc/HousingNewScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'housingNew', { noindex: true })
}

export default function HousingNewPage() {
  return <HousingNewScreen />
}
