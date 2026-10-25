import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { MobileAppScreen } from '@screens/mobile-app/MobileAppScreen'

/** Ellieo 앱 소개 (ellieo 브랜드에만 있다) */
export const metadata: Metadata = {
  title: 'Mobile App — Ellieo',
  description:
    'Download the Ellieo app for iOS and Android. Verified listings, roommate matching, and secure messaging for NYC.',
}

export default function MobileAppPage() {
  if (!BRAND_CONFIG.hasMobileAppPage) notFound()
  return <MobileAppScreen />
}
