'use client'

import Image from 'next/image'
import Link from 'next/link'

import { SchoolBadge } from '@components'
import { usePagedGallery } from '@hooks/usePagedGallery'
import {
  formatRoommateBudget,
  formatRoommateMoveInDate,
  getRoommateLookingForLabel,
} from '@lib/community/roommate'
import { formatCommunityRelativeTime } from '@lib/constants/communityMock'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

function getRoommateImages(post: CommunityPost): string[] {
  const fromGallery = (post.galleryPhotos ?? [])
    .map((item) => item.imageUrl?.trim())
    .filter(Boolean) as string[]
  if (fromGallery.length > 0) return fromGallery
  const thumb = post.thumbnailUrl?.trim()
  return thumb ? [thumb] : []
}

interface RoommatePostCardProps {
  post: CommunityPost
}

export function RoommatePostCard({ post }: RoommatePostCardProps) {
  const images = getRoommateImages(post)
  const typeLabel = getRoommateLookingForLabel(post.roommateLookingFor)
  const budget = formatRoommateBudget(post.roommateBudgetMax)
  const moveIn = formatRoommateMoveInDate(post.roommateMoveInDate)
  const {
    ref: galleryRef,
    index: activeIndex,
    swipingRef,
    pointerHandlers,
  } = usePagedGallery(images.length, post.id)

  return (
    <article className='group flex flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.045)] ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_36px_rgba(15,23,42,0.07)]'>
      <div className='relative aspect-[4/3] overflow-hidden bg-[#e8eaee] sm:aspect-[3/2]'>
        {images.length > 0 ? (
          <div
            ref={galleryRef}
            {...pointerHandlers}
            className='flex h-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
          >
            {images.map((src, index) => (
              <Link
                key={`${post.id}-${src}-${index}`}
                href={`/nyc/roommate/${post.id}`}
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
                  unoptimized={src.startsWith('blob:') || src.includes('supabase')}
                  className='object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.05]'
                  sizes='(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                  priority={index === 0}
                />
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href={`/nyc/roommate/${post.id}`}
            className='flex h-full items-center justify-center touch-manipulation text-[14px] text-[var(--muted)] sm:text-[12px]'
          >
            사진 없음
          </Link>
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
            {typeLabel ? <CardBadge label={typeLabel} /> : null}
          </div>
          <PostLikeButton
            kind='community'
            id={post.id}
            boardId='roommate'
            variant='overlay'
          />
        </div>

        {images.length > 1 ? (
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
        ) : null}
      </div>

      <div className='flex flex-1 flex-col px-3.5 py-3.5 sm:px-3.5 sm:py-3'>
        <Link
          href={`/nyc/roommate/${post.id}`}
          className='flex flex-col gap-1 touch-manipulation'
        >
          <div className='flex min-h-[2rem] min-w-0 items-center gap-2 sm:min-h-[1.75rem]'>
            <div className='flex min-w-0 flex-1 items-center gap-1.5'>
              <h3 className='min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[14px]'>
                {post.title}
              </h3>
              <SchoolBadge schoolId={post.authorSchoolId} />
            </div>
            {budget ? (
              <span className='shrink-0 text-[15px] font-semibold tabular-nums tracking-tight text-[var(--foreground)] sm:text-[14px]'>
                {budget}
                <span className='text-[11px] font-medium text-[var(--muted)]'>
                  /월
                </span>
              </span>
            ) : null}
          </div>
          <p className='truncate text-[12px] text-[var(--muted)]'>
            {[
              post.location?.trim() || null,
              moveIn ? `입주 ${moveIn}` : null,
              formatCommunityRelativeTime(post.createdAt),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {post.description?.trim() ? (
            <p className='mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
              {post.description.trim()}
            </p>
          ) : null}
        </Link>
      </div>
    </article>
  )
}

function CardBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold leading-none text-[var(--foreground)] shadow-sm backdrop-blur-sm sm:text-[12px]',
      )}
    >
      {label}
    </span>
  )
}
