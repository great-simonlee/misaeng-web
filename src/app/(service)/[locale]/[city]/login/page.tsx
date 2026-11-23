import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { LoadingState } from '@components'
import { Suspense } from 'react'

import { NycLoginScreen } from '@screens/nyc/NycLoginScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'login', { withoutCity: true, noindex: true })
}

export default function NycLoginPage() {
  return (
    <Suspense
      fallback={<LoadingState fullPage />}
    >
      <NycLoginScreen />
    </Suspense>
  )
}
