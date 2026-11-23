import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { MyPageScreen } from '@screens/nyc/MyPageScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'me', { withoutCity: true, noindex: true })
}

export default function NycMyPage() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <MyPageScreen />
    </Suspense>
  )
}
