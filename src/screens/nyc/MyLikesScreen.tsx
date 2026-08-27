'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { LoadingState, SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { usePostLikes } from '@hooks/usePostLikes'
import { fetchCommunityPost } from '@lib/community/client'
import { getCptOptTypeLabel } from '@lib/community/cptOpt'
import { getJobReviewTypeLabel } from '@lib/community/jobReview'
import {
  getHousingUnitRent,
  getListingArea,
  getListingDisplayAddress,
  getListingUnitNet,
} from '@lib/constants/housingMock'
import {
  NYC_CATEGORIES,
  NYC_PAGE_SHELL_CLASS,
  getNycCategory,
  resolveMergedCommunityBoardId,
  type NycCategoryId,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { fetchHousingListing } from '@lib/housing/fetchListings'
import { cn } from '@lib'
import type { PostLikeEntry } from '@lib/utils/postLikes'
import type { CommunityPost, HousingPost } from '@/types/nyc'
import {
  AccountCategoryChip,
  AccountCategorySideItem,
} from '@widgets/nyc/AccountCategoryNav'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'

type LikedItem = {
  id: string
  title: string
  meta: string
  href: string
  categoryId: NycCategoryId
  boardLabel: string
  authorSchoolId: string | null
}

type CategoryFilter = 'all' | NycCategoryId

/** 좋아요 모아보기 대상 카테고리 */
const LIKEABLE_CATEGORY_IDS: NycCategoryId[] = [
  'housing',
  'food',
  'status',
  'job-review',
]

export function MyLikesScreen() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { likedEntries } = usePostLikes()
  const [items, setItems] = useState<LikedItem[]>([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const likedKey = useMemo(
    () =>
      likedEntries
        .map((entry) => `${entry.kind}:${entry.id}:${entry.boardId ?? ''}`)
        .join('|'),
    [likedEntries],
  )

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/nyc/login?next=${encodeURIComponent('/nyc/me/likes')}`)
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) {
      setItems([])
      return
    }

    if (likedEntries.length === 0) {
      setItems([])
      setLoadingRemote(false)
      return
    }

    let cancelled = false
    setLoadingRemote(true)

    ;(async () => {
      const results = await Promise.all(
        likedEntries.map((entry) => resolveLikedItem(entry)),
      )
      if (cancelled) return
      setItems(results.filter((item): item is LikedItem => item != null))
      setLoadingRemote(false)
    })()

    return () => {
      cancelled = true
    }
    // likedKey로 직렬화된 변경만 추적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, likedKey])

  const likeableCategories = useMemo(
    () =>
      NYC_CATEGORIES.filter((board) =>
        LIKEABLE_CATEGORY_IDS.includes(board.id),
      ),
    [],
  )

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      likeableCategories.map((c) => [c.id, 0]),
    ) as Record<NycCategoryId, number>
    for (const item of items) {
      map[item.categoryId] = (map[item.categoryId] ?? 0) + 1
    }
    return map
  }, [items, likeableCategories])

  const filteredItems = useMemo(() => {
    if (category === 'all') return items
    return items.filter((item) => item.categoryId === category)
  }, [items, category])

  const sortedBoards = useMemo(() => {
    return [...likeableCategories].sort((a, b) => {
      const diff = counts[b.id] - counts[a.id]
      if (diff !== 0) return diff
      return (
        likeableCategories.findIndex((c) => c.id === a.id) -
        likeableCategories.findIndex((c) => c.id === b.id)
      )
    })
  }, [counts, likeableCategories])

  const selectedBoard =
    category === 'all'
      ? null
      : likeableCategories.find((c) => c.id === category) ?? null

  const loadingItems = loadingRemote && items.length === 0

  if (loading || !user) {
    return <LoadingState fullPage />
  }

  return (
    <div className='relative flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]'>
      <div
        className={cn(
          'flex flex-1 flex-col pb-14 pt-8 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12',
          NYC_PAGE_SHELL_CLASS,
        )}
      >
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium tracking-[0.18em] text-[var(--muted)]'>
              ACCOUNT
            </p>
            <h1 className='mt-1.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] lg:text-[1.75rem]'>
              내가 좋아요 누른 글
            </h1>
            <p className='mt-1.5 text-[14px] text-[var(--muted-foreground)]'>
              하우징 · 맛집 · OPT/비자에서 찜해 둔 글을 모아 볼 수 있어요
            </p>
          </div>
          <span className='rounded-full bg-white px-3 py-1.5 text-[13px] tabular-nums text-[var(--muted)] ring-1 ring-black/[0.06]'>
            {loadingItems
              ? '…'
              : category === 'all'
                ? `전체 ${items.length}`
                : `${filteredItems.length}개`}
          </span>
        </div>

        <div className='mt-8 grid flex-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-stretch lg:gap-8'>
          <aside className='hidden lg:block'>
            <div className='sticky top-24 overflow-hidden rounded-[1.25rem] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
              <p className='px-3 pb-2 pt-2.5 text-[11px] font-medium tracking-[0.14em] text-[var(--muted)]'>
                카테고리
              </p>
              <nav className='flex flex-col gap-0.5' aria-label='좋아요 카테고리'>
                <AccountCategorySideItem
                  label='전체'
                  count={items.length}
                  active={category === 'all'}
                  onClick={() => setCategory('all')}
                />
                {sortedBoards.map((board) => (
                  <AccountCategorySideItem
                    key={board.id}
                    label={board.title}
                    count={counts[board.id]}
                    active={category === board.id}
                    onClick={() => setCategory(board.id)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            {!loadingItems && (
              <div className='mb-5 shrink-0 lg:hidden'>
                <ChipScrollRow
                  ariaLabel='좋아요 카테고리'
                  leading={
                    <AccountCategoryChip
                      variant='lead'
                      label='전체'
                      active={category === 'all'}
                      count={items.length}
                      onClick={() => setCategory('all')}
                    />
                  }
                >
                  {sortedBoards.map((board) => (
                    <AccountCategoryChip
                      key={board.id}
                      label={board.title}
                      active={category === board.id}
                      count={counts[board.id]}
                      onClick={() => setCategory(board.id)}
                    />
                  ))}
                </ChipScrollRow>
              </div>
            )}

            {loadingItems ? (
              <LoadingState
                className='flex-1 py-16'
                label='글을 불러오는 중이에요…'
              />
            ) : filteredItems.length === 0 ? (
              <div className='flex flex-1 flex-col items-center justify-center rounded-[1.25rem] bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04] lg:py-20'>
                <p className='text-[15px] font-semibold tracking-tight text-[var(--foreground)] lg:text-base'>
                  {category === 'all'
                    ? '아직 좋아요한 글이 없어요'
                    : `${selectedBoard?.title ?? '이 카테고리'}에 좋아요한 글이 없어요`}
                </p>
                <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                  {category === 'all'
                    ? '관심 있는 글의 하트를 누르면 여기에 모여요'
                    : '해당 게시판에서 하트를 누르면 여기에 보여요'}
                </p>
                <Link
                  href={selectedBoard?.href ?? '/nyc/housing'}
                  className='mt-5 inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
                >
                  {selectedBoard
                    ? `${selectedBoard.title} 게시판 보기`
                    : '하우징 둘러보기'}
                </Link>
              </div>
            ) : (
              <ul className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
                {filteredItems.map((item, index) => (
                  <li key={`${item.href}-${item.id}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block px-5 py-4 touch-manipulation transition hover:bg-[#f8f9fb] active:bg-[#f4f5f7] lg:px-6 lg:py-5',
                        index !== filteredItems.length - 1 &&
                          'border-b border-[#f0f1f3]',
                      )}
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0 flex-1'>
                          {category === 'all' && (
                            <p className='text-[11px] font-medium tracking-wide text-[var(--brand)]'>
                              {item.boardLabel}
                            </p>
                          )}
                          <div
                            className={cn(
                              'flex flex-wrap items-center gap-1.5',
                              category === 'all' ? 'mt-1' : undefined,
                            )}
                          >
                            <p className='truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)] lg:text-base'>
                              {item.title}
                            </p>
                            <SchoolBadge schoolId={item.authorSchoolId} />
                          </div>
                          <p className='mt-0.5 truncate text-[12px] text-[var(--muted)] lg:text-[13px]'>
                            {item.meta}
                          </p>
                        </div>
                        <svg
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          className='mt-1 hidden size-4 shrink-0 text-[#c4c9d1] lg:block'
                          aria-hidden
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='m9 6 6 6-6 6'
                          />
                        </svg>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

async function resolveLikedItem(
  entry: PostLikeEntry,
): Promise<LikedItem | null> {
  if (entry.kind === 'housing') {
    const listing = await fetchHousingListing(entry.id)
    if (!listing || listing.status !== 'open') return null
    return mapHousing(listing)
  }

  const post = await fetchCommunityPost(entry.id)
  if (!post || post.status === 'closed') return null
  return mapCommunity(post, entry.boardId)
}

function formatHousingRentMeta(post: HousingPost): string {
  const gross = getHousingUnitRent(post)
  const net = getListingUnitNet(post)
  if (net != null)
    return `$${gross.toLocaleString()} / $${net.toLocaleString()}/월`
  return `$${gross.toLocaleString()}/월`
}

function mapHousing(post: HousingPost): LikedItem {
  return {
    id: post.id,
    title: getListingDisplayAddress(post),
    meta: `${getListingArea(post)} · ${formatHousingRentMeta(post)}`,
    href: `/nyc/housing/${post.id}`,
    categoryId: 'housing',
    boardLabel: '하우징',
    authorSchoolId: post.authorSchoolId,
  }
}

function mapCommunity(
  post: CommunityPost,
  preferredBoardId?: string,
): LikedItem | null {
  const rawBoardId = preferredBoardId || post.categoryId
  const mergedId = resolveMergedCommunityBoardId(rawBoardId) ?? rawBoardId
  const category = getNycCategory(mergedId)
  const categoryId = (category?.id ?? mergedId) as NycCategoryId

  if (!LIKEABLE_CATEGORY_IDS.includes(categoryId)) return null

  const boardId = (category?.id ?? mergedId) as NycCommunityBoardId
  const typeLabel =
    boardId === 'status'
      ? getCptOptTypeLabel(post.cptOptType)
      : boardId === 'job-review'
        ? getJobReviewTypeLabel(post.jobReviewType)
        : null
  const meta =
    [
      typeLabel,
      post.location,
      boardId === 'job-review' ? post.jobReviewIndustry : post.detail,
    ]
      .filter(Boolean)
      .join(' · ') || '상세 보기'

  return {
    id: post.id,
    title: post.title,
    meta,
    href: `/nyc/${boardId}/${post.id}`,
    categoryId,
    boardLabel: category?.title ?? boardId,
    authorSchoolId: post.authorSchoolId,
  }
}
