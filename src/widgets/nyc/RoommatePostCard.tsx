'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { SchoolBadge, UserAvatar } from '@components'
import { useCity } from '@hooks/useCity'
import { hrefForCommunityPost } from '@lib/constants/cities'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import {
  formatRoommateBudget,
  formatRoommateDateShort,
  getRoommateLookingForShortLabel,
  getRoommateLookingForStyle,
  getRoommateStayLength,
  getRoommateTimeline,
  isRoommateBoostActive,
  isRoommateOffer,
  normalizeRoommateLookingFor,
} from '@lib/community/roommate'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

/** 카드가 읽는 필드만 (작성 화면 미리보기도 같은 카드를 쓴다) */
export type RoommateCardPost = Pick<
  CommunityPost,
  | 'id'
  | 'categoryId'
  | 'city'
  | 'title'
  | 'description'
  | 'location'
  | 'detail'
  | 'roommateLookingFor'
  | 'roommateBudgetMax'
  | 'roommateMoveInDate'
  | 'roommateMoveOutDate'
  | 'galleryPhotos'
  | 'thumbnailUrl'
  | 'authorNickname'
  | 'authorPhotoURL'
  | 'authorSchoolId'
  | 'viewCount'
  | 'createdAt'
  | 'boostedUntil'
>

export function getRoommatePhotoUrls(
  post: Pick<CommunityPost, 'galleryPhotos' | 'thumbnailUrl'>,
): string[] {
  const urls = [
    ...(post.galleryPhotos ?? []).map((item) => item.imageUrl?.trim()),
    post.thumbnailUrl?.trim(),
  ].filter((url): url is string => Boolean(url))
  return [...new Set(urls)]
}

interface RoommatePostCardProps {
  post: RoommateCardPost
  /** 작성 화면 미리보기: 링크·좋아요 없이 모양만 */
  preview?: boolean
}

