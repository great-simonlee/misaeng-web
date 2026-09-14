import type { Metadata } from 'next'

import { NycCarouselTestScreen } from '@screens/nyc/NycCarouselTestScreen'

export const metadata: Metadata = {
  title: 'Misaeng NYC 캐러셀 시안',
  robots: { index: false, follow: false },
}

export default function NycCarouselTestPage() {
  return <NycCarouselTestScreen />
}
