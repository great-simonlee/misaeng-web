import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { MyPostsScreen } from '@screens/nyc/MyPostsScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'myPosts', { withoutCity: true, noindex: true })
}

export default function NycMyPostsPage() {
  return <MyPostsScreen />
}
