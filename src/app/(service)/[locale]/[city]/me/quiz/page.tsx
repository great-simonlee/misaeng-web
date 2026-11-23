import type { Metadata } from 'next'

import { namedCityPageMetadata } from '@lib/i18n/cityMetadata.server'
import { Suspense } from 'react'

import { LoadingState } from '@components'
import { OnboardingQuizScreen } from '@screens/nyc/OnboardingQuizScreen'

interface MetaProps {
  params: Promise<{ locale: string; city: string }>
}

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale, city } = await params
  return namedCityPageMetadata(locale, city, 'quiz', { withoutCity: true, noindex: true })
}

export default function NycOnboardingQuizPage() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <OnboardingQuizScreen />
    </Suspense>
  )
}
