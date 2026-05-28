'use client'

import Image from 'next/image'
import { useState } from 'react'

/** Mobile-only (sm:hidden parent): full-width, 48px+ touch target, clean iOS-adjacent row */
function MobileReadBioButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-expanded='false'
      className='group flex w-full min-h-[52px] touch-manipulation items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] outline-none ring-0 transition-[transform,box-shadow,background-color,border-color] focus-visible:border-[#F64310]/40 focus-visible:ring-4 focus-visible:ring-[#F64310]/15 active:scale-[0.985] active:bg-[var(--surface-elevated)]'
    >
      <span className='min-w-0 flex-1'>
        <span className='block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]'>
          About
        </span>
        <span className='mt-0.5 block text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)]'>
          Read bio
        </span>
      </span>
      <span
        className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F64310]/[0.11] text-[#F64310] transition-transform duration-200 group-active:translate-y-px'
        aria-hidden
      >
        <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' strokeWidth={2.25} stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
        </svg>
      </span>
    </button>
  )
}

function MobileShowLessBioButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-expanded='true'
      className='group mt-5 flex w-full min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-transparent px-4 py-3 text-sm font-semibold tracking-tight text-[var(--muted-foreground)] outline-none transition-[transform,background-color,border-color,color] focus-visible:border-[var(--foreground)]/25 focus-visible:bg-[var(--surface-elevated)] focus-visible:text-[var(--foreground)] active:scale-[0.985]'
    >
      <span>Show less</span>
      <svg
        className='h-4 w-4 shrink-0 transition-transform duration-200 group-active:-translate-y-px'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={2.25}
        stroke='currentColor'
      >
        <path strokeLinecap='round' strokeLinejoin='round' d='M5 15l7-7 7 7' />
      </svg>
    </button>
  )
}

function MailRow({ email }: { email: string }) {
  return (
    <div className='mt-6 flex items-center gap-2.5'>
      <span
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F64310]/10 text-[#F64310]'
        aria-hidden
      >
        <svg
          className='h-4 w-4'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'
          />
        </svg>
      </span>
      <a
        href={`mailto:${email}`}
        className='text-sm font-medium text-[var(--foreground)] underline-offset-2 hover:underline'
      >
        {email}
      </a>
    </div>
  )
}

function Portrait({
  src,
  alt,
  priority,
}: {
  src: string
  alt: string
  priority?: boolean
}) {
  return (
    <div className='relative mx-auto aspect-square w-44 shrink-0 overflow-hidden rounded-full shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] ring-2 ring-[#F64310]/25 sm:w-52 md:mx-0 md:w-56'>
      <Image
        src={src}
        alt={alt}
        fill
        className='object-cover object-center'
        sizes='(max-width: 768px) 176px, 224px'
        priority={priority}
      />
    </div>
  )
}

const textBlock =
  'min-w-0 border-l-[3px] border-[#F64310] pl-5 sm:pl-7 md:max-w-2xl'

