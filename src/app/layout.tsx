import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { AuthProvider } from '@hooks/useAuth'
import { ToastProvider } from '@hooks/useToast'
import { SiteFooter } from '@widgets/SiteFooter'
import { SiteHeader } from '@widgets/SiteHeader'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://misaeng.com'),
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-w-0 overflow-x-hidden antialiased bg-[var(--background)] text-[var(--foreground)]`}
        suppressHydrationWarning
      >
        <div className='flex min-h-dvh flex-col'>
          <AuthProvider>
            <ToastProvider>
              <SiteHeader />

              <main className='flex flex-1 flex-col pt-14 md:pt-0'>
                {children}
              </main>

              <SiteFooter />
            </ToastProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
