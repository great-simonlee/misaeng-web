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

/**
 * Compact listing row for the Ellieo home side rail: landscape thumbnail, price, one detail line, one perk.
 * The full card with room prices is EllieoHousingCard (housing list).
 */
export function EllieoHousingRow({ listing }: { listing: HousingListing }) {
  const t = useT('housing')
  const th = useT('hub')
  const format = useFormat()
  const [cover] = getListingImages(listing)
  const badge = translateListingCardBadges(listing, getListingCardBadges(listing), t)[0]

  return (
    <Link href={hrefForHousingListing(listing)} className='group flex min-w-0 items-center gap-3 py-2.5'>
      <span className='relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--surface)]'>
        {cover ? (
          <Image
            src={cover}
            alt=''
            fill
            unoptimized={shouldUnoptimizeHousingImage(cover)}
            className='object-cover transition duration-300 group-hover:scale-[1.04]'
            sizes='96px'
          />
        ) : null}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block text-[15px] font-bold tracking-[-0.01em] text-[var(--foreground)] group-hover:text-[var(--brand)]'>
          {format.usd(getHousingUnitRent(listing), 0)}
          <span className='text-[12px] font-medium text-[var(--muted)]'>{th('ellieo.perMonth')}</span>
        </span>
        <span className='block truncate text-[12.5px] text-[var(--muted)]'>
          {formatListingBedBath(listing)} · {getListingArea(listing)}
        </span>
        {badge ? (
          <span className='mt-1 inline-block rounded-full bg-[var(--ellieo-jade-soft)] px-2 py-px text-[11px] font-semibold text-[var(--ellieo-jade)]'>
            {badge.label}
          </span>
        ) : null}
      </span>
    </Link>
  )
}
