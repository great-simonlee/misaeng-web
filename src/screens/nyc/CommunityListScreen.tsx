'use client'

import dynamic from 'next/dynamic'
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
import {
  FOOD_CATEGORIES,
  FOOD_CUISINES,
  normalizeFoodCuisine,
  type FoodCuisineId,
} from '@lib/community/food'
import {
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { listMockCommunityPosts } from '@lib/constants/communityMock'
import { cn } from '@lib'
import type { CommunityPost, FoodCategoryId } from '@/types/nyc'
import { BoardListToolbar, BoardQuickChip } from '@widgets/nyc/BoardListToolbar'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CommunityPostCard } from '@widgets/nyc/CommunityPostCard'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { FoodCategoryIcon } from '@widgets/nyc/FoodCategoryBadge'

const FoodPostsMap = dynamic(
  () =>
    import('@widgets/nyc/FoodPostsMap').then((mod) => mod.FoodPostsMap),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-full items-center justify-center bg-[#e8eaee]'>
        <LoadingState label='지도를 불러오는 중…' />
      </div>
    ),
  },
)

type SortOption = 'newest' | 'oldest'
type FoodViewMode = 'list' | 'map'

interface CommunityListScreenProps {
  boardId: NycCommunityBoardId
  title: string
}

/** body overflow-x / PullToRefresh transform 때문에 sticky가 깨져 fixed로 고정 */
function FoodCategoryStickyBar({
  foodCategory,
  setFoodCategory,
  foodCuisine,
  setFoodCuisine,
}: {
  foodCategory: FoodCategoryId | 'all'
  setFoodCategory: Dispatch<SetStateAction<FoodCategoryId | 'all'>>
  foodCuisine: FoodCuisineId | 'all'
  setFoodCuisine: Dispatch<SetStateAction<FoodCuisineId | 'all'>>
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
    <div className='space-y-2'>
      <ChipScrollRow
        ariaLabel='맛집 분위기'
        edgeColor='#f8f8f9'
        leading={
          <BoardQuickChip
            label='전체'
            active={foodCategory === 'all'}
            onClick={() => setFoodCategory('all')}
          />
        }
      >
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
      </ChipScrollRow>
      <ChipScrollRow
        ariaLabel='음식 종류'
        edgeColor='#f8f8f9'
        leading={
          <BoardQuickChip
            label='음식 전체'
            active={foodCuisine === 'all'}
            onClick={() => setFoodCuisine('all')}
          />
        }
      >
        {FOOD_CUISINES.map((cuisine) => (
          <BoardQuickChip
            key={cuisine.id}
            label={cuisine.label}
            active={foodCuisine === cuisine.id}
            onClick={() => setFoodCuisine(cuisine.id)}
          />
        ))}
      </ChipScrollRow>
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
  const { user, loading: authLoading } = useAuth()
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
  const [foodCuisine, setFoodCuisine] = useState<FoodCuisineId | 'all'>('all')
  const [draftQuery, setDraftQuery] = useState('')
  const [draftSort, setDraftSort] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<FoodViewMode>('list')
  const isFoodBoard = boardId === 'food'
  /** 푸터가 보이면 플로팅 버튼 숨김 (푸터 위로 올리지 않음) */
  const [mapFabHidden, setMapFabHidden] = useState(false)

  useEffect(() => {
    if (!isFoodBoard) {
      setMapFabHidden(false)
      return
    }

    const footer = document.querySelector('footer')
    if (!footer) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMapFabHidden(entry.isIntersecting)
      },
      {
        root: null,
        // 푸터가 살짝만 들어와도 버튼이 겹치기 전에 숨김
        rootMargin: '0px 0px -48px 0px',
        threshold: 0,
      },
    )
    observer.observe(footer)
    return () => observer.disconnect()
  }, [isFoodBoard])


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
    if (isFoodBoard && foodCuisine !== 'all') {
      next = next.filter(
        (post) => normalizeFoodCuisine(post.detail) === foodCuisine,
      )
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
  }, [posts, query, sort, foodCategory, foodCuisine, isFoodBoard])

  /** 지도: 실데이터 + 복수 후기 목데이터(같은 placeId)를 합쳐 핀 데모 */
  const mapPosts = useMemo(() => {
    if (!isFoodBoard) return filteredPosts
    const mocks = listMockCommunityPosts('food')
    const byId = new Map<string, CommunityPost>()
    for (const post of mocks) byId.set(post.id, post)
    for (const post of filteredPosts) byId.set(post.id, post)
    let merged = Array.from(byId.values())
    if (foodCategory !== 'all') {
      merged = merged.filter((post) => post.foodCategory === foodCategory)
    }
    if (foodCuisine !== 'all') {
      merged = merged.filter(
        (post) => normalizeFoodCuisine(post.detail) === foodCuisine,
      )
    }
    return merged.sort((a, b) => b.createdAt - a.createdAt)
  }, [filteredPosts, foodCategory, foodCuisine, isFoodBoard])

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
  const loginNext = `/nyc/login?next=${encodeURIComponent(newPath)}`
  const canWrite = Boolean(user)
  const postHref = canWrite ? newPath : loginNext

  const listSection = (
    <section className={cn('pt-4 sm:pt-5', isFoodBoard ? 'pb-20 sm:pb-24' : 'pb-14 sm:pb-16')}>
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
              ? canWrite
                ? '첫 글을 올려 커뮤니티를 시작해 보세요.'
                : '로그인 후 글을 올릴 수 있어요.'
                : isFoodBoard
                ? '다른 분위기·음식 종류를 선택해 보세요.'
                : '필터를 바꿔 다시 찾아 보세요.'
          }
          actionHref={
            posts.length === 0
              ? canWrite
                ? newPath
                : loginNext
              : undefined
          }
          actionLabel={
            posts.length === 0
              ? canWrite
                ? meta.writeLabel
                : '로그인'
              : undefined
          }
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
        showWrite={!authLoading && canWrite}
        showFilter={!isFoodBoard}
        onFilterClick={isFoodBoard ? undefined : openFilters}
        filterCount={isFoodBoard ? 0 : activeFilterCount}
      />

      {isFoodBoard ? (
        <FoodCategoryStickyBar
          foodCategory={foodCategory}
          setFoodCategory={setFoodCategory}
          foodCuisine={foodCuisine}
          setFoodCuisine={setFoodCuisine}
        />
      ) : null}

      {isFoodBoard && viewMode === 'map' ? (
        <section className='relative mt-3 pb-[5.5rem]'>
          {loading ? (
            <div className='flex h-[min(70vh,calc(100dvh-14rem))] items-center justify-center rounded-2xl bg-[#e8eaee]'>
              <LoadingState label='글을 불러오는 중이에요…' />
            </div>
          ) : error ? (
            <EmptyState
              title='목록을 불러오지 못했어요'
              description={error}
              actionHref={`/nyc/${boardId}`}
              actionLabel='다시 시도'
            />
          ) : (
            <FoodPostsMap
              posts={mapPosts}
              boardId={boardId}
              className='h-[min(72vh,calc(100dvh-13rem))] rounded-2xl ring-1 ring-black/[0.05]'
            />
          )}
        </section>
      ) : (
        <PullToRefresh onRefresh={refreshPosts}>{listSection}</PullToRefresh>
      )}

      {isFoodBoard ? (
        <div
          className={cn(
            'pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))] transition duration-200 ease-out',
            mapFabHidden
              ? 'translate-y-3 opacity-0'
              : 'translate-y-0 opacity-100',
          )}
          aria-hidden={mapFabHidden}
        >
          <button
            type='button'
            tabIndex={mapFabHidden ? -1 : 0}
            disabled={mapFabHidden}
            onClick={() =>
              setViewMode((mode) => (mode === 'list' ? 'map' : 'list'))
            }
            className='pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[var(--foreground)] shadow-[0_4px_6px_rgba(15,23,42,0.06),0_12px_28px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.06] touch-manipulation transition hover:bg-[#fafbfc] active:scale-[0.98] disabled:pointer-events-none'
            aria-label={viewMode === 'list' ? '지도로 보기' : '리스트로 보기'}
          >
            {viewMode === 'list' ? (
              <>
                <MapIcon className='size-4 text-[var(--brand)]' />
                지도
              </>
            ) : (
              <>
                <ListIcon className='size-4 text-[var(--brand)]' />
                리스트
              </>
            )}
          </button>
        </div>
      ) : null}

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

function MapIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.9'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 4.5 3.75 6.75v12.75L9 17.25l6 2.25 5.25-2.25V4.5L15 6.75 9 4.5Z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 4.5v12.75M15 6.75v12.75'
      />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.9'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' d='M8 7h12M8 12h12M8 17h12' />
      <path strokeLinecap='round' d='M4 7h.01M4 12h.01M4 17h.01' />
    </svg>
  )
}
