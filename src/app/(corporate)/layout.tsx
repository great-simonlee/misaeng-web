import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { getClientMessages } from '@lib/i18n/messages.server'
import { RootDocument } from '@widgets/RootDocument'
import '../globals.css'

/** 회사 사이트 (about, careers …) — 영어 */
export const metadata: Metadata = {
  metadataBase: new URL(BRAND_CONFIG.siteUrl),
  icons: { icon: BRAND_CONFIG.assets.favicon },
  title: 'Misaeng & Ellieo | Everyday-Life Platforms for Housing, Roommates, Jobs & Community',
  description:
    'Misaeng LLC runs Misaeng (Korean · English) and Ellieo (Vietnamese · English), everyday-life platforms for students and professionals in the U.S.: rentals and real estate brokerage, roommate matching, jobs, visa info, a used-goods marketplace and community.',
  openGraph: {
    title: 'Misaeng & Ellieo | Everyday-Life Platforms for Housing, Roommates, Jobs & Community',
    description:
      'Misaeng LLC runs Misaeng (Korean · English) and Ellieo (Vietnamese · English), everyday-life platforms for students and professionals in the U.S.: rentals and real estate brokerage, roommate matching, jobs, visa info, a used-goods marketplace and community.',
    url: 'https://misaeng.com',
    siteName: 'Misaeng',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Misaeng & Ellieo everyday-life platforms',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Misaeng & Ellieo | Everyday-Life Platforms for Housing, Roommates, Jobs & Community',
    description:
      'Misaeng LLC runs Misaeng (Korean · English) and Ellieo (Vietnamese · English), everyday-life platforms for students and professionals in the U.S.: rentals and real estate brokerage, roommate matching, jobs, visa info, a used-goods marketplace and community.',
    images: ['/twitter-image.png'],
  },
}

export default async function CorporateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getClientMessages('en')
  return <RootDocument i18n={{ locale: 'en', messages }}>{children}</RootDocument>
}
