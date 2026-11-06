import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { NycCarouselTestScreen } from '@screens/nyc/NycCarouselTestScreen'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NycCarouselTestPage() {
  // Design test page: dev servers only
  if (process.env.NODE_ENV === 'production') notFound()
  return <NycCarouselTestScreen />
}
