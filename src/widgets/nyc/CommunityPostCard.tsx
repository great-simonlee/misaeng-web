import Link from 'next/link'
import type { ReactNode } from 'react'

import { SchoolBadge } from '@components'
import {
  formatFoodPartySpend,
  formatFoodWait,
  getFoodCategory,
  getFoodCuisineLabel,
  normalizeFoodCuisine,
  resolveCommunityThumbnail,
} from '@lib/community/food'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import {
  getCptOptTimelineDateRange,
  hasCptOptPostUpdate,
} from '@lib/community/cptOpt'
import {
  getJobReviewTimelineDateRange,
  hasJobReviewPostUpdate,
} from '@lib/community/jobReview'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { CptOptActivityMeta } from '@widgets/nyc/CptOptActivityMeta'
import { CptOptTypeBadge } from '@widgets/nyc/CptOptTypeBadge'
import { JobReviewActivityMeta } from '@widgets/nyc/JobReviewActivityMeta'
import { JobReviewTypeBadge } from '@widgets/nyc/JobReviewTypeBadge'
import { FoodCategoryBadge } from '@widgets/nyc/FoodCategoryBadge'
import { FoodCardCommentStat } from '@widgets/nyc/FoodCardCommentStat'
import { FoodCardRecommendStat } from '@widgets/nyc/FoodCardRecommendStat'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'
import {
  formatRoommateBudget,
  formatRoommateMoveInDate,
  getRoommateLookingForLabel,
  getRoommateLookingForStyle,
} from '@lib/community/roommate'

interface CommunityPostCardProps {
  post: CommunityPost
  boardId: NycCommunityBoardId
}

export function CommunityPostCard({ post, boardId }: CommunityPostCardProps) {
  if (boardId === 'food') {
    return <FoodListingCard post={post} boardId={boardId} />
  }
  if (boardId === 'status') {
    return <CptOptListingCard post={post} boardId={boardId} />
  }
  if (boardId === 'job-review') {
    return <JobReviewListingCard post={post} boardId={boardId} />
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
  const cuisineLabel = getFoodCuisineLabel(normalizeFoodCuisine(post.detail))
  const foodSpend = formatFoodPartySpend(post.partySize, post.totalSpend)
  const foodWait = formatFoodWait(post.waitMinutes)
  const metaChips = [
    cuisineLabel ? (
      <FoodOverlayChip key='cuisine'>{cuisineLabel}</FoodOverlayChip>
    ) : null,
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
          <div className='absolute right-2.5 top-2.5 z-10'>
            <PostLikeButton
              kind='community'
              id={post.id}
              boardId={boardId}
              variant='overlay'
            />
          </div>
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
            </p>
          ) : null}

          <p className='mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
            {post.description}
          </p>

          <div className='mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/[0.04] pt-3 text-[12px] font-medium text-[var(--muted)]'>
            <span className='inline-flex items-center gap-1.5'>
              <EyeIcon className='size-3.5' />
              <span className='tabular-nums'>
                {formatCommunityCount(post.viewCount)}
              </span>
            </span>
            <FoodCardRecommendStat
              postId={post.id}
              count={post.recommendCount}
            />
            <FoodCardCommentStat postId={post.id} count={post.commentCount} />
            <span className='inline-flex items-center gap-1.5'>
              <PinIcon className='size-3.5' />
              <span>
                <span className='tabular-nums'>
                  {formatCommunityCount(post.beenThereCount)}
                </span>
                명이 가봤어요
              </span>
            </span>
          </div>
        </div>
      </Link>
    </BoardSurface>
  )
}

/** CPT/OPT: 타임라인 요약 카드 */
function CptOptListingCard({
  post,
  boardId,
}: {
  post: CommunityPost
  boardId: NycCommunityBoardId
}) {
  const stepCount = post.cptOptTimeline?.length ?? 0
  const dateRange = getCptOptTimelineDateRange(post.cptOptTimeline)
  const metaLine = [post.location].filter(Boolean).join(' · ')
  const wasUpdated = hasCptOptPostUpdate(post)

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
            <CptOptTypeBadge type={post.cptOptType} />
            {wasUpdated ? (
              <span className='inline-flex items-center rounded-full bg-[#fff8f5] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
                업데이트됨
              </span>
            ) : null}
            <SchoolBadge schoolId={post.authorSchoolId} size='md' />
            {metaLine ? (
              <span className='inline-flex max-w-full items-center truncate rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] ring-1 ring-black/8'>
                {metaLine}
              </span>
            ) : null}
          </div>
          <PostLikeButton
            kind='community'
            id={post.id}
            boardId={boardId}
            variant='icon'
          />
        </div>

        <div className='mt-2'>
          <CptOptActivityMeta
            createdAt={post.createdAt}
            updatedAt={post.updatedAt}
            compact
          />
        </div>

        <h3 className='mt-2.5 text-[16px] font-semibold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[17px]'>
          <span className='line-clamp-2'>{post.title}</span>
        </h3>

        <p className='mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
          {post.cptOptTips?.trim() || post.description}
        </p>

        <div className='mt-3.5 flex items-center justify-between gap-3 border-t border-black/[0.04] pt-3 text-[12px] font-medium text-[var(--muted)]'>
          <span className='inline-flex items-center gap-1.5'>
            <EyeIcon className='size-3.5' />
            <span className='tabular-nums'>
              {formatCommunityCount(post.viewCount)}
            </span>
          </span>
          <span className='text-right text-[11px] leading-snug'>
            {stepCount > 0 ? (
              <>
                타임라인 {stepCount}단계
                {dateRange ? (
                  <span className='block text-[10px] font-normal text-[var(--muted)]'>
                    {dateRange}
                  </span>
                ) : null}
              </>
            ) : null}
          </span>
        </div>
      </Link>
    </BoardSurface>
  )
}

