import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND, BRAND_CONFIG } from '@lib/brand'
import { MisaengAppsScreen } from '@screens/mobile-app/MisaengAppsScreen'
import { MobileAppScreen } from '@screens/mobile-app/MobileAppScreen'

/** 앱 소개: misaeng.com은 미생·엘리오 두 앱, ellieo는 엘리오 앱 */
export const metadata: Metadata =
  BRAND === 'misaeng'
    ? {
        title: 'Mobile Apps — Misaeng & Ellieo',
        description:
          'Download Misaeng (Korean · English) and Ellieo (Vietnamese · English) for iOS and Android. Rentals, real estate brokerage, roommate matching, jobs and community.',
      }
    : {
        title: 'Mobile App — Ellieo',
        description:
          'Download the Ellieo app for iOS and Android. Verified listings, roommate matching, and secure messaging for NYC.',
      }

export default function MobileAppPage() {
  if (!BRAND_CONFIG.hasMobileAppPage) notFound()
  return BRAND === 'misaeng' ? <MisaengAppsScreen /> : <MobileAppScreen />
}
