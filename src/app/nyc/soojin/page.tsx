import type { Metadata } from 'next'

import { SoojinScreen } from '@screens/nyc/SoojinScreen'

export const metadata: Metadata = {
  title: 'Soo Jin Hwang | Misaeng NYC',
  robots: { index: false, follow: false },
}

export default function NycSoojinPage() {
  return <SoojinScreen />
}
