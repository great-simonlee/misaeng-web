import { Suspense } from 'react'

import { LoadingState } from '@components'
import { OnboardingQuizScreen } from '@screens/nyc/OnboardingQuizScreen'

export default function NycOnboardingQuizPage() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <OnboardingQuizScreen />
    </Suspense>
  )
}
