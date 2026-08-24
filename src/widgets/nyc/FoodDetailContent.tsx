'use client'

import { SchoolBadge } from '@components'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import {
  buildFoodDetailCarouselSlides,
  formatUsd,
} from '@lib/community/food'
import { isAnonymousBoard, type NycCommunityBoardId } from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'
import { FoodCategoryBadge } from '@widgets/nyc/FoodCategoryBadge'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { FoodDetailHeroCarousel } from '@widgets/nyc/FoodDetailHeroCarousel'

type FoodDetailContentProps = {
  post: CommunityPost
  boardId: NycCommunityBoardId
  boardTitle: string
  isAuthor: boolean
  onDelete: () => void
}

export function FoodDetailContent({
  post,
  boardId,
  boardTitle,
  isAuthor,
  onDelete,
}: FoodDetailContentProps) {
  const anonymous = isAnonymousBoard(boardId)
  const slides = buildFoodDetailCarouselSlides(post)
  const bodyHtml = post.contentHtml || `<p>${post.description}</p>`
  const menuItems = post.menuItems || []

  const partySize =
    post.partySize != null && post.partySize > 0 ? post.partySize : null
  const totalSpend =
    post.totalSpend != null && Number.isFinite(post.totalSpend)
      ? Math.floor(post.totalSpend)
      : null
  const waitMinutes =
    post.waitMinutes != null && Number.isFinite(post.waitMinutes)
      ? Math.max(0, Math.floor(post.waitMinutes))
      : null

  const shortAddress = shortenAddress(post.location)
  const locationLine = [shortAddress, post.detail].filter(Boolean).join(' · ')

  return (
    <article>
      {/* 히어로 */}
      <div className='-mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-[1.25rem]'>
        <FoodDetailHeroCarousel
          slides={slides}
          backHref={`/nyc/${boardId}`}
          backLabel={`${boardTitle} 목록`}
        />
      </div>

      {/* 본문 */}
      <div className='mt-5 px-1 sm:mt-7 sm:px-0'>
        {/* 메타 */}
        <div className='flex flex-wrap items-center gap-2'>
          <FoodCategoryBadge
            categoryId={post.foodCategory}
            variant='soft'
            size='md'
          />
          {!anonymous ? <SchoolBadge schoolId={post.authorSchoolId} /> : null}
        </div>

        <h1 className='mt-3 text-[1.7rem] font-bold leading-[1.2] tracking-[-0.04em] text-[var(--foreground)] sm:text-[2rem]'>
          {post.title}
        </h1>

        <p className='mt-2 text-[12px] text-[var(--muted)]'>
          {formatCommunityRelativeTime(post.createdAt)}
          <span className='mx-1.5 opacity-40'>·</span>
          조회 {formatCommunityCount(post.viewCount)}
        </p>

        {locationLine ? (
          <p className='mt-3 flex items-start gap-1.5 text-[13px] leading-snug text-[var(--muted-foreground)]'>
            <PinIcon />
            <span className='min-w-0 line-clamp-2'>{locationLine}</span>
          </p>
        ) : null}

        {/* 방문 정보 */}
        {(partySize || totalSpend != null || waitMinutes != null) && (
          <div className='mt-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-[#f4f5f7]'>
            <MetricCell
              label='인원'
              value={partySize ? `${partySize}인` : '—'}
            />
            <MetricCell
              label='총 금액'
              value={
                totalSpend != null ? `$${formatUsd(totalSpend)}` : '—'
              }
              emphasize
            />
            <MetricCell
              label='웨이팅'
              value={
                waitMinutes == null
                  ? '—'
                  : waitMinutes === 0
                    ? '없음'
                    : `${waitMinutes}분`
              }
            />
          </div>
        )}

        {/* 메뉴 */}
        {menuItems.length > 0 ? (
          <section className='mt-8'>
            <SectionLabel>메뉴</SectionLabel>
            <ul className='mt-4 divide-y divide-black/[0.06]'>
              {menuItems.map((item) => (
                <li key={item.id} className='flex gap-4 py-4 first:pt-0 last:pb-0'>
                  <div className='h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#e8eaee] sm:h-24 sm:w-24'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=''
                      className='h-full w-full object-cover'
                    />
                  </div>
                  <p className='min-w-0 flex-1 self-center text-[14px] leading-[1.55] text-[var(--foreground)] sm:text-[15px]'>
                    {item.caption || '한 줄 평이 없어요'}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 후기 */}
        <section className='mt-8'>
          <SectionLabel>후기</SectionLabel>
          <CommunityRichBody
            html={bodyHtml}
            className='mt-4 text-[15px] leading-[1.75] text-[var(--foreground)]'
          />
        </section>
      </div>

      {/* 작성자 · 반응 */}
      <div className='mt-8'>
        <CommunityPostFooter
          post={post}
          boardId={boardId}
          anonymous={anonymous}
          isAuthor={isAuthor}
          loginNext={`/nyc/${boardId}/${post.id}`}
          onDelete={onDelete}
        />
      </div>
    </article>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className='flex items-center gap-3 text-[13px] font-semibold tracking-wide text-[var(--muted)]'>
      {children}
      <span className='h-px flex-1 bg-black/[0.06]' aria-hidden />
    </h2>
  )
}

function MetricCell({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className='border-r border-black/[0.06] px-3 py-3.5 text-center last:border-r-0'>
      <p className='text-[11px] font-medium text-[var(--muted)]'>{label}</p>
      <p
        className={
          emphasize
            ? 'mt-1 text-[15px] font-bold tabular-nums text-[var(--brand)]'
            : 'mt-1 text-[15px] font-semibold tabular-nums text-[var(--foreground)]'
        }
      >
        {value}
      </p>
    </div>
  )
}

function PinIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='mt-0.5 shrink-0 text-[var(--muted)]'
      aria-hidden
    >
      <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
      <circle cx='12' cy='10' r='3' />
    </svg>
  )
}

/** Google 전체 주소 → 앞 2구간만 (거리, 동네) */
function shortenAddress(location: string | null | undefined) {
  const value = location?.trim()
  if (!value) return ''
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length <= 2) return value
  return parts.slice(0, 2).join(', ')
}
