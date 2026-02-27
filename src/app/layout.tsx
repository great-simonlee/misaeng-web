import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
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
  title: 'misaeng – Ready Engine, Paused Rocket',
  description:
    'Official Launching in Spring 2026 – A high-end housing platform for NYC. A fully prepared engine, a rocket waiting for launch.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-950`}
      >
        <div className='flex min-h-screen flex-col bg-linear-to-b from-white via-white to-zinc-50'>
          <header className='border-b border-zinc-200/80 bg-white/80 backdrop-blur'>
            <div className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8'>
              <Link href='/' className='flex items-center gap-2'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6C25] text-xs font-semibold text-white shadow-[0_0_24px_rgba(255,108,37,0.55)]'>
                  mi
                </div>
                <div className='flex flex-col leading-tight'>
                  <span className='text-sm font-semibold tracking-[0.18em] text-zinc-200'>
                    MISAENG
                  </span>
                  <span className='text-xs text-zinc-500'>
                    Ready engine, paused rocket
                  </span>
                </div>
              </Link>
              <nav className='flex items-center gap-6 text-xs sm:text-sm'>
                <Link href='/' className='text-zinc-700 transition hover:text-zinc-950'>
                  Home
                </Link>
                <Link href='/about' className='text-zinc-700 transition hover:text-zinc-950'>
                  About
                </Link>
                <Link href='/careers' className='text-zinc-700 transition hover:text-zinc-950'>
                  Careers
                </Link>
                <Link href='/contact' className='text-zinc-700 transition hover:text-zinc-950'>
                  Contact
                </Link>
                <span className='rounded-full border border-[#FF6C25]/40 bg-[#FF6C25]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#FF6C25]'>
                  Beta · Market Research Only
                </span>
              </nav>
            </div>
          </header>

          <main className='flex-1'>
            {children}
          </main>

          <footer className='border-t border-zinc-200/80 bg-white px-4 py-8 text-xs text-zinc-500 sm:px-6 lg:px-8'>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500'>
                  US Headquarters
                </div>
                <p className='max-w-xs leading-relaxed'>
                  45 Rockefeller Plaza, New York, NY 10111
                </p>
              </div>
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500'>
                  Launch Status
                </div>
                <p className='max-w-xs leading-relaxed'>
                  This website is a{' '}
                  <span className='font-semibold text-zinc-900'>beta version for market research</span>
                  , and any real brokerage, contracts, or payments will only be available{' '}
                  <span className='font-semibold text-zinc-900'>
                    after the official launch in Spring 2026
                  </span>
                  .
                </p>
              </div>
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500'>
                  Corporate
                </div>
                <p>© 2026 misaeng. All Rights Reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
