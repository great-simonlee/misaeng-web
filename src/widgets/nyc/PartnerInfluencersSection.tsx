'use client'

import Link from 'next/link'

import { MarqueeRow } from '@components'
import { useCityPath } from '@hooks/useCity'
import {
  PARTNER_INFLUENCERS,
  type InfluencerPlatformId,
} from '@lib/constants/partners'
import { useT } from '@lib/i18n/client'

function profileUrl(
  platform: InfluencerPlatformId,
  handle: string,
): string {
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`
    case 'youtube':
      return `https://youtube.com/@${handle}`
    case 'tiktok':
      return `https://tiktok.com/@${handle}`
  }
}

function InfluencerMark({ shortName }: { shortName: string }) {
  return (
    <span
      className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[10px] font-bold tracking-tight text-[var(--foreground)]'
      aria-hidden
    >
      {shortName}
    </span>
  )
}

function InfluencerItem({
  name,
  shortName,
  handle,
  platform,
}: {
  name: string
  shortName: string
  handle: string | null
  platform: InfluencerPlatformId
}) {
  const t = useT('partners')
  const content = (
    <>
      <InfluencerMark shortName={shortName} />
      <span className='min-w-0 pr-0.5'>
        <span className='block text-xs font-semibold leading-tight text-[var(--foreground)]'>
          {name}
        </span>
        <span className='mt-0.5 block text-[11px] leading-none text-[var(--muted)]'>
          {handle ? `@${handle}` : t('influencers.recruitingHandle')}
        </span>
      </span>
    </>
  )

  const className =
    'flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pr-3 pl-1.5 outline-none'

  if (handle) {
    return (
      <a
        href={profileUrl(platform, handle)}
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

export function PartnerInfluencersSection() {
  const href = useCityPath()
  const t = useT('partners')
  return (
    <section aria-label={t('influencersLabel')} className='mt-6'>
      <div className='mb-2.5 flex items-center justify-between gap-3'>
        <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
          {t('influencersLabel')}
        </p>
        <Link
          href={href('/influencers')}
          className='shrink-0 text-[12px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-brand'
        >
          {t('more')}
        </Link>
      </div>

      <MarqueeRow>
        {PARTNER_INFLUENCERS.map((item) => (
          <InfluencerItem
            key={item.id}
            name={t(`influencers.${item.nameKey}`)}
            shortName={item.shortName}
            handle={item.handle}
            platform={item.platform}
          />
        ))}
      </MarqueeRow>
    </section>
  )
}
