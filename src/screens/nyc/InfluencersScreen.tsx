'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { MISAENG_DESIGN } from '@lib/brand/design'
import { useT } from '@lib/i18n/client'
import { MisaengNyInstagramDmCallout } from '@widgets/nyc/MisaengNyInstagramDmCallout'

import { PageHeader } from './PartnerSchoolsScreen'

export function InfluencersScreen() {
  const href = useCityPath()
  const t = useT('partners')
  if (MISAENG_DESIGN) {
    // Misaeng: header, one recruiting banner, the three creator types as cards, then the DM card
    return (
      <div className='min-h-screen bg-[var(--canvas)]'>
        <div className='mx-auto max-w-7xl px-4 pb-16 pt-4 sm:pt-5 lg:pt-6 sm:px-6 lg:px-8'>
          <PageHeader label={t('influencersLabel')} title={t('influencers.title')} intro={t('influencers.intro')} />
          <section className='relative mt-7 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#ff6a2b_0%,#f64310_55%,#d9370b_100%)] px-6 py-8 text-white sm:mt-9 sm:px-10 sm:py-10'>
            <span aria-hidden className='absolute -right-10 -top-12 size-48 rounded-full bg-white/10' />
            <span aria-hidden className='absolute -bottom-16 right-24 size-36 rounded-full bg-white/10' />
            <span className='relative inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold'>
              <span className='size-1.5 rounded-full bg-white' />
              {t('influencers.recruitingHandle')}
            </span>
            <p className='relative mt-3 text-[22px] font-bold tracking-[-0.03em] sm:text-[28px]'>{t('influencers.recruitingTitle')}</p>
            <p className='relative mt-2 max-w-xl text-[14px] leading-relaxed text-white/85 sm:text-[15px]'>{t('influencers.recruitingBody')}</p>
          </section>
          <ul className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4'>
            {PLATFORMS.map(({ id, tint, icon }) => (
              <li
                key={id}
                className='flex items-center gap-4 rounded-[22px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04]'
              >
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}>{icon}</span>
                <div className='min-w-0'>
                  <p className='text-[15.5px] font-semibold tracking-tight text-[var(--foreground)]'>{t(`influencerPlatforms.${id}.title`)}</p>
                  <p className='mt-0.5 text-[12.5px] text-[var(--muted)]'>{t(`influencerPlatforms.${id}.description`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className='mx-auto max-w-xl'>
            <MisaengNyInstagramDmCallout message={t('influencers.dmMessage')} />
          </div>
          <div className='mt-8 text-center'>
            <Link
              href={href()}
              className='text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]'
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_42%,#ffffff_100%)]'>
      <div className='mx-auto max-w-lg px-5 pb-12 pt-8 sm:px-6 sm:pt-10'>
        <p className='text-[12px] font-medium text-[var(--muted)]'>
          {t('influencersLabel')}
        </p>
        <h1 className='mt-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          {t('influencers.title')}
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('influencers.intro')}
        </p>

        <div className='mt-8 rounded-[1.25rem] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
          <p className='text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
            {t('influencers.recruitingTitle')}
          </p>
          <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {t('influencers.recruitingBody')}
          </p>
        </div>

        <MisaengNyInstagramDmCallout message={t('influencers.dmMessage')} />

        <div className='mt-8 text-center'>
          <Link
            href={href()}
            className='text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]'
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}

const platformIcon = (path: React.ReactNode) => (
  <svg viewBox='0 0 24 24' className='size-5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
    {path}
  </svg>
)

const PLATFORMS = [
  {
    id: 'instagram',
    tint: 'bg-[#fdeef4] text-[#d6246e]',
    icon: platformIcon(<><rect x='3.5' y='3.5' width='17' height='17' rx='5' /><circle cx='12' cy='12' r='3.8' /><circle cx='17.2' cy='6.8' r='0.6' fill='currentColor' /></>),
  },
  {
    id: 'youtube',
    tint: 'bg-[#feecec] text-[#e11d1d]',
    icon: platformIcon(<><rect x='2.5' y='5.5' width='19' height='13' rx='4' /><path d='M10 9.5v5l4.5-2.5z' fill='currentColor' /></>),
  },
  {
    id: 'tiktok',
    tint: 'bg-[#eef0f3] text-[#111827]',
    icon: platformIcon(<path d='M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.5 2.6 2.4 4.2 5 4.3' />),
  },
] as const