/** 취업 후기: 타임라인 요약 카드 */
function JobReviewListingCard({
  post,
  boardId,
}: {
  post: CommunityPost
  boardId: NycCommunityBoardId
}) {
  const stepCount = post.jobReviewTimeline?.length ?? 0
  const dateRange = getJobReviewTimelineDateRange(post.jobReviewTimeline)
  const metaLine = [post.location, post.jobReviewIndustry]
    .filter(Boolean)
    .join(' · ')
  const wasUpdated = hasJobReviewPostUpdate(post)

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
            <JobReviewTypeBadge type={post.jobReviewType} />
            {wasUpdated ? (
              <span className='inline-flex items-center rounded-full bg-[#fff8f5] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
                업데이트됨
              </span>
            ) : null}
            <SchoolBadge schoolId={post.authorSchoolId} size='md' />
            {metaLine ? (
              <span className='inline-flex max-w-full items-center truncate rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] ring-1 ring-black/8'>
                {metaLine}
              </span>
            ) : null}
          </div>
          <PostLikeButton
            kind='community'
            id={post.id}
            boardId={boardId}
            variant='icon'
          />
        </div>

        <div className='mt-2'>
          <JobReviewActivityMeta
            createdAt={post.createdAt}
            updatedAt={post.updatedAt}
            compact
          />
        </div>

        <h3 className='mt-2.5 text-[16px] font-semibold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[17px]'>
          <span className='line-clamp-2'>{post.title}</span>
        </h3>

        <p className='mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted)] sm:text-[14px]'>
          {post.jobReviewTips?.trim() || post.description}
        </p>

        <div className='mt-3.5 flex items-center justify-between gap-3 border-t border-black/[0.04] pt-3 text-[12px] font-medium text-[var(--muted)]'>
          <span className='inline-flex items-center gap-1.5'>
            <EyeIcon className='size-3.5' />
            <span className='tabular-nums'>
              {formatCommunityCount(post.viewCount)}
            </span>
          </span>
          <span className='text-right text-[11px] leading-snug'>
            {stepCount > 0 ? (
              <>
                채용 단계 {stepCount}건
                {dateRange ? (
                  <span className='block text-[10px] font-normal text-[var(--muted)]'>
                    {dateRange}
                  </span>
                ) : null}
              </>
            ) : null}
          </span>
        </div>
      </Link>
    </BoardSurface>
  )
}

/** 중고·기타: 텍스트 중심 카드 */
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
  const isRoommate = boardId === 'roommate'
  const roommateLabel = isRoommate
    ? getRoommateLookingForLabel(post.roommateLookingFor)
    : null
  const roommateStyle = getRoommateLookingForStyle(post.roommateLookingFor)
  const budgetLabel = isRoommate
    ? formatRoommateBudget(post.roommateBudgetMax)
    : isMarket && post.detail?.trim()
      ? `$${post.detail.trim()}`
      : null
  const moveInLabel = isRoommate
    ? formatRoommateMoveInDate(post.roommateMoveInDate)
    : null
  const metaLine = [
    post.location,
    !isMarket && !isRoommate && post.detail ? post.detail : null,
    moveInLabel ? `입주 ${moveInLabel}` : null,
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
            {roommateLabel ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                  roommateStyle.badge,
                )}
              >
                {roommateLabel}
              </span>
            ) : null}
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
          {budgetLabel ? (
            <span className='shrink-0 rounded-full bg-[#eef4ff] px-2.5 py-1 text-[14px] font-semibold tabular-nums text-[#3b5bdb]'>
              {budgetLabel}
              {isRoommate ? <span className='text-[11px] font-medium'>/월</span> : null}
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
