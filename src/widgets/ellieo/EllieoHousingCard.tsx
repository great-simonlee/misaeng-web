'use client'

import Image from 'next/image'
import Link from 'next/link'

import { HousingPricePair, SchoolBadge } from '@components'
import { usePagedGallery } from '@hooks/usePagedGallery'
import { cn } from '@lib'
import { hrefForHousingListing } from '@lib/constants/cities'
import {
  formatHousingAvailableDate,
  formatListingBedBath,
  getHousingRoomLabel,
  getHousingRoomNet,
  getHousingUnitRent,
  getListingArea,
  getListingAvailableDate,
  getListingCardBadges,
  getListingDisplayAddress,
  getListingImages,
  getListingUnitNet,
  getPricedRooms,
  getRoomSelectionKey,
  shouldShowListingRoomRows,
  sortHousingRooms,
} from '@lib/constants/housingMock'
import { shouldUnoptimizeHousingImage } from '@lib/housing/fetchListings'
import { translateListingCardBadges } from '@lib/housing/listing'
import { useFormat, useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'
import { CalendarIcon, PinIcon } from '@widgets/ellieo/icons'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

/**
 * Ellieo housing list card. Same data and links as the Misaeng card (HousingPostCard),
 * different presentation: inset photo, perks as tags under the photo, price first, room options as a table.
 */
export function EllieoHousingCard({
  listing,
  highlightRoomType = 'all',
}: {
  listing: HousingListing
  highlightRoomType?: string | 'all'
}) {
  const t = useT('housing')
  const th = useT('hub')
  const format = useFormat()
  const images = getListingImages(listing)
  const displayAddress = getListingDisplayAddress(listing)
  const area = getListingArea(listing)
  const unitRent = getHousingUnitRent(listing)
  const unitNet = getListingUnitNet(listing)
  const availableDate = getListingAvailableDate(listing)
  const roomRows = sortHousingRooms(getPricedRooms(listing))
  const showOptionRows = shouldShowListingRoomRows(listing)
  const badges = translateListingCardBadges(listing, getListingCardBadges(listing), t)
  const detailHref = hrefForHousingListing(listing)
  const { ref: galleryRef, index: activeIndex, swipingRef, pointerHandlers } = usePagedGallery(
    images.length,
    listing.id,
  )

  return (
    <article className='group flex flex-col border-b border-[var(--border)] bg-white py-3.5'>
      <div className='relative aspect-video overflow-hidden rounded-xl bg-[var(--surface)]'>
        {images.length > 0 ? (
          <div
            ref={galleryRef}
            {...pointerHandlers}
            className='flex h-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            {images.map((src, index) => (
              <Link
                key={`${listing.id}-${src}-${index}`}
                href={detailHref}
                onClick={(event) => {
                  if (swipingRef.current) {
                    event.preventDefault()
                    swipingRef.current = false
                  }
                }}
                className='relative h-full w-full min-w-full shrink-0 snap-start snap-always'
                aria-label={t('card.photoLabel', { address: displayAddress, number: index + 1 })}
              >
                <Image
                  src={src}
                  alt=''
                  fill
                  draggable={false}
                  unoptimized={shouldUnoptimizeHousingImage(src)}
                  className='object-cover'
                  sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                  priority={index === 0}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className='flex h-full items-center justify-center text-[13px] text-[var(--muted)]'>
            {t('card.noPhoto')}
          </div>
        )}

        <div className='absolute right-2 top-2 z-10'>
          <PostLikeButton kind='housing' id={listing.id} variant='overlay' />
        </div>

        {images.length > 1 ? (
          <span className='pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-[rgb(20_18_31/0.6)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white'>
            {activeIndex + 1}/{images.length}
          </span>
        ) : null}

      </div>

      <div className='flex flex-1 flex-col pt-2.5'>
        {badges.length > 0 ? (
          <div className='mb-2 flex flex-wrap gap-1'>
            {badges.map((badge, index) => (
              <span
                key={badge.key}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
                  index === 0
                    ? 'bg-[var(--ellieo-success-soft)] text-[#0d7a55]'
                    : 'bg-[var(--brand-soft)] text-[var(--brand-deep)]',
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        <Link href={detailHref} className='block min-w-0 touch-manipulation'>
          <p className='text-[16px] font-semibold tabular-nums text-[var(--brand)]'>
            {format.usd(unitRent, 0)}
            <span className='text-[13px] font-medium'>{th('ellieo.perMonth')}</span>
          </p>
          <h3 className='flex min-w-0 items-center gap-1.5 text-[16px] font-semibold text-[var(--foreground)]'>
            <span className='min-w-0 truncate'>{displayAddress}</span>
            <SchoolBadge schoolId={listing.authorSchoolId} />
          </h3>
          <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--muted)]'>
            <span className='inline-flex min-w-0 items-center gap-1'>
              <PinIcon className='size-3.5 shrink-0' />
              <span className='truncate'>{area}</span>
            </span>
            <span>{formatListingBedBath(listing)}</span>
            {unitNet && unitNet !== unitRent ? (
              <span className='font-semibold text-[var(--foreground)]'>
                {t('price.net')} {format.usd(unitNet, 0)}
              </span>
            ) : null}
            <span className='inline-flex items-center gap-1'>
              <CalendarIcon className='size-3.5 shrink-0' />
              {t('card.moveIn', {
                date: formatHousingAvailableDate(availableDate) || t('card.moveInTbd'),
              })}
            </span>
          </p>
        </Link>

        {showOptionRows ? (
          <ul className='mt-2.5 divide-y divide-white overflow-hidden rounded-xl bg-[var(--surface)]'>
            {roomRows.map((room, index) => {
              const key = getRoomSelectionKey(room, index)
              const highlighted = highlightRoomType !== 'all' && room.type === highlightRoomType
              return (
                <li key={key}>
                  <Link
                    href={hrefForHousingListing(listing, `?room=${key}`)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 transition',
                      highlighted ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--surface)]',
                    )}
                  >
                    <span className='min-w-0 text-[13px] font-medium leading-snug text-[var(--foreground)]'>
                      {getHousingRoomLabel(room, t)}
                    </span>
                    <HousingPricePair
                      gross={room.price}
                      net={getHousingRoomNet(listing, room)}
                      size='sm'
                      layout='row'
                      className='shrink-0'
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
