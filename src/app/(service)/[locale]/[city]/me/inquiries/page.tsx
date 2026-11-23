import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { MyInquiriesScreen } from '@screens/nyc/MyInquiriesScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'inquiries', { withoutCity: true, noindex: true })
}

export default function NycMyInquiriesPage() {
  return <MyInquiriesScreen />
}
