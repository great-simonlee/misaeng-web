'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { captureReferralFromLocation } from '@lib/community/referral'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_MAGAZINE_PREVIEWS } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  FlagIcon,
  NoCashIcon,
  ShieldCheckIcon,
} from '@widgets/ellieo/icons'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'
import { VsaPartnersSection } from '@widgets/ellieo/VsaPartnersSection'

/**
 * Ellieo city home. Same information as the Misaeng hub (boards, magazine preview),
 * reorganised around trust: who is here (verified members), how the community stays safe, then what to explore.
 * Copy: hub.ellieo.* (en + vi).
 */
export function EllieoHomeScreen() {
  const t = useT('hub')
  const tc = useT('community')
  const city = useCity()
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const { user, loading } = useAuth()
  const sla = BRAND_CONFIG.trust.reportSlaHours

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  const [featureA, featureB, ...restBoards] = ELLIEO_BOARDS

  return (
    <div className='min-w-0 bg-[var(--background)]'>
      {/* Hero */}
      <section className='relative overflow-hidden bg-[var(--navy)] text-white'>
        <div
          className='pointer-events-none absolute inset-0 opacity-90'
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(60rem 28rem at 110% -10%, rgb(31 94 255 / 0.55), transparent 60%), radial-gradient(30rem 20rem at -10% 120%, rgb(0 178 255 / 0.25), transparent 60%)',
          }}
        />
        <div className='relative mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16'>
          <p className='inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[12.5px] font-medium text-white/85 ring-1 ring-white/15'>
            <ShieldCheckIcon className='size-4 text-[#7fd8b8]' />
            {t('ellieo.hero.eyebrow', { city: cityInfo.shortLabel })}
          </p>
          <h1 className='mt-4 max-w-3xl text-[1.85rem] font-bold leading-[1.25] tracking-[-0.03em] sm:text-[2.6rem] lg:text-[3.1rem]'>
            {t('ellieo.hero.title')}
          </h1>
          <p className='mt-4 max-w-2xl text-[15px] leading-[1.7] text-white/75 sm:text-[17px]'>
            {t('ellieo.hero.body')}
          </p>
          <div className='mt-6 flex flex-wrap gap-2.5'>
            {!loading && !user ? (
              <Link
                href={`${cityLoginPath(city)}?mode=signup`}
                className='inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--brand)] px-5 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-bright)]'
              >
                {t('ellieo.hero.join')}
                <ArrowRightIcon className='size-4' />
              </Link>
            ) : null}
            <Link
              href={href('/housing')}
              className='inline-flex h-12 items-center rounded-[10px] bg-white/10 px-5 text-[15px] font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/15'
            >
              {t('ellieo.hero.browseHousing')}
            </Link>
          </div>
          <ul className='mt-8 grid gap-3 text-[13.5px] text-white/80 sm:grid-cols-3 sm:gap-4'>
            <HeroPoint icon={BadgeCheckIcon} text={t('ellieo.hero.points.verified')} />
            <HeroPoint icon={NoCashIcon} text={t('ellieo.hero.points.noDeposit')} />
            {sla ? <HeroPoint icon={FlagIcon} text={t('ellieo.hero.points.reports', { hours: sla })} /> : null}
          </ul>
        </div>
      </section>

      {/* Start here: two feature boards */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8'>
        <SectionHeading title={t('ellieo.start.title')} body={t('ellieo.start.body')} />
        <div className='mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4'>
          {[featureA, featureB].map((board, index) => {
            const Icon = board.icon
            return (
              <Link
                key={board.id}
                href={href(board.path)}
                className={cn(
                  'group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-2xl p-5 transition sm:min-h-[11rem] sm:p-6',
                  index === 0
                    ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                    : 'bg-white text-[var(--foreground)] ring-1 ring-[var(--border)] hover:ring-[var(--border-muted)]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-11 items-center justify-center rounded-xl',
                    index === 0 ? 'bg-white/15 text-white' : 'bg-[var(--brand-soft)] text-[var(--brand)]',
                  )}
                >
                  <Icon className='size-6' />
                </span>
                <span className='mt-6 block'>
                  <span className='flex items-center gap-2 text-[1.2rem] font-bold tracking-[-0.02em] sm:text-[1.35rem]'>
                    {tc(`categories.${board.id}.title`)}
                    <ArrowRightIcon className='size-5 transition group-hover:translate-x-0.5' />
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-[14px] leading-relaxed',
                      index === 0 ? 'text-white/80' : 'text-[var(--muted)]',
                    )}
                  >
                    {t(`ellieo.start.${board.id}`, { city: cityInfo.shortLabel })}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* All boards */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8'>
        <SectionHeading title={t('ellieo.boards.title')} body={t('ellieo.boards.body')} />
        <ul className='mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3'>
          {restBoards.map((board) => {
            const Icon = board.icon
            const inner = (
              <>
                <span
                  className={cn(
                    'inline-flex size-10 shrink-0 items-center justify-center rounded-[10px]',
                    board.available
                      ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                      : 'bg-[var(--surface)] text-[var(--muted)]',
                  )}
                >
                  <Icon className='size-5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] font-semibold text-[var(--foreground)]'>
                    {tc(`categories.${board.id}.title`)}
                    {!board.available ? (
                      <span className='rounded-[5px] bg-[var(--ellieo-sun-soft)] px-1.5 py-px text-[11px] font-semibold text-[#9a6200]'>
                        {t('comingSoon')}
                      </span>
                    ) : null}
                  </span>
                  <span className='mt-0.5 block text-[13.5px] leading-snug text-[var(--muted)]'>
                    {tc(`categories.${board.id}.description`, { city: cityInfo.shortLabel })}
                  </span>
                </span>
                {board.available ? (
                  <ArrowRightIcon className='size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]' />
                ) : null}
              </>
            )
            return (
              <li key={board.id}>
                {board.available ? (
                  <Link
                    href={href(board.path)}
                    className='group flex items-center gap-3 rounded-xl bg-white p-3.5 ring-1 ring-[var(--border)] transition hover:ring-[var(--border-muted)]'
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className='flex items-center gap-3 rounded-xl bg-white/60 p-3.5 ring-1 ring-dashed ring-[var(--border)]' aria-disabled>
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* Safety */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8'>
        <div className='grid gap-6 rounded-2xl bg-white p-5 ring-1 ring-[var(--border)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10'>
          <div className='min-w-0'>
            <p className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ellieo-jade)]'>
              <ShieldCheckIcon className='size-4' />
              {t('ellieo.safety.kicker')}
            </p>
            <h2 className='mt-2 text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.6rem]'>
              {t('ellieo.safety.title')}
            </h2>
            <p className='mt-3 text-[15px] leading-[1.7] text-[var(--muted-foreground)]'>
              {t('ellieo.safety.body', { hours: sla ?? 48 })}
            </p>
          </div>
          <ol className='grid gap-3'>
            {(['verify', 'report', 'review'] as const).map((step, index) => (
              <li key={step} className='flex gap-3 rounded-xl bg-[var(--background)] p-4'>
                <span className='inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-[13px] font-bold text-white'>
                  {index + 1}
                </span>
                <span className='min-w-0'>
                  <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
                    {t(`ellieo.safety.steps.${step}.title`)}
                  </span>
                  <span className='mt-0.5 block text-[14px] leading-relaxed text-[var(--muted)]'>
                    {t(`ellieo.safety.steps.${step}.body`, { hours: sla ?? 48 })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <VsaPartnersSection />

      {/* Magazine preview */}
      <section className='mx-auto w-full max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <SectionHeading title={t('magazine.title')} body={t('magazine.description')} />
          <span className='rounded-md bg-[var(--ellieo-sun-soft)] px-2 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
            {t('comingSoon')}
          </span>
        </div>
        <ul className='mt-5 grid gap-3 md:grid-cols-2'>
          {NYC_MAGAZINE_PREVIEWS.map((item) => (
            <li key={item.id} className='flex min-w-0 gap-3.5 rounded-xl bg-white p-3 ring-1 ring-[var(--border)]'>
              <span className='relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)] sm:w-28'>
                <Image src={item.image} alt='' fill loading='eager' className='object-cover' sizes='112px' />
              </span>
              <span className='min-w-0 py-0.5'>
                <span className='block text-[12px] font-semibold text-[var(--brand)]'>
                  {t(`magazine.items.${item.id}.tag`)}
                </span>
                <span className='mt-0.5 line-clamp-2 block text-[15px] font-semibold leading-snug text-[var(--foreground)]'>
                  {t(`magazine.items.${item.id}.title`)}
                </span>
                <span className='mt-1 line-clamp-2 block text-[13px] leading-relaxed text-[var(--muted)]'>
                  {t(`magazine.items.${item.id}.excerpt`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function SectionHeading({ title, body }: { title: string; body?: string }) {
  return (
    <div className='min-w-0'>
      <h2 className='text-[1.3rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.5rem]'>{title}</h2>
      {body ? <p className='mt-1 max-w-2xl text-[14.5px] leading-relaxed text-[var(--muted)]'>{body}</p> : null}
    </div>
  )
}

function HeroPoint({ icon: Icon, text }: { icon: (p: { className?: string }) => React.ReactNode; text: string }) {
  return (
    <li className='flex items-start gap-2'>
      <Icon className='mt-0.5 size-[18px] shrink-0 text-[#7fd8b8]' />
      <span className='min-w-0 leading-snug'>{text}</span>
    </li>
  )
}
