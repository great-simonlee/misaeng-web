'use client'

import Link from 'next/link'

import { SchoolBadge, UserAvatar } from '@components'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import {
  formatRoommateBudget,
  formatRoommateMoveInRange,
  getRoommateLookingForLabel,
  getRoommateLookingForStyle,
} from '@lib/community/roommate'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

function getRoommateThumbnail(post: CommunityPost): string | null {
  const fromGallery = (post.galleryPhotos ?? [])
    .map((item) => item.imageUrl?.trim())
    .find(Boolean)
  if (fromGallery) return fromGallery
  return post.thumbnailUrl?.trim() || null
}

interface RoommatePostCardProps {
  post: CommunityPost
}

/** 취업 후기·OPT 보드와 같은 텍스트 중심 목록 카드 */
export function RoommatePostCard({ post }: RoommatePostCardProps) {
  const typeLabel = getRoommateLookingForLabel(post.roommateLookingFor)
  const typeStyle = getRoommateLookingForStyle(post.roommateLookingFor)
  const budget = formatRoommateBudget(post.roommateBudgetMax)
  const moveIn = formatRoommateMoveInRange(
    post.roommateMoveInDate,
    post.roommateMoveOutDate,
  )
  const thumbnail = getRoommateThumbnail(post)
  const location = post.location?.trim() || null
  const authorName = getCommunityAuthorDisplayName(post)
  const authorInitial = authorName.charAt(0).toUpperCase()
  const authorPhoto = post.authorPhotoURL?.trim() || null

  return (
    <BoardSurface
      as='article'
      className='group overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_20px_40px_rgba(15,23,42,0.08)]'
    >
      <Link
        href={`/nyc/roommate/${post.id}`}
        className='block touch-manipulation px-4 py-4 sm:px-5 sm:py-5'
      >
        <div className='flex gap-3.5 sm:gap-4'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
                {typeLabel ? (
                  <span
                    className={cn(
                      'inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                      typeStyle.badge,
                    )}
                  >
                    {typeLabel}
                  </span>
                ) : null}
                {location ? (
                  <span className='inline-flex max-w-full items-center truncate rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] ring-1 ring-black/8'>
                    {location}
                  </span>
                ) : null}
              </div>
              <PostLikeButton
                kind='community'
                id={post.id}
                boardId='roommate'
                variant='icon'
              />
            </div>

            <h3 className='mt-2.5 text-[16px] font-semibold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[17px]'>
              <span className='line-clamp-2'>{post.title}</span>
            </h3>

            {post.description?.trim() ? (
              <p className='mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
                {post.description.trim()}
              </p>
            ) : null}
          </div>

          {thumbnail ? (
            <div className='relative hidden h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-[#e8eaee] ring-1 ring-black/[0.04] sm:block sm:h-24 sm:w-24'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail}
                alt=''
                className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]'
              />
            </div>
          ) : null}
        </div>

        <div className='mt-3.5 flex items-end justify-between gap-3 border-t border-black/[0.04] pt-3'>
          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <UserAvatar
                photoURL={authorPhoto}
                initial={authorInitial}
                size='sm'
                className='!h-5 !w-5 text-[9px]'
              />
              <span className='truncate text-[12px] font-semibold text-[var(--muted-foreground)]'>
                {authorName}
              </span>
              <SchoolBadge schoolId={post.authorSchoolId} size='author' />
            </div>
            <p className='mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]'>
              <EyeIcon className='size-3.5 shrink-0' />
              <span className='tabular-nums'>
                {formatCommunityCount(post.viewCount)}
              </span>
              <span className='text-black/20' aria-hidden>
                ·
              </span>
              <span>{formatCommunityRelativeTime(post.createdAt)}</span>
            </p>
          </div>

          {(budget || moveIn) ? (
            <div className='shrink-0 text-right'>
              {budget ? (
                <p className='text-[13px] font-semibold tabular-nums leading-none text-[var(--foreground)]'>
                  {budget}
                  <span className='font-medium text-[var(--muted)]'>/월</span>
                </p>
              ) : null}
              {moveIn ? (
                <p
                  className={cn(
                    'text-[11px] tabular-nums text-[var(--muted)]',
                    budget ? 'mt-1' : null,
                  )}
                >
                  {moveIn}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </BoardSurface>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z'
      />
      <circle cx='12' cy='12' r='2.5' />
    </svg>
  )
}