/** 취업 후기·OPT 보드와 같은 텍스트 중심 목록 카드 + 가격·입주일·사진 */
export function RoommatePostCard({ post, preview = false }: RoommatePostCardProps) {
  const t = useT('housing')
  const tCommunity = useT('community')
  const format = useFormat()
  const city = useCity()
  const lookingFor = normalizeRoommateLookingFor(post.roommateLookingFor, post.detail)
  const typeLabel = getRoommateLookingForShortLabel(lookingFor, t)
  const typeStyle = getRoommateLookingForStyle(lookingFor)
  const budget = formatRoommateBudget(post.roommateBudgetMax)
  const offer = isRoommateOffer(lookingFor)
  const photos = getRoommatePhotoUrls(post)
  const thumbnail = photos[0] ?? null
  const location = post.location?.trim() || null
  const authorName = getCommunityAuthorDisplayName(post, null, tCommunity)
  const authorInitial = authorName.charAt(0).toUpperCase()
  const authorPhoto = post.authorPhotoURL?.trim() || null
  const pinned = !preview && isRoommateBoostActive(post)
  const { ended, availableNow } = getRoommateTimeline(post)
  const dates = useRoommateDateLine(post)

  const body = (
    <>
      <div className='flex gap-3.5 sm:gap-4'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
              {pinned ? <PinnedBadge label={t('roommate.card.pinned')} /> : null}
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
            {!preview ? (
              <PostLikeButton
                kind='community'
                id={post.id}
                boardId='roommate'
                variant='icon'
              />
            ) : null}
          </div>

          <h3 className='mt-2.5 text-[16px] font-semibold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[17px]'>
            <span className='line-clamp-2'>{post.title}</span>
          </h3>

          {post.description?.trim() ? (
            <p className='mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-[14px]'>
              {post.description.trim()}
            </p>
          ) : null}
        </div>

        {thumbnail ? (
          <div className='relative h-[4.75rem] w-[4.75rem] shrink-0 self-start overflow-hidden rounded-xl bg-[#e8eaee] ring-1 ring-black/[0.04] sm:h-24 sm:w-24'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=''
              loading='lazy'
              className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]'
            />
            {photos.length > 1 ? (
              <span
                className='absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm'
                aria-label={t('roommate.card.photoCount', { count: photos.length })}
              >
                <PhotoIcon className='size-2.5' />
                {photos.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {(budget || dates || ended || availableNow) ? (
        <div className='mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5'>
          {budget ? (
            <p className='text-[15px] font-bold tabular-nums leading-none tracking-[-0.01em] text-[var(--foreground)]'>
              <PricePerMonth
                price={budget}
                template={offer ? t('roommate.card.pricePerMonth') : t('roommate.card.budgetUpTo')}
              />
            </p>
          ) : null}
          {dates ? (
            <p
              className={cn(
                'flex min-w-0 items-center gap-1 text-[12px] font-medium tabular-nums leading-none',
                ended ? 'text-[var(--muted)] line-through decoration-black/20' : 'text-[var(--muted-foreground)]',
              )}
            >
              <CalendarIcon className='size-3.5 shrink-0 text-[var(--muted)]' />
              <span className='truncate'>{dates}</span>
            </p>
          ) : null}
          {ended ? (
            <StatusPill tone='muted'>{t('roommate.card.ended')}</StatusPill>
          ) : availableNow ? (
            <StatusPill tone='green'>{t('roommate.card.availableNow')}</StatusPill>
          ) : null}
        </div>
      ) : null}

      <div className='mt-3.5 flex items-center justify-between gap-3 border-t border-black/[0.04] pt-3'>
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
        <p className='flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]'>
          <EyeIcon className='size-3.5 shrink-0' />
          <span className='tabular-nums'>
            {format.number(Math.max(0, Math.floor(Number(post.viewCount) || 0)), { notation: 'compact' })}
          </span>
          <span className='text-black/20' aria-hidden>
            ·
          </span>
          <span>{format.relative(post.createdAt)}</span>
        </p>
      </div>
    </>
  )

  return (
    <BoardSurface
      as='article'
      className={cn(
        'group overflow-hidden',
        !preview &&
          'transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_20px_40px_rgba(15,23,42,0.08)]',
        pinned && 'ring-1 ring-[var(--brand)]/25',
        ended && 'opacity-75',
      )}
    >
      {preview ? (
        <div className='px-4 py-4 sm:px-5 sm:py-5'>{body}</div>
      ) : (
        <Link
          href={hrefForCommunityPost(post, city)}
          className='block touch-manipulation px-4 py-4 sm:px-5 sm:py-5'
        >
          {body}
        </Link>
      )}
    </BoardSurface>
  )
}

/**
 * 입주일 한 줄: "9월 1일 – 11월 30일 · 3개월", 시작만 있으면 "9월 1일부터", 끝만 있으면 "11월 30일까지".
 * 상세 화면도 같은 문구를 쓴다.
 */
export function useRoommateDateLine(
  post: Pick<CommunityPost, 'roommateMoveInDate' | 'roommateMoveOutDate'>,
) {
  const t = useT('housing')
  const format = useFormat()
  const from = formatRoommateDateShort(format, post.roommateMoveInDate)
  const to = formatRoommateDateShort(format, post.roommateMoveOutDate)
  const stay = getRoommateStayLength(post.roommateMoveInDate, post.roommateMoveOutDate)
  if (from && to) {
    const range = `${from} – ${to}`
    return stay
      ? `${range} · ${t(`roommate.card.stay.${stay.unit}`, { count: stay.count })}`
      : range
  }
  if (from) return t('roommate.card.from', { date: from })
  if (to) return t('roommate.card.until', { date: to })
  return null
}

export function PinnedBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-[var(--brand)] px-2.5 py-1 text-[11px] font-semibold text-white',
        className,
      )}
    >
      <PinIcon className='size-3' />
      {label}
    </span>
  )
}

function StatusPill({ tone, children }: { tone: 'green' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight',
        tone === 'green'
          ? 'bg-[#eefaf4] text-[#0f766e] ring-1 ring-[#99f6e4]/60'
          : 'bg-[#f1f2f4] text-[var(--muted)]',
      )}
    >
      {children}
    </span>
  )
}

/** `{price}/월` 문구에서 가격 뒤 단위만 연하게 */
function PricePerMonth({ price, template }: { price: string; template: string }) {
  const [before, after = ''] = template.split('{price}')
  return (
    <>
      {before ? (
        <span className='text-[12px] font-medium text-[var(--muted)]'>{before}</span>
      ) : null}
      {price}
      {after ? (
        <span className='text-[12px] font-medium text-[var(--muted)]'>{after}</span>
      ) : null}
    </>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M14.6 2.2 21.8 9.4l-1.7 1.1-2.6-.6-3.7 3.7.9 4.6-1.6 1.6-3.8-3.8-5.2 5.2-1.2-1.2 5.2-5.2-3.8-3.8 1.6-1.6 4.6.9 3.7-3.7-.6-2.6 1.1-1.7Z' />
    </svg>
  )
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' className={className} aria-hidden>
      <rect x='3' y='5' width='18' height='14' rx='2.5' />
      <circle cx='9' cy='10' r='1.6' />
      <path strokeLinecap='round' strokeLinejoin='round' d='m21 16-5-5-8 8' />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' className={className} aria-hidden>
      <rect x='3.5' y='5' width='17' height='15.5' rx='2.5' />
      <path strokeLinecap='round' d='M8 3v4M16 3v4M3.5 10h17' />
    </svg>
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
