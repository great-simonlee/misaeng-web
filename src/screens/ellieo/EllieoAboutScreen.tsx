'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'

import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { BRAND_CONFIG } from '@lib/brand'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BriefcaseIcon,
  ChatIcon,
  FlagIcon,
  HeartIcon,
  KeyIcon,
  PassportIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@widgets/ellieo/icons'
import { BOARD_TONE } from '@widgets/ellieo/nav'

type Icon = ComponentType<{ className?: string }>

/**
 * Ellieo company & service intro: why we started, what we promise, what Ellieo does, the team.
 * Copy lives in hub.json `ellieo.about`. No invented numbers, names or quotes — the team block is
 * a statement only until real team photos/names exist (see TEAM_MEMBERS).
 */
export function EllieoAboutScreen() {
  const t = useT('hub')
  const href = useCityPath()
  const city = useCity()
  const cityInfo = useCityInfo()
  const { user, loading } = useEllieoViewer()
  const operator = BRAND_CONFIG.trust.operator

  const why: { key: string; icon: Icon }[] = [
    { key: 'scam', icon: KeyIcon },
    { key: 'visa', icon: PassportIcon },
    { key: 'jobs', icon: BriefcaseIcon },
    { key: 'lonely', icon: HeartIcon },
  ]
  const promises: { key: string; icon: Icon }[] = [
    { key: 'verified', icon: BadgeCheckIcon },
    { key: 'real', icon: ChatIcon },
    { key: 'safety', icon: FlagIcon },
    { key: 'free', icon: HeartIcon },
  ]
  const services: { key: string; icon: Icon; path: string; tone: string }[] = [
    { key: 'housing', icon: KeyIcon, path: '/housing', tone: BOARD_TONE.housing ?? '#0b8f6a' },
    { key: 'visa', icon: PassportIcon, path: '/status', tone: BOARD_TONE.status ?? '#1f5eff' },
    {
      key: 'jobs',
      icon: BriefcaseIcon,
      path: '/companies',
      tone: BOARD_TONE['job-review'] ?? '#0e1a2f',
    },
    { key: 'community', icon: UsersIcon, path: '/food', tone: BOARD_TONE.roommate ?? '#7a4cff' },
  ]

  return (
    <div className='min-w-0 flex-1 bg-white'>
      {/* Hero */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8'>
        <div className='relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#1f5eff,#3f7bff)] px-5 py-8 text-white sm:px-10 sm:py-14 lg:px-14'>
          <div className='relative z-10 max-w-2xl'>
            <span className='inline-flex rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold'>
              {t('ellieo.about.hero.eyebrow')}
            </span>
            <h1 className='mt-4 text-[1.85rem] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[2.6rem] lg:text-[3rem]'>
              {t('ellieo.about.hero.title')}
            </h1>
            <p className='mt-3 text-[15px] leading-relaxed text-white/90 sm:mt-4 sm:text-[17px]'>
              {t('ellieo.about.hero.subline')}
            </p>
          </div>
          <HeroArt className='pointer-events-none absolute -bottom-6 -right-6 hidden h-56 w-auto opacity-95 md:block lg:right-6 lg:top-1/2 lg:-translate-y-1/2' />
        </div>
      </section>

      <div className='mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Why we started */}
        <Section title={t('ellieo.about.why.title')} intro={t('ellieo.about.why.intro')}>
          <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            {why.map(({ key, icon: ItemIcon }) => (
              <li
                key={key}
                className='flex gap-3 rounded-2xl bg-[#f8f9fc] p-4 ring-1 ring-inset ring-[var(--border)] sm:block sm:p-5'
              >
                <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--brand)] ring-1 ring-inset ring-[var(--border)]'>
                  <ItemIcon className='size-[18px]' />
                </span>
                <div className='min-w-0'>
                  <h3 className='text-[15px] sm:mt-3 font-semibold text-[var(--foreground)]'>
                    {t(`ellieo.about.why.${key}.title`)}
                  </h3>
                  <p className='mt-1 text-[13.5px] leading-relaxed text-[var(--muted)]'>
                    {t(`ellieo.about.why.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* What we promise */}
        <Section title={t('ellieo.about.promise.title')}>
          <ul className='grid gap-x-8 gap-y-5 sm:grid-cols-2'>
            {promises.map(({ key, icon: ItemIcon }) => (
              <li key={key} className='flex gap-3.5'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-white'>
                  <ItemIcon className='size-[18px]' />
                </span>
                <div className='min-w-0'>
                  <h3 className='text-[15px] font-semibold text-[var(--foreground)]'>
                    {t(`ellieo.about.promise.${key}.title`)}
                  </h3>
                  <p className='mt-0.5 text-[13.5px] leading-relaxed text-[var(--muted)]'>
                    {t(`ellieo.about.promise.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* What Ellieo does */}
        <Section title={t('ellieo.about.does.title')}>
          <ul className='grid gap-2 sm:grid-cols-2'>
            {services.map(({ key, icon: ItemIcon, path, tone }) => (
              <li key={key}>
                <Link
                  href={href(path)}
                  className='group flex items-center gap-3.5 rounded-2xl px-4 py-3.5 ring-1 ring-inset ring-[var(--border)] transition hover:bg-[#f8f9fc]'
                >
                  <span
                    aria-hidden
                    className='flex size-11 shrink-0 items-center justify-center rounded-full'
                    style={{ color: tone, background: `${tone}14` }}
                  >
                    <ItemIcon className='size-5' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-[15px] font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]'>
                      {t(`ellieo.about.does.${key}.title`)}
                    </span>
                    <span className='mt-0.5 block text-[13px] leading-relaxed text-[var(--muted)]'>
                      {t(`ellieo.about.does.${key}.body`, { city: cityInfo.shortLabel })}
                    </span>
                  </span>
                  <ArrowRightIcon className='size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]' />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {/* Our team */}
        <Section title={t('ellieo.about.team.title')}>
          <div className='rounded-3xl bg-[#f8f9fc] px-5 py-6 ring-1 ring-inset ring-[var(--border)] sm:px-8 sm:py-8'>
            <HeartIcon className='size-6 text-[#e0475b]' />
            <p className='mt-3 max-w-3xl text-[16px] font-medium leading-relaxed text-[var(--foreground)] sm:text-[18px]'>
              {t('ellieo.about.team.body')}
            </p>
            <p className='mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]'>
              {t('ellieo.about.team.closing')}
            </p>
            <TeamMembers />
            {operator ? (
              <p className='mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)]'>
                <ShieldCheckIcon className='size-4 text-[var(--navy)]' />
                {t('ellieo.about.team.operator', { company: operator.name, city: operator.city })}
              </p>
            ) : null}
          </div>
        </Section>

        {/* Closing call to action */}
        <section className='mb-12 mt-12 rounded-3xl bg-[var(--navy)] px-5 py-8 text-center text-white sm:mt-16 sm:px-10 sm:py-12'>
          <h2 className='text-[1.4rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.9rem]'>
            {t('ellieo.about.cta.title')}
          </h2>
          <p className='mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-white/80 sm:text-[15.5px]'>
            {t('ellieo.about.cta.body')}
          </p>
          <div className='mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row'>
            {!loading && !user ? (
              <Link
                href={`${cityLoginPath(city)}?mode=signup`}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-white px-6 text-[14.5px] font-semibold text-[var(--navy)] transition hover:bg-white/90 sm:w-auto'
              >
                {t('ellieo.about.cta.join')}
              </Link>
            ) : null}
            <Link
              href={href()}
              className='inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-6 text-[14.5px] font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/10 sm:w-auto'
            >
              {t('ellieo.about.cta.explore')}
              <ArrowRightIcon className='size-4' />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <section className='mt-10 sm:mt-14'>
      <h2 className='text-[1.3rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.6rem]'>
        {title}
      </h2>
      {intro ? (
        <p className='mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)] sm:text-[15px]'>
          {intro}
        </p>
      ) : null}
      <div className='mt-4 sm:mt-5'>{children}</div>
    </section>
  )
}

/**
 * TODO(team): add real team photos and names here when they are ready, e.g.
 * { name: '…', role: '…', photo: '/brand/team/….jpg' }. Empty = nothing renders.
 */
const TEAM_MEMBERS: { name: string; role: string; photo: string }[] = []

function TeamMembers() {
  if (TEAM_MEMBERS.length === 0) return null
  return (
    <ul className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
      {TEAM_MEMBERS.map((member) => (
        <li key={member.name} className='text-center'>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static team photos */}
          <img src={member.photo} alt='' className='mx-auto size-20 rounded-full object-cover' />
          <p className='mt-2 text-[14px] font-semibold'>{member.name}</p>
          <p className='text-[12.5px] text-[var(--muted)]'>{member.role}</p>
        </li>
      ))}
    </ul>
  )
}

/** Same shield · house · people motif as the home banner */
function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox='-130 -80 260 160' aria-hidden className={className}>
      <circle r='72' fill='#fff' fillOpacity='0.1' />
      <circle r='50' fill='#fff' fillOpacity='0.12' />
      <path d='M0 -36 L29 -25 V-3 C29 18 16 31 0 37 C-16 31 -29 18 -29 -3 V-25 Z' fill='#fff' />
      <path
        d='M-12 0 L-4 8 L13 -10'
        fill='none'
        stroke='#1f5eff'
        strokeWidth='6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <g transform='translate(-92 18)'>
        <path d='M0 -18 L20 -3 V20 H-20 V-3 Z' fill='#fff' fillOpacity='0.9' />
        <rect x='-5' y='6' width='10' height='14' rx='2' fill='#1f5eff' />
      </g>
      <g transform='translate(88 6)' fill='#fff' fillOpacity='0.9'>
        <circle cx='-9' cy='-11' r='8' />
        <path d='M-22 17 a13 13 0 0 1 26 0 Z' />
        <circle cx='11' cy='-7' r='6.5' fillOpacity='0.75' />
        <path d='M1 17 a10 10 0 0 1 20 0 Z' fillOpacity='0.75' />
      </g>
    </svg>
  )
}