export function AboutTeamSection() {
  const [bioExpanded, setBioExpanded] = useState(false)
  const [mimiBioExpanded, setMimiBioExpanded] = useState(false)
  const [lauraBioExpanded, setLauraBioExpanded] = useState(false)

  return (
    <section
      className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 py-10 sm:px-6 sm:py-14 lg:px-8'
      aria-labelledby='about-team-heading'
    >
      <div className='max-w-2xl'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          Team
        </p>
        <h2
          id='about-team-heading'
          className='mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-4xl'
        >
          Meet Misaeng Team
        </h2>
        <div className='mt-4 h-1 w-14 rounded-full bg-[#F64310]' aria-hidden />
        <p className='mt-5 text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg'>
          The people you&apos;ll talk to—based in New York, here to help with tours, listings, and
          getting you settled.
        </p>
      </div>

      <div className='mt-14 space-y-0 md:mt-16'>
        {/* Seunghoon — photo left */}
        <article className='flex flex-col gap-10 md:grid md:grid-cols-[minmax(180px,34%)_1fr] md:items-center md:gap-x-12 md:gap-y-0 lg:gap-x-16'>
          <div className='flex justify-center md:justify-end md:pr-4'>
            <Portrait
              src='/img/simon_image.JPG'
              alt='Seunghoon Lee — Founder & Managing Member'
              priority
            />
          </div>
          <div className={textBlock}>
            <h3 className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'>
              Seunghoon Lee
            </h3>
            <p className='mt-1 text-sm font-semibold text-[#F64310]'>Founder & Managing Member</p>
            <p className='mt-1 text-xs leading-snug text-[var(--muted-foreground)] sm:text-sm'>
              Strategic Investment & Business Architecture
            </p>
            <div className='mt-5 hidden space-y-4 sm:block'>
              <p className='text-sm leading-[1.7] text-[var(--muted-foreground)]'>
                As the Founder and Major Investor of Misaeng, I am currently leading the strategic
                deployment of capital and the establishment of our U.S. operational infrastructure. My
                focus is on building a scalable business model that brings transparency to the New York
                City housing market through verified listings and professional, preference-based
                matching.
              </p>
              <p className='text-sm leading-[1.7] text-[var(--muted-foreground)]'>
                To maintain the highest level of governance, I oversee the high-level corporate strategy
                and investment roadmap, while our New York-based Operations Manager executes daily field
                activities and partnership management. This structural separation ensures that our
                expansion is driven by robust professional standards and long-term investment goals.
              </p>
            </div>
            <div className='mt-4 sm:hidden'>
              {bioExpanded ? (
                <>
                  <div className='space-y-4'>
                    <p className='text-sm leading-[1.7] text-[var(--muted-foreground)]'>
                      As the Founder and Major Investor of Misaeng, I am currently leading the strategic
                      deployment of capital and the establishment of our U.S. operational infrastructure.
                      My focus is on building a scalable business model that brings transparency to the
                      New York City housing market through verified listings and professional,
                      preference-based matching.
                    </p>
                    <p className='text-sm leading-[1.7] text-[var(--muted-foreground)]'>
                      To maintain the highest level of governance, I oversee the high-level corporate
                      strategy and investment roadmap, while our New York-based Operations Manager executes
                      daily field activities and partnership management. This structural separation
                      ensures that our expansion is driven by robust professional standards and long-term
                      investment goals.
                    </p>
                  </div>
                  <MobileShowLessBioButton onClick={() => setBioExpanded(false)} />
                </>
              ) : (
                <MobileReadBioButton onClick={() => setBioExpanded(true)} />
              )}
            </div>
            <MailRow email='simon@misaeng.com' />
          </div>
        </article>

        {/* Laura — photo right (mobile: photo first via flex-col-reverse) */}
        <article className='mt-12 flex flex-col-reverse gap-10 border-t border-[var(--border)] pt-12 md:mt-16 md:grid md:grid-cols-[1fr_minmax(180px,34%)] md:items-center md:gap-x-12 md:gap-y-0 lg:gap-x-16'>
          <div className={textBlock}>
            <h3 className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'>
              Laura Fanelli
            </h3>
            <p className='mt-1 text-sm font-semibold text-[#F64310]'>Sales & Operations Manager</p>
            <p className='mt-1 text-xs leading-snug text-[var(--muted-foreground)] sm:text-sm'>
              Team Lead of Business Operations & Talent Management
            </p>
            <div className='mt-5 hidden space-y-3 sm:block'>
              <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                As the Operations Manager at Misaeng, I oversee hiring, client relations, and on-site
                property tours for interested renters. I strive to find the right properties to match
                tenant preferences and that ultimately feel like home.
              </p>
              <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                At Misaeng, we find people looking for the same things in a home and help bring them
                together to make the hassle of finding a living situation in NYC smoother. It is my job to
                make sure you are not alone in the renting process, which can be vast and overwhelming.
                I&apos;ve lived in the city for over 10 years and bring that lived knowledge to finding you
                a spot that works best for you.
              </p>
            </div>
            <div className='mt-4 sm:hidden'>
              {lauraBioExpanded ? (
                <>
                  <div className='space-y-3'>
                    <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                      As the Operations Manager at Misaeng, I oversee hiring, client relations, and on-site
                      property tours for interested renters. I strive to find the right properties to match
                      tenant preferences and that ultimately feel like home.
                    </p>
                    <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                      At Misaeng, we find people looking for the same things in a home and help bring them
                      together to make the hassle of finding a living situation in NYC smoother. It is my
                      job to make sure you are not alone in the renting process, which can be vast and
                      overwhelming. I&apos;ve lived in the city for over 10 years and bring that lived
                      knowledge to finding you a spot that works best for you.
                    </p>
                  </div>
                  <MobileShowLessBioButton onClick={() => setLauraBioExpanded(false)} />
                </>
              ) : (
                <MobileReadBioButton onClick={() => setLauraBioExpanded(true)} />
              )}
            </div>
            <MailRow email='laura@misaeng.com' />
          </div>
          <div className='flex justify-center md:justify-start md:pl-4'>
            <Portrait
              src='/img/laura.png'
              alt='Laura Fanelli — Sales & Operations Manager, Team Lead of Business Operations & Talent Management'
            />
          </div>
        </article>

        {/* Mimi — photo left again */}
        <article className='mt-12 flex flex-col gap-10 border-t border-[var(--border)] pt-12 md:mt-16 md:grid md:grid-cols-[minmax(180px,34%)_1fr] md:items-center md:gap-x-12 md:gap-y-0 lg:gap-x-16'>
          <div className='flex justify-center md:justify-end md:pr-4'>
            <Portrait
              src='/img/mimi.png'
              alt='Mimi Nguyen — Sales Associate, Client Relations & Strategic Partnerships'
            />
          </div>
          <div className={textBlock}>
            <h3 className='text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'>
              Mimi Nguyen
            </h3>
            <p className='mt-1 text-sm font-semibold text-[#F64310]'>Sales Associate</p>
            <p className='mt-1 text-xs leading-snug text-[var(--muted-foreground)] sm:text-sm'>
              Client Relations & Strategic Partnerships
            </p>
            <div className='mt-5 hidden space-y-3 sm:block'>
              <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                As a Sales Client professional, I focus on building strong, long-term relationships with
                clients and delivering tailored solutions that drive measurable results. My approach centers
                on understanding client needs, ensuring exceptional service, and creating value at every
                stage of our partnership.
              </p>
              <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                I am committed to clear communication, attention to detail, and a client-first mindset that
                supports both immediate goals and long-term success. By aligning our services with each
                client&apos;s unique objectives, I help ensure their satisfaction and growth.
              </p>
            </div>
            <div className='mt-4 sm:hidden'>
              {mimiBioExpanded ? (
                <>
                  <div className='space-y-3'>
                    <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                      As a Sales Client professional, I focus on building strong, long-term relationships
                      with clients and delivering tailored solutions that drive measurable results. My
                      approach centers on understanding client needs, ensuring exceptional service, and
                      creating value at every stage of our partnership.
                    </p>
                    <p className='text-sm leading-[1.65] text-[var(--muted-foreground)]'>
                      I am committed to clear communication, attention to detail, and a client-first mindset
                      that supports both immediate goals and long-term success. By aligning our services with
                      each client&apos;s unique objectives, I help ensure their satisfaction and growth.
                    </p>
                  </div>
                  <MobileShowLessBioButton onClick={() => setMimiBioExpanded(false)} />
                </>
              ) : (
                <MobileReadBioButton onClick={() => setMimiBioExpanded(true)} />
              )}
            </div>
            <MailRow email='mimi@misaeng.com' />
          </div>
        </article>
      </div>
    </section>
  )
}
