import Link from 'next/link'
import type { ReactNode } from 'react'

import { SchoolBadge } from '@components'
import {
  formatFoodPartySpend,
  formatFoodWait,
  getFoodCategory,
  resolveCommunityThumbnail,
} from '@lib/community/food'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { FoodCategoryBadge } from '@widgets/nyc/FoodCategoryBadge'

interface CommunityPostCardProps {
  post: CommunityPost
  boardId: NycCommunityBoardId
}

export function CommunityPostCard({ post, boardId }: CommunityPostCardProps) {
  if (boardId === 'food') {
    return <FoodListingCard post={post} boardId={boardId} />
  }
  return <TextListingCard post={post} boardId={boardId} />
}

/** 맛집: 이미지 상단형 카드 — 모바일 1열 / 데스크탑 그리드 */
function FoodListingCard({
  post,
  boardId,
}: {
  post: CommunityPost
  boardId: NycCommunityBoardId
}) {
  const anonymous = isAnonymousBoard(boardId)
  const thumbnail = resolveCommunityThumbnail(post)
  const foodCategory = getFoodCategory(post.foodCategory)
  const foodSpend = formatFoodPartySpend(post.partySize, post.totalSpend)
  const foodWait = formatFoodWait(post.waitMinutes)
  const metaChips = [
    anonymous ? (
      <FoodOverlayChip key='anon'>익명</FoodOverlayChip>
    ) : null,
    foodSpend ? (
      <FoodOverlayChip key='spend' className='tabular-nums'>
        {foodSpend}
      </FoodOverlayChip>
    ) : null,
    foodWait ? (
      <FoodOverlayChip key='wait'>{foodWait}</FoodOverlayChip>
    ) : null,
  ].filter(Boolean)

  return (
    <BoardSurface
      as='article'
      className='group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_22px_44px_rgba(15,23,42,0.09)]'
    >
      <Link
        href={`/nyc/${boardId}/${post.id}`}
        className='flex h-full flex-col touch-manipulation'
      >
        <div className='relative aspect-[16/10] overflow-hidden bg-[#e8eaee] md:aspect-[4/3]'>
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt=''
              className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]'
            />
          ) : (
            <div className='flex h-full items-center justify-center text-[13px] text-[var(--muted)]'>
              사진 없음
            </div>
          )}
          {foodCategory ? (
            <div className='absolute left-2.5 top-2.5'>
              <FoodCategoryBadge
                categoryId={foodCategory.id}
                size='sm'
                variant='solid'
                className='shadow-[0_2px_8px_rgba(15,23,42,0.12)]'
              />
            </div>
          ) : null}
          {metaChips.length > 0 ? (
            <>
              <div
                className='pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent'
                aria-hidden
              />
              <div className='absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1 p-2.5'>
                {metaChips}
              </div>
            </>
          ) : null}
        </div>

        <div className='flex flex-1 flex-col px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4'>
          <div className='flex items-start justify-between gap-3'>
            <h3 className='min-w-0 flex-1 text-[16px] font-semibold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[17px]'>
              <span className='line-clamp-2'>{post.title}</span>
            </h3>
            <time className='shrink-0 pt-1 text-[11px] font-medium tabular-nums text-[var(--muted)]'>
              {formatCommunityRelativeTime(post.createdAt)}
            </time>
          </div>

          {post.location ? (
            <p className='mt-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--muted-foreground)]'>
              <LocationIcon className='size-3.5 shrink-0 opacity-70' />
              <span className='truncate'>{post.location}</span>
              {post.detail ? (
                <>
                  <span className='text-black/15'>·</span>
                  <span className='truncate'>{post.detail}</span>
                </>
              ) : null}
            </p>
          ) : null}

          <p className='mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
            {post.description}
          </p>

          <div className='mt-3.5 flex items-center gap-4 border-t border-black/[0.04] pt-3 text-[12px] font-medium text-[var(--muted)]'>
            <span className='inline-flex items-center gap-1.5'>
              <EyeIcon className='size-3.5' />
              <span className='tabular-nums'>
                {formatCommunityCount(post.viewCount)}
              </span>
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <PinIcon className='size-3.5' />
              <span>
                가봤어요{' '}
                <span className='tabular-nums'>
                  {formatCommunityCount(post.beenThereCount)}
                </span>
              </span>
            </span>
          </div>
        </div>
      </Link>
    </BoardSurface>
  )
}

/** 중고·CPT 등: 텍스트 중심 카드 */
function TextListingCard({
  post,
  boardId,
}: {
  post: CommunityPost
  boardId: NycCommunityBoardId
}) {
  const anonymous = isAnonymousBoard(boardId)
  const boardMeta = NYC_COMMUNITY_BOARD_META[boardId]
  const isMarket = boardId === 'marketplace'
  const priceLabel =
    isMarket && post.detail?.trim() ? `$${post.detail.trim()}` : null
  const metaLine = [
    post.location,
    !isMarket && post.detail ? post.detail : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <BoardSurface
      as='article'
      className='group overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_20px_40px_rgba(15,23,42,0.08)]'
    >
      <Link
        href={`/nyc/${boardId}/${post.id}`}
        className='block touch-manipulation px-4 py-4 sm:px-5 sm:py-5'
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
            {anonymous ? (
              <span className='rounded-full bg-[#f1f2f4] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]'>
                익명
              </span>
            ) : (
              <SchoolBadge schoolId={post.authorSchoolId} />
            )}
            {metaLine ? (
              <span className='truncate text-[12px] font-medium text-[var(--muted)]'>
                {metaLine}
              </span>
            ) : null}
          </div>
          <time className='shrink-0 text-[11px] font-medium tabular-nums text-[var(--muted)]'>
            {formatCommunityRelativeTime(post.createdAt)}
          </time>
        </div>

        <div className='mt-2.5 flex items-start justify-between gap-3'>
          <h3 className='min-w-0 flex-1 text-[16px] font-semibold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[17px]'>
            <span className='line-clamp-2'>{post.title}</span>
          </h3>
          {priceLabel ? (
            <span className='shrink-0 rounded-full bg-[#eef4ff] px-2.5 py-1 text-[14px] font-semibold tabular-nums text-[#3b5bdb]'>
              {priceLabel}
            </span>
          ) : null}
        </div>

        <p className='mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
          {post.description}
        </p>

        <div className='mt-3.5 flex items-center justify-between gap-3 border-t border-black/[0.04] pt-3 text-[12px] font-medium text-[var(--muted)]'>
          <span className='inline-flex items-center gap-1.5'>
            <EyeIcon className='size-3.5' />
            <span className='tabular-nums'>
              {formatCommunityCount(post.viewCount)}
            </span>
          </span>
          {boardMeta.detailLabel && !isMarket && post.detail ? (
            <span className='truncate text-[11px]'>{post.detail}</span>
          ) : null}
        </div>
      </Link>
    </BoardSurface>
  )
}

function FoodOverlayChip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full shrink-0 items-center gap-1 rounded-full bg-black/40 px-2 text-[10px] font-semibold leading-none text-white backdrop-blur-[6px]',
        className,
      )}
    >
      {children}
    </span>
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
        d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'
      />
      <circle cx='12' cy='12' r='3' />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
      aria-hidden
    >
      <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
      <circle cx='12' cy='10' r='2.5' />
    </svg>
  )
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={cn(className)}
      aria-hidden
    >
      <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
      <circle cx='12' cy='10' r='2.5' />
    </svg>
  )
}
