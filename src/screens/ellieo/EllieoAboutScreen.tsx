'use client'

import Image from 'next/image'
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
  ChatIcon,
  FlagIcon,
  HeartIcon,
  ShieldCheckIcon,
} from '@widgets/ellieo/icons'

type Icon = ComponentType<{ className?: string }>

/** Same left → right blue as the home banner (logo blue deepening to navy) */
const HERO_OVERLAY =
  'linear-gradient(90deg, rgba(31,107,255,0.96) 0%, rgba(11,79,224,0.9) 48%, rgba(10,47,143,0.55) 100%)'

const ART = '/brand/about'

/**
 * Ellieo company & service intro: mission, the moments we built it for, our promise, what you'll find,
 * why we care. Copy lives in hub.json `ellieo.about`. No invented numbers, names, ratings or quotes —
 * the verified-member card is labelled as an illustration and the team block stays empty until real
 * team photos/names exist (see TEAM_MEMBERS).
 */
export function EllieoAboutScreen() {
  const t = useT('hub')
  const href = useCityPath()
  const city = useCity()
  const cityInfo = useCityInfo()
  const { user, loading } = useEllieoViewer()
  const operator = BRAND_CONFIG.trust.operator
  const showJoin = !loading && !user
  const joinHref = `${cityLoginPath(city)}?mode=signup`

  const moments = ['deposit', 'visa', 'interview', 'winter'] as const
  const promises: { key: string; icon: Icon }[] = [
    { key: 'verified', icon: BadgeCheckIcon },
    { key: 'real', icon: ChatIcon },
    { key: 'safety', icon: FlagIcon },
    { key: 'free', icon: HeartIcon },
  ]
  const finds: { key: string; path: string }[] = [
    { key: 'housing', path: '/housing' },
    { key: 'visa', path: '/status' },
    { key: 'jobs', path: '/companies' },
    { key: 'community', path: '/food' },
  ]

  return (
    <div className='min-w-0 flex-1 bg-white'>
      {/* Hero: NYC skyline under the brand blue, compact */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8'>
        <div className='relative isolate overflow-hidden rounded-3xl text-white'>
          <Image
            src={`${ART}/nyc-skyline.jpg`}
            alt={t('ellieo.about.heroAlt')}
            fill
            priority
            sizes='(min-width: 1280px) 1216px, 100vw'
            className='-z-20 object-cover object-[70%_40%]'
          />
          <div aria-hidden className='absolute inset-0 -z-10' style={{ background: HERO_OVERLAY }} />
          <div className='max-w-2xl px-5 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-10'>
            <span className='inline-flex rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold backdrop-blur-sm'>
              {t('ellieo.about.hero.eyebrow')}
            </span>
            <h1 className='mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.03em] sm:text-[2.35rem] lg:text-[2.6rem]'>
              {t('ellieo.about.hero.title')}
            </h1>
            <p className='mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/90 sm:text-[16px]'>
              {t('ellieo.about.hero.subline')}
            </p>
            <div className='mt-5 flex flex-wrap gap-2.5'>
              {showJoin ? (
                <Link
                  href={joinHref}
                  className='inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[14px] font-semibold text-[#0b4fe0] transition hover:bg-white/90'
                >
                  {t('ellieo.about.hero.primary')}
                </Link>
              ) : null}
              <a
                href='#find'
                className='inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/40 transition hover:bg-white/10'
              >
                {t('ellieo.about.hero.secondary')}
                <ArrowRightIcon className='size-4' />
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className='mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Mission: one big sentence */}
        <section className='mx-auto mt-12 max-w-3xl text-center sm:mt-16'>
          <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]'>
            {t('ellieo.about.mission.eyebrow')}
          </p>
          <p className='mt-3 text-balance text-[1.45rem] font-bold leading-[1.3] tracking-[-0.02em] text-[var(--foreground)] sm:text-[2rem]'>
            {t('ellieo.about.mission.text')}
          </p>
        </section>

        {/* The moments we built Ellieo for */}
        <Section title={t('ellieo.about.moments.title')} intro={t('ellieo.about.moments.intro')}>
          <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {moments.map((key) => (
              <li key={key} className='flex overflow-hidden rounded-2xl ring-1 ring-inset ring-[var(--border)] sm:block'>
                {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG illustration */}
                <img
                  src={`${ART}/moment-${key}.svg`}
                  alt=''
                  width={320}
                  height={200}
                  loading='lazy'
                  className='w-[7.25rem] shrink-0 object-cover sm:aspect-[16/10] sm:w-full'
                />
                <div className='min-w-0 p-3.5 sm:p-5'>
                  <h3 className='text-[14.5px] font-semibold leading-snug text-[var(--foreground)] sm:text-[15.5px]'>
                    {t(`ellieo.about.moments.${key}.title`)}
                  </h3>
                  <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)] sm:mt-1.5 sm:text-[13.5px]'>
                    {t(`ellieo.about.moments.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Our promise: four pillars + an illustrative verified-member card */}
        <Section title={t('ellieo.about.promise.title')} intro={t('ellieo.about.promise.intro')}>
          <div className='grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10'>
            <ul className='grid grid-cols-2 gap-2.5 sm:gap-3'>
              {promises.map(({ key, icon: ItemIcon }) => (
                <li key={key} className='rounded-2xl bg-[#f6f8ff] p-3.5 sm:p-5'>
                  <span className='flex size-9 items-center justify-center rounded-full bg-[#1f6bff] text-white sm:size-10'>
                    <ItemIcon className='size-[18px]' />
                  </span>
                  <h3 className='mt-2.5 text-[14px] font-semibold leading-snug text-[var(--foreground)] sm:mt-3 sm:text-[15px]'>
                    {t(`ellieo.about.promise.${key}.title`)}
                  </h3>
                  <p className='mt-1 text-[12.5px] leading-relaxed text-[var(--muted)] sm:text-[13.5px]'>
                    {t(`ellieo.about.promise.${key}.body`)}
                  </p>
                </li>
              ))}
            </ul>
            <VerifiedCard />
          </div>
        </Section>

        {/* What you'll find */}
        <Section id='find' title={t('ellieo.about.find.title')}>
          <ul className='grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4'>
            {finds.map(({ key, path }) => (
              <li key={key}>
                <Link
                  href={href(path)}
                  className='group block h-full overflow-hidden rounded-2xl ring-1 ring-inset ring-[var(--border)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(11,79,224,0.35)]'
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG illustration */}
                  <img
                    src={`${ART}/find-${key}.svg`}
                    alt=''
                    width={320}
                    height={200}
                    loading='lazy'
                    className='aspect-[16/10] w-full object-cover'
                  />
                  <div className='flex items-start gap-2 p-3.5 sm:p-5'>
                    <div className='min-w-0 flex-1'>
                      <h3 className='text-[14.5px] font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)] sm:text-[15.5px]'>
                        {t(`ellieo.about.find.${key}.title`)}
                      </h3>
                      <p className='mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-[var(--muted)] sm:line-clamp-none sm:text-[13.5px]'>
                        {t(`ellieo.about.find.${key}.body`, { city: cityInfo.shortLabel })}
                      </p>
                    </div>
                    <ArrowRightIcon className='mt-1 hidden size-4 shrink-0 text-[var(--muted)] transition sm:block group-hover:translate-x-0.5 group-hover:text-[var(--brand)]' />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {/* Why we care */}
        <section className='mt-12 grid items-center gap-6 sm:mt-16 lg:grid-cols-2 lg:gap-12'>
          <div>
            <p className='text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]'>
              {t('ellieo.about.care.eyebrow')}
            </p>
            <h2 className='mt-2 text-balance text-[1.45rem] font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.9rem]'>
              {t('ellieo.about.care.title')}
            </h2>
            <p className='mt-4 text-[15px] leading-relaxed text-[var(--foreground)] sm:text-[16px]'>
              {t('ellieo.about.care.body1')}
            </p>
            <p className='mt-3 text-[15px] leading-relaxed text-[var(--muted-foreground)] sm:text-[16px]'>
              {t('ellieo.about.care.body2')}
            </p>
            <p className='mt-5 flex gap-2 border-l-[3px] border-[#1f6bff] pl-3 text-[15px] font-semibold leading-relaxed text-[var(--foreground)]'>
              {t('ellieo.about.care.closing')}
            </p>
            <TeamMembers />
            {operator ? (
              <p className='mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--muted)]'>
                <ShieldCheckIcon className='size-4 text-[var(--navy)]' />
                {t('ellieo.about.care.operator', { company: operator.name, city: operator.city })}
              </p>
            ) : null}
          </div>
          <div className='relative aspect-[16/9] overflow-hidden rounded-3xl lg:aspect-[5/4]'>
            <Image
              src={`${ART}/nyc-bridge.jpg`}
              alt={t('ellieo.about.care.photoAlt')}
              fill
              sizes='(min-width: 1024px) 600px, 100vw'
              className='object-cover'
            />
          </div>
        </section>

        {/* Closing call to action */}
        <section
          className='mb-12 mt-12 rounded-3xl px-5 py-9 text-center text-white sm:mt-16 sm:px-10 sm:py-12'
          style={{ background: 'linear-gradient(90deg, #1f6bff 0%, #0b4fe0 55%, #0a2f8f 100%)' }}
        >
          <h2 className='text-balance text-[1.45rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.9rem]'>
            {t('ellieo.about.cta.title')}
          </h2>
          <p className='mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-white/85 sm:text-[15.5px]'>
            {t('ellieo.about.cta.body')}
          </p>
          <div className='mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row'>
            {showJoin ? (
              <Link
                href={joinHref}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-white px-6 text-[14.5px] font-semibold text-[#0b4fe0] transition hover:bg-white/90 sm:w-auto'
              >
                {t('ellieo.about.cta.join')}
              </Link>
            ) : null}
            <Link
              href={href()}
              className='inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-6 text-[14.5px] font-semibold text-white ring-1 ring-inset ring-white/40 transition hover:bg-white/10 sm:w-auto'
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
  id,
  title,
  intro,
  children,
}: {
  id?: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className='mt-12 scroll-mt-24 sm:mt-16'>
      <h2 className='text-balance text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.7rem]'>
        {title}
      </h2>
      {intro ? (
        <p className='mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)] sm:text-[15px]'>
          {intro}
        </p>
      ) : null}
      <div className='mt-5'>{children}</div>
    </section>
  )
}

/** Illustrative only — no real person, clearly labelled. */
function VerifiedCard() {
  const t = useT('hub')
  return (
    <figure
      className='relative overflow-hidden rounded-3xl p-5 sm:p-6'
      style={{ background: 'linear-gradient(135deg, #1f6bff 0%, #0b4fe0 55%, #0a2f8f 100%)' }}
    >
      <div aria-hidden className='absolute -right-10 -top-10 size-40 rounded-full bg-white/10' />
      <div className='relative rounded-2xl bg-white p-4 shadow-[0_18px_40px_-18px_rgba(10,47,143,0.6)]'>
        <div className='flex items-center gap-3'>
          <span aria-hidden className='size-11 shrink-0 rounded-full bg-[linear-gradient(135deg,#bfd3ff,#1f6bff)]' />
          <div className='min-w-0 flex-1'>
            <p className='flex items-center gap-1 text-[14.5px] font-semibold text-[var(--foreground)]'>
              {t('ellieo.about.promise.card.title')}
              <BadgeCheckIcon className='size-4 text-[#1f6bff]' />
            </p>
            <span aria-hidden className='mt-1.5 block h-2 w-24 rounded-full bg-[#e6ecf8]' />
          </div>
          <span className='shrink-0 rounded-full bg-[#f1f4fa] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--muted)]'>
            {t('ellieo.about.promise.card.label')}
          </span>
        </div>
        <ul className='mt-4 space-y-2'>
          {(['school', 'work'] as const).map((key) => (
            <li key={key} className='flex items-center gap-2 rounded-xl bg-[#f6f8ff] px-3 py-2 text-[13px] font-medium text-[var(--foreground)]'>
              <ShieldCheckIcon className='size-4 text-[#0b8f6a]' />
              {t(`ellieo.about.promise.card.${key}`)}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className='relative mt-4 text-[13px] leading-relaxed text-white/90'>
        {t('ellieo.about.promise.card.caption')}
      </figcaption>
    </figure>
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
