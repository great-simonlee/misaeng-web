import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Navbar } from '@widgets/Navbar'
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
  title: 'Misaeng – Ellieo | Verified Housing for New York City Students & Professionals',
  description:
    'Official corporate site for Misaeng and Ellieo—next-gen housing platform for New York City. Identity verification, scam prevention, roommate matching. U.S. business expansion.',
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
        <div className='flex min-h-screen flex-col'>
          <Navbar />

          <main className='flex-1 pt-14 md:pt-0'>{children}</main>

          <footer className='border-t border-[#F64310]/20 bg-[#0f172a] px-4 py-6 text-sm text-white/80 sm:px-6 sm:py-8 lg:px-8'>
            <div className='mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
              <div className='min-w-0 space-y-1.5'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-white/60'>
                  US Headquarters
                </div>
                <p className='max-w-xs text-sm leading-relaxed text-white/90 sm:text-base'>
                  45 Rockefeller Plaza, Fl 20, New York, NY 10111
                </p>
              </div>
              <div className='min-w-0 space-y-1.5'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-white/60'>
                  Status
                </div>
                <p className='max-w-xs text-sm leading-relaxed text-white/90 sm:text-base'>
                  Official launch: <strong className='text-white'>Spring 2026</strong>.
                  <br />
                  Currently in controlled market rollout.
                </p>
              </div>
              <div className='min-w-0 space-y-1.5'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-white/60'>
                  Corporate
                </div>
                <p className='text-sm text-white/90 sm:text-base'>© 2026 Misaeng LLC. All Rights Reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
