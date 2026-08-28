'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

import { PhotoLightbox, SchoolBadge, type PhotoLightboxItem } from '@components'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import {
  buildFoodDetailCarouselSlides,
  formatFoodMenuDisplay,
  formatUsd,
  getFoodCuisineLabel,
  getFoodMenuName,
} from '@lib/community/food'
import { resolveFoodPlacePoint } from '@lib/community/foodMap'
import { isAnonymousBoard, type NycCommunityBoardId } from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'
import { FoodCategoryBadge } from '@widgets/nyc/FoodCategoryBadge'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { FoodDetailHeroCarousel } from '@widgets/nyc/FoodDetailHeroCarousel'

const FoodPlaceMap = dynamic(
  () =>
    import('@widgets/nyc/FoodPlaceMap').then((mod) => mod.FoodPlaceMap),
  {
    ssr: false,
    loading: () => (
      <div className='h-48 animate-pulse rounded-2xl bg-[#e8eaee] sm:h-56' />
    ),
  },
)

type FoodDetailContentProps = {
  post: CommunityPost
  boardId: NycCommunityBoardId
  boardTitle: string
  isAuthor: boolean
  onDelete: () => void
}

type LightboxState = {
  items: PhotoLightboxItem[]
  index: number
  eyebrow?: string
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
  const menuItems = post.menuItems ?? []
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const menuLightboxItems = useMemo<PhotoLightboxItem[]>(
    () =>
      (post.menuItems || [])
        .filter((item) => item.imageUrl?.trim())
        .map((item) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          caption: formatFoodMenuDisplay(item),
        })),
    [post.menuItems],
  )

  const galleryLightboxItems = useMemo<PhotoLightboxItem[]>(
    () =>
      (post.galleryPhotos || [])
        .filter((item) => item.imageUrl?.trim())
        .map((item) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          caption: item.caption,
        })),
    [post.galleryPhotos],
  )

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
  const cuisineLabel = getFoodCuisineLabel(post.detail)
  const locationLine = shortAddress
  const placePoint = useMemo(() => resolveFoodPlacePoint(post), [post])

  function openMenuLightbox(index: number) {
    if (menuLightboxItems.length === 0) return
    setLightbox({
      items: menuLightboxItems,
      index,
      eyebrow: '메뉴',
    })
  }

  function openGalleryLightbox(index: number) {
    if (galleryLightboxItems.length === 0) return
    setLightbox({
      items: galleryLightboxItems,
      index,
      eyebrow: '가게 내부',
    })
  }

  return (
    <article>
      <div className='-mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-[1.25rem]'>
        <FoodDetailHeroCarousel
          slides={slides}
          backHref={`/nyc/${boardId}`}
          backLabel={`${boardTitle} 목록`}
        />
      </div>

      <div className='mt-5 px-1 sm:mt-7 sm:px-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <FoodCategoryBadge
            categoryId={post.foodCategory}
            variant='soft'
            size='md'
          />
          {cuisineLabel ? (
            <span className='inline-flex items-center rounded-full bg-[#f1f2f4] px-2.5 py-1 text-[12px] font-semibold text-[var(--muted-foreground)]'>
              {cuisineLabel}
            </span>
          ) : null}
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

        {placePoint ? (
          <section className='mt-8'>
            <SectionLabel>위치</SectionLabel>
            <div className='mt-4'>
              <FoodPlaceMap place={placePoint} />
            </div>
          </section>
        ) : null}

        {menuItems.length > 0 ? (
          <section className='mt-8'>
            <SectionLabel>메뉴</SectionLabel>
            <ul className='mt-4 divide-y divide-black/[0.06]'>
              {menuItems.map((item) => {
                const lightboxIndex = menuLightboxItems.findIndex(
                  (entry) => entry.id === item.id,
                )
                const canOpen =
                  Boolean(item.imageUrl?.trim()) && lightboxIndex >= 0

                function openThis() {
                  if (!canOpen) return
                  openMenuLightbox(lightboxIndex)
                }

                return (
                  <li key={item.id} className='py-4 first:pt-0 last:pb-0'>
                    {canOpen ? (
                      <button
                        type='button'
                        onClick={openThis}
                        className='flex w-full gap-4 text-left touch-manipulation transition hover:opacity-90'
                        aria-label='메뉴 사진 크게 보기'
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt=''
                          className='h-20 w-20 shrink-0 rounded-xl bg-[#e8eaee] object-cover sm:h-24 sm:w-24'
                        />
                        <span className='min-w-0 flex-1 self-center'>
                          <span className='block text-[14px] font-semibold text-[var(--foreground)] sm:text-[15px]'>
                            {getFoodMenuName(item, '메뉴')}
                          </span>
                          {item.caption?.trim() ? (
                            <span className='mt-0.5 block text-[13px] leading-[1.5] text-[var(--muted-foreground)] sm:text-[14px]'>
                              {item.caption.trim()}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ) : (
                      <div className='flex gap-4'>
                        <div className='h-20 w-20 shrink-0 rounded-xl bg-[#e8eaee] sm:h-24 sm:w-24' />
                        <div className='min-w-0 flex-1 self-center'>
                          <p className='text-[14px] font-semibold text-[var(--foreground)] sm:text-[15px]'>
                            {getFoodMenuName(item, '메뉴')}
                          </p>
                          {item.caption?.trim() ? (
                            <p className='mt-0.5 text-[13px] leading-[1.5] text-[var(--muted-foreground)] sm:text-[14px]'>
                              {item.caption.trim()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {galleryLightboxItems.length > 0 ? (
          <section className='mt-8'>
            <SectionLabel>가게 내부 · 분위기</SectionLabel>
            <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5'>
              {galleryLightboxItems.map((item, index) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => openGalleryLightbox(index)}
                  className='aspect-square overflow-hidden rounded-xl bg-[#e8eaee] touch-manipulation transition hover:opacity-90'
                  aria-label='분위기 사진 크게 보기'
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt=''
                    className='h-full w-full object-cover'
                  />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className='mt-8'>
          <SectionLabel>후기</SectionLabel>
          <CommunityRichBody
            html={bodyHtml}
            className='mt-4 text-[15px] leading-[1.75] text-[var(--foreground)]'
          />
        </section>
      </div>

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

      <PhotoLightbox
        open={Boolean(lightbox)}
        items={lightbox?.items ?? []}
        index={lightbox?.index ?? 0}
        eyebrow={lightbox?.eyebrow}
        onClose={() => setLightbox(null)}
        onIndexChange={(next) =>
          setLightbox((prev) => (prev ? { ...prev, index: next } : prev))
        }
      />
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
