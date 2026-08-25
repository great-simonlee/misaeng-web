import Link from 'next/link'

import { MarqueeRow } from '@components'
import { NYC_PARTNER_ORGS } from '@lib/constants/nyc'
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
  const content = (
    <>
      <PartnerSchoolLogo shortName={shortName} logoSrc={logoSrc} />
      <span className='min-w-0 pr-0.5'>
        <span className='block text-xs font-semibold leading-tight text-[var(--foreground)]'>
          {name}
        </span>
        <span className='mt-0.5 block text-[11px] leading-none text-[var(--muted)]'>
          {handle ? `@${handle}` : '로고 준비 중'}
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
        className={`${className} touch-manipulation transition hover:border-[#F64310]/40 focus-visible:border-[#F64310]/40`}
      >
        {content}
      </a>
    )
  }

  return <div className={className}>{content}</div>
}

export function PartnerSchoolsMarquee() {
  return (
    <section aria-label='협력 학교 한인 학생회' className='mt-6'>
      <div className='mb-2.5 flex items-center justify-between gap-3'>
        <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
          협력 학교 한인 학생회
        </p>
        <Link
          href='/nyc/partners'
          className='shrink-0 text-[12px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[#F64310]'
        >
          더보기
        </Link>
      </div>
      <MarqueeRow>
        {NYC_PARTNER_ORGS.map((org) => (
          <PartnerItem
            key={org.id}
            name={org.name}
            shortName={org.shortName}
            handle={org.handle}
            logoSrc={org.logoSrc}
          />
        ))}
      </MarqueeRow>
    </section>
  )
}
