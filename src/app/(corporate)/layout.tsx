import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { getClientMessages } from '@lib/i18n/messages.server'
import { RootDocument } from '@widgets/RootDocument'
import '../globals.css'

/** 회사 사이트 (about, careers …) — 영어 */
export const metadata: Metadata = {
  metadataBase: new URL(BRAND_CONFIG.siteUrl),
  icons: { icon: BRAND_CONFIG.assets.favicon },
  title: 'Misaeng – Ellieo | Verified Housing for New York City Students & Professionals',
  description:
    'Official corporate site for Misaeng and Ellieo—next-gen housing platform for New York City. Identity verification, scam prevention, roommate matching. U.S. business expansion.',
  openGraph: {
    title: 'Misaeng – Ellieo | Verified Housing for New York City Students & Professionals',
    description:
      'Official corporate site for Misaeng and Ellieo—next-gen housing platform for New York City. Identity verification, scam prevention, roommate matching. U.S. business expansion.',
    url: 'https://misaeng.com',
    siteName: 'Misaeng',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Misaeng – Ellieo verified housing platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Misaeng – Ellieo | Verified Housing for New York City Students & Professionals',
    description:
      'Official corporate site for Misaeng and Ellieo—next-gen housing platform for New York City. Identity verification, scam prevention, roommate matching. U.S. business expansion.',
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
