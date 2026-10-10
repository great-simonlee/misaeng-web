import type { Metadata } from 'next'

import { NycCarouselTestScreen } from '@screens/nyc/NycCarouselTestScreen'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NycCarouselTestPage() {
  return <NycCarouselTestScreen />
}
