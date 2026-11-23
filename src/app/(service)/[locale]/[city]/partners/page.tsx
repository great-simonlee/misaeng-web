import type { Metadata } from 'next'

import { cityDescription, namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { PartnerSchoolsScreen } from '@screens/nyc/PartnerSchoolsScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'partners', { description: await cityDescription(locale, city, 'partners') })
}

export default function NycPartnersPage() {
  return <PartnerSchoolsScreen />
}
