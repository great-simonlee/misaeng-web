'use client'

import Link from 'next/link'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import { PARTNER_ORGS, partnerClubsFor } from '@lib/constants/partners'
import { MISAENG_DESIGN } from '@lib/brand/design'
import { useT } from '@lib/i18n/client'
import { MisaengNyInstagramDmCallout } from '@widgets/nyc/MisaengNyInstagramDmCallout'
import { PartnerSchoolLogo } from '@widgets/nyc/PartnerSchoolLogo'

export function PartnerSchoolsScreen() {
  const href = useCityPath()
  const cityId = useCityInfo().id
  const t = useT('partners')
  if (MISAENG_DESIGN) {
    // Misaeng: page header + card grid on the canvas (Ellieo keeps the narrow list below)
    return (
      <div className='min-h-screen bg-[var(--canvas)]'>
        <div className='mx-auto max-w-7xl px-4 pb-16 pt-4 sm:pt-5 lg:pt-6 sm:px-6 lg:px-8'>
          <PageHeader label={t('schoolsLabel')} title={t('schools.title')} intro={t('schools.intro')} />
          <PartnerGrid items={PARTNER_ORGS} className='mt-7 sm:mt-9' />
          <h2 className='mt-10 text-[18px] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[20px]'>{t('clubsLabel')}</h2>
          <PartnerGrid items={partnerClubsFor(cityId)} className='mt-4' />
          <div className='mx-auto max-w-xl'>
            <MisaengNyInstagramDmCallout message={t('schools.dmMessage')} />
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
          {t('schoolsLabel')}
        </p>
        <h1 className='mt-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          {t('schools.title')}
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('schools.intro')}
        </p>

        <PartnerList items={PARTNER_ORGS} className='mt-6' />

        <h2 className='mt-8 text-[13px] font-semibold text-[var(--muted-foreground)]'>{t('clubsLabel')}</h2>
        <PartnerList items={partnerClubsFor(cityId)} className='mt-2.5' />

        <MisaengNyInstagramDmCallout message={t('schools.dmMessage')} />

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

type PartnerListItem = { id: string; shortName: string; handle: string | null; logoSrc?: string | null }

/** Rows of partners (logo, name, Instagram) — the school associations and the clubs */
function PartnerList({ items, className }: { items: readonly PartnerListItem[]; className: string }) {
  const t = useT('partners')
  return (
    <ul className={`${className} overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]`}>
        {items.map((org, index) => {
          const row = (
            <div className='flex items-center gap-3 px-5 py-4'>
              <PartnerSchoolLogo
                shortName={org.shortName}
                logoSrc={org.logoSrc}
                size='md'
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                  {t(`orgs.${org.id}.name`)}
                </p>
                <p className='mt-0.5 truncate text-[12px] text-[var(--muted)]'>
                  {org.handle ? `@${org.handle}` : t('schools.profilePending')}
                </p>
              </div>
            </div>
          )

          return (
            <li
              key={org.id}
              className={
                index === items.length - 1
                  ? undefined
                  : 'border-b border-[#f0f1f3]'
              }
            >
              {org.handle ? (
                <a
                  href={`https://instagram.com/${org.handle}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block touch-manipulation transition active:bg-[#f8f9fb]'
                >
                  {row}
                </a>
              ) : (
                row
              )}
            </li>
          )
        })}
      </ul>
  )
}

/** Misaeng page header (same type scale as the housing / food lists). Also used by InfluencersScreen. */
export function PageHeader({ label, title, intro }: { label: string; title: string; intro: string }) {
  return (
    <header>
      <p className='text-[13px] font-semibold text-[var(--brand)]'>{label}</p>
      <h1 className='mt-1.5 text-[1.75rem] font-bold tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.1rem] lg:text-[2.5rem]'>
        {title}
      </h1>
      <p className='mt-2.5 max-w-2xl text-[14px] leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]'>{intro}</p>
    </header>
  )
}

/** Misaeng: partners as cards (logo, name, Instagram) in a 1 / 2 / 3 column grid. */
function PartnerGrid({ items, className }: { items: readonly PartnerListItem[]; className: string }) {
  const t = useT('partners')
  return (
    <ul className={`${className} grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3`}>
      {items.map((org) => {
        const card = (
          <div className='flex h-full items-center gap-4 rounded-[22px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_32px_-14px_rgba(15,23,42,0.25)]'>
            <PartnerSchoolLogo shortName={org.shortName} logoSrc={org.logoSrc} size='md' />
            <div className='min-w-0 flex-1'>
              <p className='truncate text-[15.5px] font-semibold tracking-tight text-[var(--foreground)]'>{t(`orgs.${org.id}.name`)}</p>
              <p className='mt-0.5 truncate text-[12.5px] text-[var(--muted)]'>
                {org.handle ? `@${org.handle}` : t('schools.profilePending')}
              </p>
            </div>
            {org.handle ? (
              <span aria-hidden className='flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4f5f7] text-[var(--muted-foreground)] transition group-hover:bg-[var(--brand)] group-hover:text-white'>
                <svg viewBox='0 0 24 24' className='size-4' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <rect x='3.5' y='3.5' width='17' height='17' rx='5' />
                  <circle cx='12' cy='12' r='3.8' />
                  <circle cx='17.2' cy='6.8' r='0.6' fill='currentColor' />
                </svg>
              </span>
            ) : null}
          </div>
        )
        return (
          <li key={org.id}>
            {org.handle ? (
              <a
                href={`https://instagram.com/${org.handle}`}
                target='_blank'
                rel='noopener noreferrer'
                className='group block h-full touch-manipulation'
              >
                {card}
              </a>
            ) : (
              card
            )}
          </li>
        )
      })}
    </ul>
  )
}
