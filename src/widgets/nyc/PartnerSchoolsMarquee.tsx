'use client'

import Link from 'next/link'

import { MarqueeRow } from '@components'
import { useCityPath } from '@hooks/useCity'
import { PARTNER_ORGS } from '@lib/constants/partners'
import { useT } from '@lib/i18n/client'
import { PartnerSchoolLogo } from '@widgets/nyc/PartnerSchoolLogo'

function PartnerItem({
  name,
  shortName,
  handle,
  logoSrc,
}: {
  name: string
  shortName: string
  handle: string | null
  logoSrc?: string | null
}) {
  const t = useT('partners')
  const content = (
    <>
      <PartnerSchoolLogo shortName={shortName} logoSrc={logoSrc} />
      <span className='min-w-0 pr-0.5'>
        <span className='block text-xs font-semibold leading-tight text-[var(--foreground)]'>
          {name}
        </span>
        <span className='mt-0.5 block text-[11px] leading-none text-[var(--muted)]'>
          {handle ? `@${handle}` : t('schools.logoPending')}
        </span>
      </span>
    </>
  )

  const className =
    'flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pr-3 pl-1.5 outline-none'

  if (handle) {
    return (
      <a
        href={`https://instagram.com/${handle}`}
        target='_blank'
        rel='noopener noreferrer'
        className={`${className} touch-manipulation transition hover:border-brand/40 focus-visible:border-brand/40`}
      >
        {content}
      </a>
    )
  }

  return <div className={className}>{content}</div>
}

export function PartnerSchoolsMarquee() {
  const href = useCityPath()
  const t = useT('partners')
  return (
    <section aria-label={t('schoolsLabel')} className='mt-6'>
      <div className='mb-2.5 flex items-center justify-between gap-3'>
        <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
          {t('schoolsLabel')}
        </p>
        <Link
          href={href('/partners')}
          className='shrink-0 text-[12px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-brand'
        >
          {t('more')}
        </Link>
      </div>
      <MarqueeRow>
        {PARTNER_ORGS.map((org) => (
          <PartnerItem
            key={org.id}
            name={t(`orgs.${org.id}.name`)}
            shortName={org.shortName}
            handle={org.handle}
            logoSrc={org.logoSrc}
          />
        ))}
      </MarqueeRow>
    </section>
  )
}
