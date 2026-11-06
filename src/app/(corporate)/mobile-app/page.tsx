import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { MobileAppScreen } from '@screens/mobile-app/MobileAppScreen'

/** Ellieo 앱 소개 (ellieo 브랜드에만 있다) */
const TITLE = 'Mobile App — Ellieo'
const DESCRIPTION =
  'Download the Ellieo app for iOS and Android. Verified listings, roommate matching, and secure messaging for NYC.'

// The (corporate) layout's Open Graph is Misaeng's (misaeng.com): override it here for Ellieo.
// TODO(user decision): the page itself still describes the old Ellieo app — keep, rewrite or remove.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND_CONFIG.siteUrl}/mobile-app` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND_CONFIG.siteUrl}/mobile-app`,
    siteName: BRAND_CONFIG.name,
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/twitter-image.png'] },
}

export default function MobileAppPage() {
  if (!BRAND_CONFIG.hasMobileAppPage) notFound()
  return <MobileAppScreen />
}
