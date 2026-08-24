'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

import { BottomSheet, LoadingState, PullToRefresh } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { fetchCommunityPosts } from '@lib/community/client'
import { FOOD_CATEGORIES } from '@lib/community/food'
import {
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost, FoodCategoryId } from '@/types/nyc'
import { BoardListToolbar, BoardQuickChip } from '@widgets/nyc/BoardListToolbar'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CommunityPostCard } from '@widgets/nyc/CommunityPostCard'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { FoodCategoryIcon } from '@widgets/nyc/FoodCategoryBadge'

type SortOption = 'newest' | 'oldest'

interface CommunityListScreenProps {
  boardId: NycCommunityBoardId
  title: string
}

/** body overflow-x / PullToRefresh transform 때문에 sticky가 깨져 fixed로 고정 */
function FoodCategoryStickyBar({
  foodCategory,
  setFoodCategory,
}: {
  foodCategory: FoodCategoryId | 'all'
  setFoodCategory: Dispatch<SetStateAction<FoodCategoryId | 'all'>>
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const [barHeight, setBarHeight] = useState(0)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const sync = () => setBarHeight(bar.offsetHeight)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [stuck])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    let observer: IntersectionObserver | null = null

    function navOffsetPx() {
      return window.matchMedia('(min-width: 640px)').matches ? 64 : 56
    }

    function connect() {
      const target = sentinelRef.current
      if (!target) return
      observer?.disconnect()
      observer = new IntersectionObserver(
        ([entry]) => {
          setStuck(!entry.isIntersecting)
        },
        {
          root: null,
          threshold: 0,
          rootMargin: `-${navOffsetPx()}px 0px 0px 0px`,
        },
      )
      observer.observe(target)
    }

    connect()
    const mq = window.matchMedia('(min-width: 640px)')
    const onChange = () => connect()
    mq.addEventListener('change', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
      observer?.disconnect()
    }
  }, [])

  const chips = (
    <div className='overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      <div
        className='flex w-max items-center gap-2'
        role='listbox'
        aria-label='맛집 카테고리'
      >
        <BoardQuickChip
          label='전체'
          active={foodCategory === 'all'}
          onClick={() => setFoodCategory('all')}
        />
        {FOOD_CATEGORIES.map((cat) => (
          <BoardQuickChip
            key={cat.id}
            label={cat.label}
            active={foodCategory === cat.id}
            onClick={() => setFoodCategory(cat.id)}
            icon={
              <FoodCategoryIcon categoryId={cat.id} className='size-3.5' />
            }
          />
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* 마진 없는 센티넬 — 여백은 unstuck 바에만 줘서 고정 시 빈 공간이 안 남게 */}
      <div ref={sentinelRef} className='h-0 w-full' aria-hidden />
      <div
        ref={barRef}
        className={cn(
          'z-[90] border-b border-black/[0.04] bg-[#f8f8f9]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#f8f8f9]/85',
          stuck
            ? 'fixed inset-x-0 top-14 py-2.5 sm:top-16'
            : 'relative -mx-4 mt-2 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
        )}
      >
        {stuck ? (
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>{chips}</div>
        ) : (
          chips
        )}
      </div>
      {stuck ? <div style={{ height: barHeight }} aria-hidden /> : null}
    </>
  )
}

export function CommunityListScreen({
  boardId,
  title,
}: CommunityListScreenProps) {
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const { user } = useAuth()
  const { error: toastError } = useToast()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [foodCategory, setFoodCategory] = useState<FoodCategoryId | 'all'>(
    'all',
  )
  const [draftQuery, setDraftQuery] = useState('')
  const [draftSort, setDraftSort] = useState<SortOption>('newest')
  const isFoodBoard = boardId === 'food'

  const loadPosts = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await fetchCommunityPosts(boardId)
        setPosts(data)
        setError(null)
      } catch (err) {
        const msg = getErrorMessage(err, '목록을 불러오지 못했어요')
        setError(msg)
        if (!opts?.silent) toastError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [boardId, toastError],
  )

  useEffect(() => {
    let cancelled = false
    void loadPosts().catch(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [loadPosts])

  const refreshPosts = useCallback(async () => {
    await loadPosts({ silent: true })
  }, [loadPosts])

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase()
    let next = posts
    if (isFoodBoard && foodCategory !== 'all') {
      next = next.filter((post) => post.foodCategory === foodCategory)
    }
    if (!isFoodBoard && q) {
      next = next.filter((post) => {
        const haystack = [
          post.title,
          post.description,
          post.location,
          post.detail,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    return [...next].sort((a, b) =>
      sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    )
  }, [posts, query, sort, foodCategory, isFoodBoard])

  const activeFilterCount =
    (query.trim() ? 1 : 0) + (sort !== 'newest' ? 1 : 0)

  function openFilters() {
    setDraftQuery(query)
    setDraftSort(sort)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setQuery(draftQuery)
    setSort(draftSort)
    setFiltersOpen(false)
  }

  function clearFilters() {
    setDraftQuery('')
    setDraftSort('newest')
  }

  const newPath = `/nyc/${boardId}/new`
  const postHref = user
    ? newPath
    : `/nyc/login?next=${encodeURIComponent(newPath)}`

  const listSection = (
    <section className='pb-14 pt-4 sm:pb-16 sm:pt-5'>
      {loading && (
        <LoadingState className='py-20' label='글을 불러오는 중이에요…' />
      )}

      {!loading && error && (
        <EmptyState
          title='목록을 불러오지 못했어요'
          description={error}
          actionHref={`/nyc/${boardId}`}
          actionLabel='다시 시도'
        />
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <EmptyState
          title={
            posts.length === 0
              ? `아직 ${title} 글이 없습니다`
              : '조건에 맞는 글이 없어요'
          }
          description={
            posts.length === 0
              ? '첫 글을 올려 커뮤니티를 시작해 보세요.'
              : isFoodBoard
                ? '다른 카테고리를 선택해 보세요.'
                : '필터를 바꿔 다시 찾아 보세요.'
          }
          actionHref={posts.length === 0 ? postHref : undefined}
          actionLabel={posts.length === 0 ? meta.writeLabel : undefined}
        />
      )}

      {!loading && filteredPosts.length > 0 && (
        <>
          <p className='mb-3.5 text-[12px] font-medium text-[var(--muted)] sm:mb-4 sm:text-[13px]'>
            {!isFoodBoard && (query.trim() || sort !== 'newest')
              ? `검색 결과 ${filteredPosts.length}`
              : `${filteredPosts.length}개의 글`}
          </p>
          <div
            className={
              isFoodBoard
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-5'
                : 'flex flex-col gap-4 sm:gap-5'
            }
          >
            {filteredPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                boardId={boardId}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )

  return (
    <BoardPageShell width={isFoodBoard ? 'wide' : 'narrow'}>
      <BoardListToolbar
        breadcrumbLabel={title}
        intro={meta.listIntro}
        writeHref={postHref}
        writeLabel={meta.writeLabel}
        showFilter={!isFoodBoard}
        onFilterClick={isFoodBoard ? undefined : openFilters}
        filterCount={isFoodBoard ? 0 : activeFilterCount}
      />

      {isFoodBoard ? (
        <FoodCategoryStickyBar
          foodCategory={foodCategory}
          setFoodCategory={setFoodCategory}
        />
      ) : null}

      <PullToRefresh onRefresh={refreshPosts}>{listSection}</PullToRefresh>

      {!isFoodBoard ? (
        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title='필터'
          footer={
            <div className='flex items-center justify-between gap-3 px-5 py-4'>
              <button
                type='button'
                onClick={clearFilters}
                className='text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-2 touch-manipulation'
              >
                전체 해제
              </button>
              <button
                type='button'
                onClick={applyFilters}
                className='inline-flex h-11 min-w-[140px] items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--navy-light)]'
              >
                적용하기
              </button>
            </div>
          }
        >
          <div className='space-y-6 px-4 pb-2'>
            <section>
              <h4 className='text-[14px] font-semibold text-[var(--foreground)]'>
                검색
              </h4>
              <input
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder='제목, 내용, 지역으로 검색'
                className='mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafbfc] px-3.5 text-[15px] outline-none transition placeholder:text-[var(--muted)] focus:border-black/20 focus:bg-white'
              />
            </section>

            <section>
              <h4 className='text-[14px] font-semibold text-[var(--foreground)]'>
                정렬
              </h4>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                {(
                  [
                    { id: 'newest', label: '최신순' },
                    { id: 'oldest', label: '오래된순' },
                  ] as const
                ).map((option) => {
                  const active = draftSort === option.id
                  return (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => setDraftSort(option.id)}
                      className={cn(
                        'h-11 rounded-xl border text-[13px] font-semibold touch-manipulation transition',
                        active
                          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
                          : 'border-black/[0.08] bg-white text-[var(--muted-foreground)] hover:border-black/15',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        </BottomSheet>
      ) : null}
    </BoardPageShell>
  )
}
