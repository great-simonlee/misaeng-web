import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { MyLikesScreen } from '@screens/nyc/MyLikesScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'myLikes', { withoutCity: true, noindex: true })
}

export default function NycMyLikesPage() {
  return <MyLikesScreen />
}
