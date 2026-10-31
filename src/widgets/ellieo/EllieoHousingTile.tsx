'use client'

import Image from 'next/image'
import Link from 'next/link'

import { hrefForHousingListing } from '@lib/constants/cities'
import {
  formatListingBedBath,
  getHousingUnitRent,
  getListingArea,
  getListingCardBadges,
  getListingImages,
} from '@lib/constants/housingMock'
import { shouldUnoptimizeHousingImage } from '@lib/housing/fetchListings'
import { translateListingCardBadges } from '@lib/housing/listing'
import { useFormat, useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

/**
 * Photo-first listing tile for the Ellieo home feed: big rounded photo, one perk on the photo,
 * then price and a single detail line. The full card with room prices is EllieoHousingCard (housing list).
 */
export function EllieoHousingTile({ listing }: { listing: HousingListing }) {
  const t = useT('housing')
  const th = useT('hub')
  const format = useFormat()
  const [cover] = getListingImages(listing)
  const badge = translateListingCardBadges(listing, getListingCardBadges(listing), t)[0]
  const href = hrefForHousingListing(listing)
  const rent = getHousingUnitRent(listing)

  return (
    <article className='group relative'>
      <Link href={href} className='block touch-manipulation'>
        <span className='relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--surface)]'>
          {cover ? (
            <Image
              src={cover}
              alt=''
              fill
              unoptimized={shouldUnoptimizeHousingImage(cover)}
              className='object-cover transition duration-300 group-hover:scale-[1.03]'
              sizes='(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 25vw'
            />
          ) : null}
          {badge ? (
            <span className='absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-[var(--foreground)] shadow-sm'>
              {badge.label}
            </span>
          ) : null}
        </span>
        <span className='mt-2.5 block text-[17px] font-bold tracking-[-0.01em] text-[var(--foreground)]'>
          {format.usd(rent, 0)}
          <span className='text-[13px] font-medium text-[var(--muted)]'>{th('ellieo.perMonth')}</span>
        </span>
        <span className='mt-0.5 block truncate text-[13.5px] text-[var(--muted)]'>
          {formatListingBedBath(listing)} · {getListingArea(listing)}
        </span>
      </Link>
      <div className='absolute right-2 top-2 z-10'>
        <PostLikeButton kind='housing' id={listing.id} variant='overlay' />
      </div>
    </article>
  )
}
