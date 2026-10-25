import { Suspense } from 'react'

import { LoadingState } from '@components'
import { MyPageScreen } from '@screens/nyc/MyPageScreen'

export default function NycMyPage() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <MyPageScreen />
    </Suspense>
  )
}
