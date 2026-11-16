import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND, BRAND_CONFIG } from '@lib/brand'
import { MisaengAppsScreen } from '@screens/mobile-app/MisaengAppsScreen'
import { MobileAppScreen } from '@screens/mobile-app/MobileAppScreen'

/** 앱 소개: misaeng.com은 미생·엘리오 두 앱, ellieo는 엘리오 앱 */
const ELLIEO_TITLE = 'Mobile App — Ellieo'
const ELLIEO_DESCRIPTION =
  'The Ellieo app for iOS and Android is coming soon: housing, visas, jobs and everyday life for international students in the US.'

// The (corporate) layout's Open Graph is Misaeng's (misaeng.com): override it here for Ellieo.
export const metadata: Metadata =
  BRAND === 'misaeng'
    ? {
        title: 'Mobile Apps — Misaeng & Ellieo',
        description:
          'Download Misaeng (Korean · English) and Ellieo (Vietnamese · English) for iOS and Android. Rentals, real estate brokerage, roommate matching, jobs and community.',
      }
    : {
        title: ELLIEO_TITLE,
        description: ELLIEO_DESCRIPTION,
        alternates: { canonical: `${BRAND_CONFIG.siteUrl}/mobile-app` },
        openGraph: {
          title: ELLIEO_TITLE,
          description: ELLIEO_DESCRIPTION,
          url: `${BRAND_CONFIG.siteUrl}/mobile-app`,
          siteName: BRAND_CONFIG.name,
          locale: 'en_US',
          type: 'website',
          images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: ELLIEO_TITLE }],
        },
        twitter: { card: 'summary_large_image', title: ELLIEO_TITLE, description: ELLIEO_DESCRIPTION, images: ['/twitter-image.png'] },
      }

export default function MobileAppPage() {
  if (!BRAND_CONFIG.hasMobileAppPage) notFound()
  return BRAND === 'misaeng' ? <MisaengAppsScreen /> : <MobileAppScreen />
}
