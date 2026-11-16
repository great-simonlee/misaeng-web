'use client'

import Link from 'next/link'

import { cn } from '@lib'
import { normalizeMarketZip } from '@lib/community/marketplace'
import { useFormat, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { BagIcon } from '@widgets/ellieo/icons'

export function marketCover(post: CommunityPost): string | null {
  return post.thumbnailUrl || post.galleryPhotos?.find((photo) => photo.imageUrl)?.imageUrl || null
}

/** "$80" or "Free" */
export function useMarketPrice() {
  const t = useT('community')
  const format = useFormat()
  return (price: number | null | undefined) =>
    price === 0 ? t('ellieoMarket.free') : price == null ? '' : format.usd(price, 0)
}

export function MarketStatusBadge({ status, className }: { status: CommunityPost['marketStatus']; className?: string }) {
  const t = useT('community')
  if (status !== 'reserved' && status !== 'sold') return null
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[12px] font-bold',
        status === 'reserved' ? 'bg-[var(--brand-soft)] text-[var(--brand-deep)]' : 'bg-[var(--foreground)] text-white',
        className,
      )}
    >
      {t(`ellieoMarket.status.${status}`)}
    </span>
  )
}

export function MarketCard({ post, href }: { post: CommunityPost; href: string }) {
  const format = useFormat()
  const price = useMarketPrice()
  const cover = marketCover(post)
  const zip = normalizeMarketZip(post.location)

  return (
    <Link
      href={href}
      className='group block h-full rounded-[1.5rem] bg-white p-2 shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)]'
    >
      <span className='relative block aspect-square overflow-hidden rounded-[1.125rem] bg-[var(--surface)]'>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- listing photo URL
          <img
            src={cover}
            alt=''
            loading='lazy'
            className={cn(
              'size-full object-cover transition duration-300 group-hover:scale-[1.04]',
              post.marketStatus === 'sold' && 'opacity-60',
            )}
          />
        ) : (
          <span className='flex size-full items-center justify-center text-[var(--muted)]'>
            <BagIcon className='size-8' />
          </span>
        )}
        <MarketStatusBadge status={post.marketStatus} className='absolute left-2 top-2' />
      </span>
      <span className='block px-1.5 pb-1.5 pt-2.5'>
        <span
          className={cn(
            'block text-[16px] font-bold tabular-nums',
            post.price === 0 ? 'text-[var(--brand)]' : 'text-[var(--foreground)]',
          )}
        >
          {price(post.price)}
        </span>
        <span className='mt-0.5 line-clamp-2 block text-[14px] font-medium leading-snug text-[var(--foreground)]'>
          {post.title}
        </span>
        <span className='mt-1 block truncate text-[12.5px] text-[var(--muted)]'>
          {[zip, format.relative(post.createdAt)].filter(Boolean).join(' · ')}
        </span>
      </span>
    </Link>
  )
}
