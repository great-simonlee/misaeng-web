'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type MouseEvent } from 'react'

import { SchoolBadge } from '@components'
import { useHousingLike } from '@hooks/useHousingLikes'
import { usePagedGallery } from '@hooks/usePagedGallery'
import {
  formatHousingCreditOfferLabel,
  formatHousingAvailableRange,
  getHousingEarliestAvailableOption,
  getHousingListingTypeLabel,
  getHousingUnitRent,
  getHousingPerkLabel,
  getHousingRoomOptionLabel,
  HOUSING_CARD_BADGE_PERKS,
  sortHousingRoomOptions,
} from '@lib/constants/housingMock'
import type {
  HousingPerkId,
  HousingPost,
  HousingRoommateComposition,
  HousingRoomOption,
} from '@/types/nyc'

interface HousingPostCardProps {
  post: HousingPost
  /** 룸 타입 필터 시 해당 옵션 강조 */
  highlightRoomType?: string | 'all'
}

export function HousingPostCard({
  post,
  highlightRoomType = 'all',
}: HousingPostCardProps) {
  const images = post.images
  const listingTypeLabel = getHousingListingTypeLabel(post)
  const unitRent = getHousingUnitRent(post)
  const earliestOption = getHousingEarliestAvailableOption(post)
  const roomOptions = sortHousingRoomOptions(post.roomOptions)
  const showOptionRows =
    roomOptions.length > 1 ||
    roomOptions.some((option) => option.roomType != null)
  const badgeLabels = [
    ...post.perks
      .filter((perk) => HOUSING_CARD_BADGE_PERKS.includes(perk))
      .map((perk) => ({ key: perk, label: getHousingPerkLabel(perk) })),
    ...(post.creditOffer
      ? [
          {
            key: 'credit-offer',
            label: formatHousingCreditOfferLabel(post.creditOffer),
          },
        ]
      : []),
  ]
  const { liked, toggle } = useHousingLike(post.id)
  const {
    ref: galleryRef,
    index: activeIndex,
    swipingRef,
    pointerHandlers,
  } = usePagedGallery(images.length, post.id)

  function handleToggleLike(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    toggle()
  }

  return (
    <article className='group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] transition hover:ring-black/[0.1] sm:rounded-xl'>
      <div className='relative aspect-[4/3] overflow-hidden bg-[#eef0f3] sm:aspect-[3/2]'>
        {images.length > 0 ? (
          <div
            ref={galleryRef}
            {...pointerHandlers}
            className='flex h-full touch-pan-y snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
          >
            {images.map((src, index) => (
              <Link
                key={`${post.id}-${src}-${index}`}
                href={`/nyc/housing/${post.id}`}
                onClick={(event) => {
                  if (swipingRef.current) {
                    event.preventDefault()
                    swipingRef.current = false
                  }
                }}
                className='relative h-full w-full min-w-full shrink-0 overflow-hidden snap-start snap-always'
                aria-label={`${post.title} 사진 ${index + 1}`}
              >
                <Image
                  src={src}
                  alt=''
                  fill
                  draggable={false}
                  className='object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.05]'
                  sizes='(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                  priority={index === 0}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className='flex h-full items-center justify-center text-[14px] text-[var(--muted)] sm:text-[12px]'>
            사진 없음
          </div>
        )}

        <div
          className='pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent sm:h-14'
          aria-hidden
        />
        <div
          className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent sm:h-16'
          aria-hidden
        />

        <div className='absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 sm:inset-x-2.5 sm:top-2.5'>
          <div className='pointer-events-none flex min-w-0 flex-1 flex-wrap content-start gap-1'>
            {badgeLabels.map((badge) => (
              <CardBadge key={badge.key} label={badge.label} size='sm' />
            ))}
          </div>
          <button
            type='button'
            onClick={handleToggleLike}
            aria-label={liked ? '찜 해제' : '찜하기'}
            aria-pressed={liked}
            className='relative shrink-0 touch-manipulation transition hover:scale-110 active:scale-95'
          >
            {/* 탭 영역만 확대 — 아이콘 가장자리는 좌측 배지와 동일 inset 유지 */}
            <span className='absolute -inset-2' aria-hidden />
            <HeartIcon
              filled={liked}
              className='relative block size-6 sm:size-[1.35rem]'
            />
          </button>
        </div>

        {images.length > 1 && (
          <div
            className='pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1 sm:bottom-2'
            aria-hidden
          >
            {images.map((_, index) => (
              <span
                key={index}
                className={
                  index === activeIndex
                    ? 'h-1.5 w-1.5 rounded-full bg-white shadow-sm'
                    : 'h-1.5 w-1.5 rounded-full bg-white/45'
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-1 flex-col px-3.5 py-3.5 sm:px-3 sm:py-2.5'>
        <Link
          href={`/nyc/housing/${post.id}`}
          className='flex flex-col gap-1 touch-manipulation sm:gap-0.5'
        >
          <div className='flex min-w-0 items-center gap-2'>
            <div className='flex min-w-0 flex-1 items-center gap-1.5'>
              <h3 className='min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[13px]'>
                {post.title}
              </h3>
              <SchoolBadge schoolId={post.authorSchoolId} />
            </div>
            <p className='shrink-0 text-right text-[15px] font-semibold leading-snug tabular-nums tracking-tight text-[var(--foreground)] sm:text-[13px]'>
              ${unitRent.toLocaleString()}
              <span className='font-medium text-[var(--muted)]'>/월</span>
            </p>
          </div>
          <p className='truncate text-[13px] text-[var(--muted-foreground)] sm:text-[12px]'>
            {post.neighborhood}
            <span className='mx-1 text-[#d0d4db]'>·</span>
            {listingTypeLabel}
            <span className='mx-1 text-[#d0d4db]'>·</span>
            입주{' '}
            {(earliestOption &&
              formatHousingAvailableRange(
                earliestOption.availableFrom,
                earliestOption.availableTo,
              )) ||
              '미정'}
          </p>
        </Link>

        {showOptionRows && (
          <ul className='mt-2.5 space-y-1 border-t border-[#f0f1f3] pt-2.5 sm:mt-2 sm:pt-2'>
            {roomOptions.map((option) => (
              <RoomOptionRow
                key={option.id}
                option={option}
                highlighted={
                  highlightRoomType !== 'all' &&
                  option.roomType === highlightRoomType
                }
                href={`/nyc/housing/${post.id}?room=${option.id}`}
              />
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

function RoomOptionRow({
  option,
  highlighted,
  href,
}: {
  option: HousingRoomOption
  highlighted: boolean
  href: string
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 touch-manipulation transition sm:py-1 ${
          highlighted
            ? 'bg-[#f4f5f7] ring-1 ring-[var(--foreground)]/15'
            : 'hover:bg-[#f7f8fa]'
        }`}
      >
        <span className='min-w-0 truncate text-[13px] font-medium text-[var(--foreground)] sm:text-[12px]'>
          {getHousingRoomOptionLabel(option)}
        </span>
        <span className='flex shrink-0 items-center gap-2'>
          {option.roommateWaiting && option.roommateComposition && (
            <RoommateCompositionBadge
              composition={option.roommateComposition}
              compact
            />
          )}
          <span className='text-[13px] font-semibold tabular-nums text-[var(--foreground)] sm:text-[12px]'>
            ${option.rent.toLocaleString()}
            <span className='font-medium text-[var(--muted)]'>/월</span>
          </span>
        </span>
      </Link>
    </li>
  )
}

export function PerkBadge({
  perk,
  size = 'md',
  label,
}: {
  perk?: HousingPerkId
  size?: 'sm' | 'md'
  label?: string
}) {
  const text = label ?? (perk ? getHousingPerkLabel(perk) : '')
  return <CardBadge label={text} size={size} />
}

export function RoommateCompositionBadge({
  composition,
  compact = false,
}: {
  composition: HousingRoommateComposition
  compact?: boolean
}) {
  const aria = [
    composition.male > 0 ? `남 ${composition.male}` : null,
    composition.female > 0 ? `여 ${composition.female}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={
        compact
          ? 'inline-flex items-center gap-1 rounded-full bg-[#f4f5f7] px-1.5 py-0.5'
          : 'inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 shadow-sm backdrop-blur-sm sm:gap-1 sm:px-1.5 sm:py-0.5'
      }
      aria-label={aria}
    >
      {composition.male > 0 && (
        <span className='inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums text-[#2563eb] sm:text-[11px]'>
          <MaleIcon className='size-3 sm:size-2.5' />
          {composition.male}
        </span>
      )}
      {composition.male > 0 && composition.female > 0 && (
        <span className='h-2.5 w-px bg-[#e2e8f0]' aria-hidden />
      )}
      {composition.female > 0 && (
        <span className='inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums text-[#db2777] sm:text-[11px]'>
          <FemaleIcon className='size-3 sm:size-2.5' />
          {composition.female}
        </span>
      )}
    </span>
  )
}

function MaleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      className={className}
      aria-hidden
    >
      <circle cx='10' cy='14' r='5' />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M14.5 9.5L19 5M15 5h4v4'
      />
    </svg>
  )
}

function FemaleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      className={className}
      aria-hidden
    >
      <circle cx='12' cy='9' r='5' />
      <path strokeLinecap='round' d='M12 14v6M9.5 17.5h5' />
    </svg>
  )
}

function HeartIcon({
  filled,
  className,
}: {
  filled: boolean
  className?: string
}) {
  return (
    <svg
      viewBox='0 0 32 32'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
    >
      <path
        d='m16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z'
        fill={filled ? '#F64310' : 'none'}
        stroke='#fff'
        strokeWidth='2'
      />
    </svg>
  )
}

function CardBadge({
  label,
  size = 'md',
}: {
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={
        size === 'sm'
          ? 'inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold tracking-tight text-[var(--foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_10px_rgba(15,23,42,0.1)] backdrop-blur-sm sm:px-2 sm:py-0.5 sm:text-[11px]'
          : 'inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]'
      }
    >
      {label}
    </span>
  )
}
