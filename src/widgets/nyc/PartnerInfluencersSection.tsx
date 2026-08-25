import Link from 'next/link'

import { MarqueeRow } from '@components'
import {
  NYC_PARTNER_INFLUENCERS,
  type NycInfluencerPlatformId,
} from '@lib/constants/nyc'

function profileUrl(
  platform: NycInfluencerPlatformId,
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
  platform: NycInfluencerPlatformId
}) {
  const content = (
    <>
      <InfluencerMark shortName={shortName} />
      <span className='min-w-0 pr-0.5'>
        <span className='block text-xs font-semibold leading-tight text-[var(--foreground)]'>
          {name}
        </span>
        <span className='mt-0.5 block text-[11px] leading-none text-[var(--muted)]'>
          {handle ? `@${handle}` : '협력 인플루언서 모집 중'}
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
        className={`${className} touch-manipulation transition hover:border-[#F64310]/40 focus-visible:border-[#F64310]/40`}
      >
        {content}
      </a>
    )
  }

  return <div className={className}>{content}</div>
}

export function PartnerInfluencersSection() {
  return (
    <section aria-label='협력 인플루언서' className='mt-6'>
      <div className='mb-2.5 flex items-center justify-between gap-3'>
        <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
          협력 인플루언서
        </p>
        <Link
          href='/nyc/influencers'
          className='shrink-0 text-[12px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[#F64310]'
        >
          더보기
        </Link>
      </div>

      <MarqueeRow>
        {NYC_PARTNER_INFLUENCERS.map((item) => (
          <InfluencerItem
            key={item.id}
            name={item.name}
            shortName={item.shortName}
            handle={item.handle}
            platform={item.platform}
          />
        ))}
      </MarqueeRow>
    </section>
  )
}
