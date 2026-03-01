import Link from 'next/link'
import Image from 'next/image'
import { Hero } from '@widgets/Hero'

/** 아이콘: 검증 배지 */
function IconVerified() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
      />
    </svg>
  )
}

/** 아이콘: 사람들 */
function IconRoommates() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
      />
    </svg>
  )
}

/** 아이콘: 방/집 */
function IconHome() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25'
      />
    </svg>
  )
}

/** 아이콘: 맵 핀 */
function IconMap() {
  return (
    <svg
      className='h-8 w-8 shrink-0'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      aria-hidden='true'
      strokeWidth={1.5}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z'
      />
    </svg>
  )
}

/**
 * 랜딩 페이지
 * - Hero: 유지
 * - 아래: Ellieo 소개 및 생동감 있는 디자인
 */
export function HomeScreen() {
  return (
    <div className='flex flex-col overflow-x-hidden'>
      <Hero />

      {/* We're hiring — compact CTA strip */}
      <section
        id='careers'
        className='relative overflow-hidden bg-[var(--foreground)] py-12 sm:py-20 md:py-24'
        aria-labelledby='careers-heading'
      >
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(246,67,16,0.2),transparent)]' />
        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:gap-8 sm:text-left'>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F64310]'>
                We&apos;re hiring
              </p>
              <h2
                id='careers-heading'
                className='mt-1.5 text-lg font-bold tracking-tight text-white sm:mt-2 sm:text-2xl'
              >
                Join Misaeng in New York City
              </h2>
              <p className='mt-1 max-w-xl text-sm text-white/80 sm:mt-1.5'>
                Partnership & Operations Intern · Marketing Intern. Grow with us from the ground up.
              </p>
            </div>
            <Link
              href='/careers'
              className='shrink-0 rounded-full border-2 border-white bg-white px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition active:scale-[0.98] hover:bg-white/95 hover:border-white/90 sm:px-6 sm:py-3'
            >
              View open positions →
            </Link>
          </div>
        </div>
      </section>

      {/* About Ellieo — editorial block */}
      <section
        id='about-ellieo'
        className='relative overflow-hidden bg-[var(--background)] py-12 sm:py-20 md:py-24'
        aria-labelledby='about-ellieo-title'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='grid gap-8 sm:gap-12 lg:grid-cols-12 lg:gap-16'>
            <div className='lg:col-span-5'>
              <span className='inline-block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F64310]'>
                What is Ellieo?
              </span>
              <h2
                id='about-ellieo-title'
                className='mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:mt-4 sm:text-4xl md:text-[2.75rem] md:leading-[1.15]'
              >
                Next-gen housing,
                <br />
                <span className='text-[#F64310]'>built for trust.</span>
              </h2>
            </div>
            <div className='space-y-4 sm:space-y-5 lg:col-span-7 lg:pt-2'>
              <p className='text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base sm:text-lg'>
                <strong className='font-semibold text-[var(--foreground)]'>Ellieo</strong> is
                Misaeng’s flagship app for students and professionals in New York City. We combine
                verified listings, identity-checked roommates, and scam-resistant flows so you can
                find a place—and roommates—you can trust.
              </p>
              <p className='text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base'>
                No fake ads. No surprise fees. Just transparent, secure housing search and
                matching—backed by identity verification and a focus on safety first.
              </p>
              <div className='flex flex-wrap gap-2 pt-1 sm:gap-3 sm:pt-2'>
                <span className='rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] sm:px-4 sm:py-2 sm:text-sm'>
                  Verified listings
                </span>
                <span className='rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] sm:px-4 sm:py-2 sm:text-sm'>
                  Identity-checked roommates
                </span>
                <span className='rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] sm:px-4 sm:py-2 sm:text-sm'>
                  Scam-resistant
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ellieo — logo between Why & Ellieo, darker blue highlight */}
      <section
        id='our-service'
        className='relative overflow-hidden bg-[var(--background)] py-12 sm:py-20 md:py-24'
        aria-labelledby='why-ellieo-heading'
      >
        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='grid gap-8 sm:gap-12 lg:grid-cols-12 lg:gap-16'>
            <div className='lg:col-span-5'>
              <span className='inline-block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#3478F6]'>
                Three pillars
              </span>
              <h2
                id='why-ellieo-heading'
                className='mt-3 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:mt-4 sm:gap-3 sm:text-4xl md:text-[2.75rem] md:leading-[1.15]'
              >
                Why
                <Image
                  src='/img/ellieo_logo.png'
                  alt='Ellieo'
                  width={48}
                  height={48}
                  className='h-9 w-9 object-contain sm:h-11 sm:w-11'
                  aria-hidden
                />
                <span className='bg-gradient-to-b from-[#52B5EE] to-[#3478F6] bg-clip-text text-transparent'>
                  Ellieo?
                </span>
              </h2>
              <p className='mt-3 text-sm text-[var(--muted-foreground)] sm:mt-4 sm:text-lg'>
                Three pillars that make finding a home and roommates safer and simpler.
              </p>
            </div>
            <div className='space-y-6 sm:space-y-8 lg:col-span-7 lg:pt-2'>
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3478F6]/18 text-[#3478F6] sm:h-10 sm:w-10'>
                    <IconVerified />
                  </span>
                  <h3 className='text-base font-bold text-[var(--foreground)] sm:text-xl'>
                    Verified Housing
                  </h3>
                </div>
                <p className='text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base'>
                  Every listing is vetted. We verify properties and landlords so you avoid scams and
                  hidden fees—from search to lease.
                </p>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3478F6]/18 text-[#3478F6] sm:h-10 sm:w-10'>
                    <IconRoommates />
                  </span>
                  <h3 className='text-base font-bold text-[var(--foreground)] sm:text-xl'>
                    Roommate Matching
                  </h3>
                </div>
                <p className='text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base'>
                  Get matched with roommates based on lifestyle, budget, and location. Identity
                  verification keeps everyone accountable and safe.
                </p>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3478F6]/18 text-[#3478F6] sm:h-10 sm:w-10'>
                    <IconHome />
                  </span>
                  <h3 className='text-base font-bold text-[var(--foreground)] sm:text-xl'>
                    Scam Prevention
                  </h3>
                </div>
                <p className='text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base'>
                  Identity verification and listing checks are built in. No fake ads, no
                  bait-and-switch—just transparent, secure housing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New York City First — horizontal layout */}
      <section
        id='roadmap'
        className='relative overflow-hidden border-t border-[var(--border)] bg-[var(--surface)] pt-12 sm:pt-20 md:pt-24'
        aria-labelledby='roadmap-heading'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-xl md:grid-cols-[1.1fr_1fr]'>
            <div className='relative aspect-[16/10] w-full min-h-[180px] sm:min-h-[200px] md:aspect-auto md:min-h-[260px]'>
              <Image
                src='/img/banner_1.png'
                alt='New York City skyline'
                fill
                className='object-cover object-center'
                sizes='(max-width: 768px) 100vw, 55vw'
                priority={false}
              />
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 md:to-transparent' />
              <span className='absolute bottom-3 left-3 rounded-full bg-[#F64310] px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5'>
                New York City · 2026
              </span>
            </div>
            <div className='flex flex-col justify-center p-4 sm:p-6 md:p-7 lg:p-8'>
              <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F64310]'>
                Roadmap
              </p>
              <h2
                id='roadmap-heading'
                className='mt-1.5 text-lg font-bold tracking-tight text-[var(--foreground)] sm:mt-2 sm:text-2xl md:text-3xl'
              >
                New York City first—then we scale
              </h2>
              <p className='mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-3 sm:text-base'>
                Ellieo launches in New York City in 2026. We’re building density and trust in one
                market first, then expanding to Boston, Chicago, and LA. Our roadmap is built for
                national scale—one city at a time.
              </p>
              <div className='mt-4 flex flex-wrap gap-2 sm:mt-5'>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm'>
                  <span className='h-1.5 w-1.5 rounded-full bg-[#F64310]' aria-hidden />
                  Boston
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm'>
                  <span className='h-1.5 w-1.5 rounded-full bg-[#F64310]' aria-hidden />
                  Chicago
                </span>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] sm:px-3.5 sm:py-2 sm:text-sm'>
                  <span className='h-1.5 w-1.5 rounded-full bg-[#F64310]' aria-hidden />
                  LA
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners — light CTA */}
      <section
        id='partners'
        className='relative overflow-hidden bg-[var(--surface)] py-12 sm:py-20 md:py-24'
        aria-labelledby='partners-heading'
      >
        <div className='mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8'>
          <h2
            id='partners-heading'
            className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-4xl'
          >
            Partner with Ellieo
          </h2>
          <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:text-lg'>
            Landlords and strategic partners: we’re building the future of verified,
            student-friendly housing together. Get in touch to list properties, explore
            integrations, or join our ecosystem.
          </p>
          <Link
            href='https://ellieo.com/#early'
            target='_blank'
            rel='noopener noreferrer'
            className='mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#F64310] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#F64310]/25 transition active:scale-[0.98] hover:bg-[#d93a0e] hover:shadow-xl hover:shadow-[#F64310]/30 sm:mt-8 sm:px-8 sm:py-3.5'
          >
            Join Early Access
          </Link>
          <p className='mt-4 text-xs text-[var(--muted-foreground)] sm:mt-6'>
            Partner & partnership inquiries and early access are handled on Ellieo.
          </p>
        </div>
      </section>
    </div>
  )
}
