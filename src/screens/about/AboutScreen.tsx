'use client'

import Image from 'next/image'

import { AboutTeamSection } from './AboutTeamSection'

export function AboutScreen() {
  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[var(--background)]'>
      {/* Hero */}
      <header className='bg-[var(--background)]'>
        <div className='mx-auto max-w-7xl px-4 py-8 text-center sm:px-6 sm:py-8 sm:text-left lg:px-8 lg:py-10'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
            About Us
          </p>
          <p className='mt-3 text-2xl font-light leading-tight tracking-tight text-[var(--foreground)] sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl lg:leading-[1.1]'>
            Half the Rent, <span className='font-bold'>Twice the Story.</span>
          </p>
          <p className='mt-4 text-base font-semibold tracking-tight text-[#F64310] sm:mt-6 sm:text-xl md:text-2xl'>
            AI-Driven Roommate Matching <br className='sm:hidden' /> Built for New York City.
          </p>
          <p className='mt-3 text-sm leading-[1.65] text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:leading-[1.7]'>
            Transforming shared living through verified listings, <br className='sm:hidden' />{' '}
            structured compatibility, and
            <br className='sm:hidden' /> faster move-in coordination.
          </p>
        </div>
      </header>

      {/* SECTION 1 — The Meaning Behind the Slogan */}
      <section className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 pt-8 pb-8 text-center sm:px-6 sm:pt-12 sm:pb-14 sm:text-left lg:px-8'>
        <h2 className='text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl'>
          What We Stand For
        </h2>
        <p className='mt-3 text-base text-[var(--muted-foreground)]'>
          The Meaning Behind the Slogan
        </p>
        <div className='mt-6 space-y-6 sm:mt-10 sm:space-y-10 md:space-y-12'>
          {/* Half the Rent — image left, text right */}
          <article className='flex flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm md:flex-row md:gap-8'>
            <div className='relative h-44 w-full shrink-0 sm:h-52 md:h-auto md:min-h-[240px] md:w-[36%]'>
              <Image
                src='/img/halftherent.jpeg'
                alt='Half the Rent — shared living reduces cost when compatibility is verified'
                fill
                className='object-cover object-center'
                sizes='(max-width: 768px) 100vw, 36vw'
              />
            </div>
            <div className='flex min-w-0 flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 md:pl-0 md:pr-10 md:py-10'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[#F64310]'>
                Half the Rent
              </p>
              <h2 className='mt-1.5 text-lg font-bold tracking-tight text-[var(--foreground)] sm:mt-2 sm:text-xl md:text-2xl'>
                Cost shared, when it’s built on trust
              </h2>
              <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-4'>
                New York City rent is among the highest in the world. Shared living reduces cost—but
                only when roommate compatibility is structured and verified.
              </p>
            </div>
          </article>

          {/* Twice the Story — text left, image right */}
          <article className='flex flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm md:flex-row-reverse md:gap-8'>
            <div className='relative h-44 w-full shrink-0 sm:h-52 md:h-auto md:min-h-[240px] md:w-[36%]'>
              <Image
                src='/img/twicethestory.jpeg'
                alt='Twice the Story — aligned roommates create a positive living experience'
                fill
                className='object-cover object-center'
                sizes='(max-width: 768px) 100vw, 36vw'
              />
            </div>
            <div className='flex min-w-0 flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 md:pl-6 md:pr-0 md:py-10'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[#F64310]'>
                Twice the Story
              </p>
              <h2 className='mt-1.5 text-lg font-bold tracking-tight text-[var(--foreground)] sm:mt-2 sm:text-xl md:text-2xl'>
                More than a lease—a living fit
              </h2>
              <p className='mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-4'>
                When roommates are aligned in lifestyle, expectations, and communication style,
                shared housing becomes more than a financial decision—it becomes a positive living
                experience.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* SECTION 2 — AI + Verification */}
      <section className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 pt-8 pb-8 text-center sm:px-6 sm:pt-12 sm:pb-14 sm:text-left lg:px-8'>
        <h2 className='text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl'>
          Smarter Matching
        </h2>
        <p className='mt-3 text-base text-[var(--muted-foreground)]'>
          How Ellieo Improves Matching Success
        </p>
        <div className='mt-6 grid grid-cols-1 gap-4 text-left sm:mt-8 sm:gap-6 lg:grid-cols-2'>
          <div className='rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-8'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-[#F64310] sm:text-sm'>
              Ellieo integrates
            </h3>
            <ul className='mt-3 space-y-2 sm:mt-4 sm:space-y-2.5'>
              {[
                'Structured lifestyle compatibility scoring',
                'Behavioral preference analysis',
                'Identity-secured onboarding',
                'Verified listing operations',
                'New York City-specific rental intelligence',
              ].map((item, i) => (
                <li
                  key={i}
                  className='flex items-start gap-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:gap-2.5'
                >
                  <span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F64310]' />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className='rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-8'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-[#F64310] sm:text-sm'>
              Compatibility indicators we analyze
            </h3>
            <ul className='mt-3 space-y-2 sm:mt-4 sm:space-y-2.5'>
              {[
                'Work schedule alignment',
                'Cleanliness standards',
                'Social preferences',
                'Communication style',
                'Lease timing readiness',
              ].map((item, i) => (
                <li
                  key={i}
                  className='flex items-start gap-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:gap-2.5'
                >
                  <span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F64310]' />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className='mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-6'>
          This increases roommate success rates while reducing failed match risk and lease delays.
        </p>
      </section>

      <AboutTeamSection />

      {/* Office & Contact */}
      <section className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-16 lg:px-8'>
        <h2 className='text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl'>
          Get in Touch
        </h2>
        <p className='mt-3 text-base text-[var(--muted-foreground)]'>Office & Contact</p>
        <div className='mt-4 flex flex-col gap-1 text-sm text-[var(--foreground)] sm:mt-5 sm:gap-2'>
          <p className='font-medium'>45 Rockefeller Plaza, Fl 20, New York, NY 10111</p>
          <p>
            <span className='text-[var(--muted-foreground)]'>Email</span>{' '}
            <a
              href='mailto:info@misaeng.com'
              className='font-medium text-[#F64310] underline-offset-2 hover:underline'
            >
              info@misaeng.com
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
