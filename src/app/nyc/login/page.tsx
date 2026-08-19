import { LoadingState } from '@components'
import { Suspense } from 'react'

import { NycLoginScreen } from '@screens/nyc/NycLoginScreen'

export default function NycLoginPage() {
  return (
    <Suspense
      fallback={<LoadingState fullPage />}
    >
      <NycLoginScreen />
    </Suspense>
  )
}
