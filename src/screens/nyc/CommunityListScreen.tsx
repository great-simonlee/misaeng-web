'use client'

import Link from 'next/link'

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

import { BottomSheet, BottomSheetSelect, LoadingState, PullToRefresh } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { useDebounced, usePagedList } from '@hooks/usePagedList'
import {
  fetchCommunityPage,
  fetchCommunityPosts,
  localizeCommunityError,
} from '@lib/community/client'
import {
  CITY_IDS,
  cityLoginPath,
  getCity,
  type CityId,
} from '@lib/constants/cities'
import { useEnabledSchools } from '@hooks/useVerifiedSchools'
import {
  getIdentityVerifyHref,
  isAccountSuspended,
  isIdentityVerified,
  canWritePosts,
  isParentAccount,
  PARENT_WRITE_BOARD,
} from '@lib/community/schoolGate'
import {
  CPT_OPT_TYPES,
  type CptOptTypeId,
} from '@lib/community/cptOpt'
import {
  JOB_REVIEW_TYPES,
  type JobReviewTypeId,
} from '@lib/community/jobReview'
import {
  FOOD_CATEGORIES,
  FOOD_CUISINES,
  getFoodCuisineLabel,
  normalizeFoodCuisine,
  type FoodCuisineId,
  foodCategoriesOf,
} from '@lib/community/food'
import {
  communityBoardKey,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import {
  EMPTY_EMPLOYER_FILTER,
  isEmployerFilterActive,
  STATUS_EMPLOYER_OPTIONS,
  STATUS_EMPLOYER_OTHER_VALUE,
  translateStatusEmployerOption,
  type EmployerFilter,
} from '@lib/constants/statusEmployer'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'
import type { CommunityPost, FoodCategoryId } from '@/types/nyc'
import {
  AnonymousBoardNoticeModal,
  useAnonymousBoardNotice,
} from '@widgets/nyc/AnonymousBoardNoticeModal'
import { BoardListToolbar, BoardQuickChip } from '@widgets/nyc/BoardListToolbar'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CommunityBoardRail, RailChip, RailChipGroup, RailFilterCard, SisterBoardChips } from '@widgets/nyc/CommunityBoardRail'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CommunityPostCard } from '@widgets/nyc/CommunityPostCard'
import { CompanyDirectoryBanner } from '@widgets/nyc/CompanyDirectoryBanner'
import { MarketAppBanner } from '@widgets/nyc/MarketAppBanner'
import { PagedListFooter } from '@widgets/nyc/PagedListFooter'
import {
  EMPTY_MARKET_FILTER,
  MarketPostCard,
  MarketSearchPanel,
  type MarketFilter,
} from '@widgets/nyc/MarketListing'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { FoodCategoryIcon } from '@widgets/nyc/FoodCategoryBadge'
import { RoommateListScreen } from '@screens/nyc/RoommateListScreen'
import { byBrand, MISAENG_DESIGN } from '@lib/brand/design'

const FoodPostsMap = dynamic(
  () => import('@widgets/nyc/FoodPostsMap').then((mod) => mod.FoodPostsMap),
  {
    ssr: false,
    loading: () => <FoodPostsMapLoading />,
  }
)

function FoodPostsMapLoading() {
  const t = useT('community')
  return (
    <div className='flex h-full items-center justify-center bg-[#e8eaee]'>
      <LoadingState label={t('list.mapLoading')} />
    </div>
  )
}

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
  const t = useT('community')
  const tFood = useT('food')
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
        }
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
        ariaLabel={t('list.foodVibeAria')}
        edgeColor='#ffffff'
        leading={
          <BoardQuickChip
            label={t('list.all')}
            active={foodCategory === 'all'}
            onClick={() => setFoodCategory('all')}
          />
        }
      >
        {FOOD_CATEGORIES.map((cat) => (
          <BoardQuickChip
            key={cat.id}
            label={tFood(`categories.${cat.id}`)}
            active={foodCategory === cat.id}
            onClick={() => setFoodCategory(cat.id)}
            icon={<FoodCategoryIcon categoryId={cat.id} className='size-3.5' />}
          />
        ))}
      </ChipScrollRow>
      <ChipScrollRow
        ariaLabel={t('list.cuisineAria')}
        edgeColor='#ffffff'
        leading={
          <BoardQuickChip
            label={t('list.allCuisines')}
            active={foodCuisine === 'all'}
            onClick={() => setFoodCuisine('all')}
          />
        }
      >
        {FOOD_CUISINES.map((cuisine) => (
          <BoardQuickChip
            key={cuisine.id}
            label={getFoodCuisineLabel(cuisine.id, tFood) ?? cuisine.label}
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
          'z-[90]',
          byBrand('', 'border-b border-black/[0.04] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85'),
          // In place it sits on the page canvas; once pinned under the header it turns to frosted canvas
          stuck
            ? byBrand('fixed inset-x-0 top-14 border-b border-black/[0.05] bg-[var(--canvas)]/90 py-2.5 backdrop-blur-md sm:top-16', 'fixed inset-x-0 top-14 py-2.5 sm:top-16')
            : byBrand('relative -mx-4 mt-2 bg-transparent px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8', 'relative -mx-4 mt-2 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8')
        )}
      >
        {stuck ? <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>{chips}</div> : chips}
      </div>
      {stuck ? <div style={{ height: barHeight }} aria-hidden /> : null}
    </>
  )
}

export function CommunityListScreen({ boardId, title }: CommunityListScreenProps) {
  if (boardId === 'roommate') {
    return <RoommateListScreen />
  }

  return <CommunityBoardListScreen boardId={boardId} title={title} />
}

/** Posts per page (owner 11-23 infinite scroll). Local dev only: ?pageSize=2 to try the scrolling with little data */
const PAGE_SIZE = 24
function pageSizeFor() {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return PAGE_SIZE
  const n = Number(new URLSearchParams(window.location.search).get('pageSize'))
  return Number.isInteger(n) && n > 0 ? n : PAGE_SIZE
}

function CommunityBoardListScreen({ boardId, title }: CommunityListScreenProps) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('community')
  const tFood = useT('food')
  const tRoot = useT()
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [foodCategory, setFoodCategory] = useState<FoodCategoryId | 'all'>('all')
  const [foodCuisine, setFoodCuisine] = useState<FoodCuisineId | 'all'>('all')
  const [draftQuery, setDraftQuery] = useState('')
  const [draftSort, setDraftSort] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<FoodViewMode>('list')
  const isFoodBoard = boardId === 'food'
  const isCptOptBoard = boardId === 'status'
  const isJobReviewBoard = boardId === 'job-review'
  const isAnonymous = isAnonymousBoard(boardId)
  const anonymousNotice = useAnonymousBoardNotice(isAnonymous)
  const [cptOptType, setCptOptType] = useState<CptOptTypeId | 'all'>('all')
  const [statusCity, setStatusCity] = useState<CityId | 'all'>('all')
  const [statusSchool, setStatusSchool] = useState<string | 'all'>('all')
  const [draftCptOptType, setDraftCptOptType] = useState<CptOptTypeId | 'all'>('all')
  const [draftStatusCity, setDraftStatusCity] = useState<CityId | 'all'>('all')
  const [draftStatusSchool, setDraftStatusSchool] = useState<string | 'all'>('all')
  const enabledSchools = useEnabledSchools()
  const [jobReviewType, setJobReviewType] = useState<JobReviewTypeId | 'all'>('all')
  const [draftJobReviewType, setDraftJobReviewType] = useState<JobReviewTypeId | 'all'>('all')
  const [jobReviewEmployer, setJobReviewEmployer] = useState<EmployerFilter>(EMPTY_EMPLOYER_FILTER)
  const [draftJobReviewEmployer, setDraftJobReviewEmployer] =
    useState<EmployerFilter>(EMPTY_EMPLOYER_FILTER)
  /** 푸터가 보이면 플로팅 버튼 숨김 (푸터 위로 올리지 않음) */
  const [mapFabHidden, setMapFabHidden] = useState(false)

  useEffect(() => {
    if (!isFoodBoard) return

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
      }
    )
    observer.observe(footer)
    return () => observer.disconnect()
  }, [isFoodBoard])

  // 중고거래 검색 (keyword · category · price) — right rail on desktop, above the list on phones (owner 11-23)
  const [marketFilter, setMarketFilter] = useState<MarketFilter>(EMPTY_MARKET_FILTER)
  const isMarketList = boardId === 'marketplace'
  const keyword = useDebounced(((isMarketList && marketFilter.q) || query).trim(), 300)
  const marketMin = useDebounced(marketFilter.min, 300)
  const marketMax = useDebounced(marketFilter.max, 300)

  /*
   * Pages from the server (owner 11-23): every filter is applied there before paging (src/lib/community/listPage.ts),
   * 24 posts at a time, the next page when the bottom of the list comes near.
   */
  const serverFilters = useMemo(
    () => ({
      q: keyword || undefined,
      sort,
      ...(isFoodBoard
        ? { category: foodCategory !== 'all' ? foodCategory : undefined, cuisine: foodCuisine !== 'all' ? foodCuisine : undefined }
        : {}),
      ...(isCptOptBoard
        ? {
            type: cptOptType !== 'all' ? cptOptType : undefined,
            postCity: statusCity !== 'all' ? statusCity : undefined,
            school: statusSchool !== 'all' ? statusSchool : undefined,
          }
        : {}),
      ...(isJobReviewBoard
        ? {
            type: jobReviewType !== 'all' ? jobReviewType : undefined,
            employer: jobReviewEmployer.mode === 'name' ? jobReviewEmployer.name.trim() || undefined : undefined,
            employerCategory: jobReviewEmployer.mode === 'category' ? jobReviewEmployer.category || undefined : undefined,
          }
        : {}),
      ...(isMarketList
        ? {
            category: marketFilter.category !== 'all' ? marketFilter.category : undefined,
            free: marketFilter.freeOnly,
            min: marketFilter.freeOnly ? undefined : marketMin || undefined,
            max: marketFilter.freeOnly ? undefined : marketMax || undefined,
          }
        : {}),
    }),
    [
      keyword,
      sort,
      isFoodBoard,
      foodCategory,
      foodCuisine,
      isCptOptBoard,
      cptOptType,
      statusCity,
      statusSchool,
      isJobReviewBoard,
      jobReviewType,
      jobReviewEmployer,
      isMarketList,
      marketFilter.category,
      marketFilter.freeOnly,
      marketMin,
      marketMax,
    ],
  )
  const filtersActive = Object.entries(serverFilters).some(([k, v]) => k !== 'sort' && v !== undefined && v !== false && v !== '')
  const paged = usePagedList<CommunityPost>(
    JSON.stringify([boardId, city, serverFilters]),
    (cursor, signal) =>
      fetchCommunityPage({ boardId, city, limit: pageSizeFor(), cursor, filters: serverFilters, signal }).then((page) => ({
        items: page.posts,
        nextCursor: page.nextCursor,
        total: page.total,
      })),
  )
  const filteredPosts = paged.items
  const loading = paged.loading
  const error = paged.error ? getErrorMessage(localizeCommunityError(paged.error, t), t('list.loadFailed')) : null
  // Nothing on the board at all (vs. nothing for these filters)
  const boardEmpty = !loading && paged.total === 0 && !filtersActive
  const refreshPosts = useCallback(async () => {
    await paged.reload()
  }, [paged])
  useEffect(() => {
    if (paged.error && paged.items.length === 0) toastError(t('list.loadFailed'))
  }, [paged.error, paged.items.length, t, toastError])

  /** 지도: the whole board's pins, loaded only when the map is opened (the list pages, the map doesn't) */
  const [mapAll, setMapAll] = useState<CommunityPost[] | null>(null)
  useEffect(() => {
    if (!isFoodBoard || viewMode !== 'map' || mapAll) return
    let alive = true
    void fetchCommunityPosts(boardId, city)
      .then((all) => alive && setMapAll(all))
      .catch(() => alive && setMapAll([]))
    return () => {
      alive = false
    }
  }, [isFoodBoard, viewMode, mapAll, boardId, city])
  const mapPosts = useMemo(() => {
    if (!isFoodBoard) return filteredPosts
    let merged = mapAll ?? filteredPosts
    if (foodCategory !== 'all') {
      merged = merged.filter((post) => foodCategoriesOf(post).includes(foodCategory))
    }
    if (foodCuisine !== 'all') {
      merged = merged.filter((post) => normalizeFoodCuisine(post.detail) === foodCuisine)
    }
    return [...merged].sort((a, b) => b.createdAt - a.createdAt)
  }, [filteredPosts, mapAll, foodCategory, foodCuisine, isFoodBoard])

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (sort !== 'newest' ? 1 : 0) +
    (isCptOptBoard && cptOptType !== 'all' ? 1 : 0) +
    (isCptOptBoard && statusCity !== 'all' ? 1 : 0) +
    (isCptOptBoard && statusSchool !== 'all' ? 1 : 0) +
    (isJobReviewBoard && jobReviewType !== 'all' ? 1 : 0) +
    (isJobReviewBoard && isEmployerFilterActive(jobReviewEmployer) ? 1 : 0)

  function openFilters() {
    setDraftQuery(query)
    setDraftSort(sort)
    setDraftCptOptType(cptOptType)
    setDraftStatusCity(statusCity)
    setDraftStatusSchool(statusSchool)
    setDraftJobReviewType(jobReviewType)
    setDraftJobReviewEmployer(jobReviewEmployer)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setQuery(draftQuery)
    setSort(draftSort)
    if (isCptOptBoard) {
      setCptOptType(draftCptOptType)
      setStatusCity(draftStatusCity)
      setStatusSchool(draftStatusSchool)
    }
    if (isJobReviewBoard) {
      setJobReviewType(draftJobReviewType)
      setJobReviewEmployer(draftJobReviewEmployer)
    }
    setFiltersOpen(false)
  }

  /** Right-rail filters change the list right away (no draft/apply step) */
  function resetLiveFilters() {
    setQuery('')
    setSort('newest')
    setCptOptType('all')
    setStatusCity('all')
    setStatusSchool('all')
    setJobReviewType('all')
    setJobReviewEmployer(EMPTY_EMPLOYER_FILTER)
  }

  function clearFilters() {
    setDraftQuery('')
    setDraftSort('newest')
    setDraftCptOptType('all')
    setDraftStatusCity('all')
    setDraftStatusSchool('all')
    setDraftJobReviewType('all')
    setDraftJobReviewEmployer(EMPTY_EMPLOYER_FILTER)
  }

  const newPath = href(`/${boardId}/new`)
  const loginNext = cityLoginPath(city, newPath)
  // 1.0.7: 직장 인증 대기(보류 글)·학부모도 쓸 수 있다. 학부모는 질문·자유에만 (다른 게시판 버튼은 질문·자유 글쓰기로)
  const identityVerified = canWritePosts(profile)
  const parentOtherBoard = isParentAccount(profile) && boardId !== PARENT_WRITE_BOARD
  const suspended = isAccountSuspended(profile)
  const canWrite = Boolean(user) && identityVerified && !suspended
  const verifyCta = t('verify.cta')
  const writeLabel = parentOtherBoard ? t('parent.writeOnlyAnonymous') : t(communityBoardKey(boardId, 'writeLabel'))
  const postHref = !user
    ? loginNext
    : suspended
      ? href('/me')
      : parentOtherBoard
        ? href(`/${PARENT_WRITE_BOARD}/new`)
        : identityVerified
          ? newPath
          : getIdentityVerifyHref(newPath)
  const writeCtaLabel = !user
    ? t('list.login')
    : suspended
      ? t('list.suspended')
      : identityVerified
        ? writeLabel
        : verifyCta
  // 질문·자유: 인증한 학생에게 "부모님도 여기서 질문할 수 있어요" (미생만, 학부모 본인에게는 안 보인다)
  const showParentBanner =
    MISAENG_DESIGN && boardId === 'anonymous' && isIdentityVerified(profile) && !isParentAccount(profile)
  const showWriteCta = !authLoading && Boolean(user) && !suspended
  // 중고거래: 휴대폰에서는 앱 다운로드 안내 카드도 (MarketAppBanner, owner 11-23)
  const isMarketBoard = boardId === 'marketplace'
  const gridBoard = isFoodBoard || isMarketBoard

  const listSection = (
    <section className={cn('pt-4 sm:pt-5', isFoodBoard ? 'pb-20 sm:pb-24' : 'pb-14 sm:pb-16')}>
      {loading && <LoadingState className='py-20' label={t('detail.loading')} />}

      {!loading && error && filteredPosts.length === 0 && (
        <EmptyState
          title={t('list.loadFailed')}
          description={error}
          actionHref={href(`/${boardId}`)}
          actionLabel={t('list.retry')}
        />
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <EmptyState
          title={
            boardEmpty
              ? t('list.emptyTitle', { board: title })
              : t('list.noMatchTitle')
          }
          description={
            boardEmpty
              ? canWrite
                ? t('list.emptyCanWrite')
                : user
                  ? t('list.emptyNeedsVerify')
                  : t('list.emptyNeedsLogin')
              : isFoodBoard
                ? t('list.noMatchFood')
                : isCptOptBoard
                  ? t('list.noMatchCptOpt')
                  : isJobReviewBoard
                    ? t('list.noMatchJobReview')
                    : t('list.noMatchDefault')
          }
          actionHref={boardEmpty ? postHref : undefined}
          actionLabel={boardEmpty ? writeCtaLabel : undefined}
        />
      )}
      {/* Empty board on a phone (no rail): point to the boards that have posts */}
      {MISAENG_DESIGN && !isFoodBoard && !loading && !error && boardEmpty ? (
        <SisterBoardChips boardId={boardId} className='lg:hidden' />
      ) : null}

      {!loading && filteredPosts.length > 0 && (
        <div
          className={
            isFoodBoard
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:gap-5'
              : isMarketBoard && MISAENG_DESIGN
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4'
                : 'flex flex-col gap-4 sm:gap-5'
          }
        >
          {filteredPosts.map((post) =>
            isMarketBoard && MISAENG_DESIGN ? (
              <MarketPostCard key={post.id} post={post} />
            ) : (
              <CommunityPostCard key={post.id} post={post} boardId={boardId} />
            ),
          )}
        </div>
      )}
      {!loading && filteredPosts.length > 0 ? (
        <PagedListFooter
          sentinelRef={paged.sentinelRef}
          hasMore={paged.hasMore}
          loadingMore={paged.loadingMore}
          failed={Boolean(paged.error)}
          onRetry={paged.retry}
          retryLabel={t('list.retry')}
          failedLabel={t('list.loadFailed')}
        />
      ) : null}
    </section>
  )

  return (
    <BoardPageShell
      width={gridBoard ? 'wide' : 'narrow'}
      rail={
        <CommunityBoardRail
          boardId={boardId}
          boardTitle={title}
          writeHref={postHref}
          writeLabel={writeCtaLabel}
          showWrite={!authLoading && !suspended}
          beforeBoards={
            isMarketBoard ? (
              <MarketSearchPanel filter={marketFilter} onChange={setMarketFilter} resultCount={paged.total} />
            ) : isCptOptBoard || isJobReviewBoard || isAnonymous ? (
              <RailFilterCard
                title={t('rail.boardFilterTitle')}
                count={paged.total}
                action={
                  isJobReviewBoard ? (
                    <button
                      type='button'
                      onClick={openFilters}
                      className='flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--foreground)] text-[13.5px] font-semibold text-white transition hover:bg-black'
                    >
                      {t('rail.moreFilters')}
                      {isEmployerFilterActive(jobReviewEmployer) ? ' · 1' : ''}
                    </button>
                  ) : activeFilterCount > 0 ? (
                    <button type='button' onClick={resetLiveFilters} className='text-[13px] font-semibold text-[var(--brand)]'>
                      {t('market.reset')}
                    </button>
                  ) : null
                }
              >
                <label className='relative mt-3 block'>
                  <span className='sr-only'>{t('rail.search')}</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value.slice(0, 60))}
                    placeholder={t('list.searchPlaceholder')}
                    className='h-10 w-full rounded-xl bg-[#f4f5f7] px-3 text-[13.5px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]'
                  />
                </label>
                {isCptOptBoard ? (
                  <>
                    <RailChipGroup label={t('list.filterType')}>
                      <RailChip active={cptOptType === 'all'} onClick={() => setCptOptType('all')}>{t('list.all')}</RailChip>
                      {CPT_OPT_TYPES.map((item) => (
                        <RailChip key={item.id} active={cptOptType === item.id} onClick={() => setCptOptType(item.id)}>
                          {tRoot(`reviews.cptOpt.types.${item.id}.label`)}
                        </RailChip>
                      ))}
                    </RailChipGroup>
                    <RailChipGroup label={t('list.filterCity')}>
                      <RailChip active={statusCity === 'all'} onClick={() => setStatusCity('all')}>{t('list.all')}</RailChip>
                      {CITY_IDS.map((id) => (
                        <RailChip key={id} active={statusCity === id} onClick={() => setStatusCity(id)}>
                          {getCity(id).shortLabel}
                        </RailChip>
                      ))}
                    </RailChipGroup>
                    {enabledSchools.length ? (
                      <RailChipGroup label={t('list.filterSchool')}>
                        <RailChip active={statusSchool === 'all'} onClick={() => setStatusSchool('all')}>{t('list.all')}</RailChip>
                        {enabledSchools.map((school) => (
                          <RailChip key={school.id} active={statusSchool === school.id} onClick={() => setStatusSchool(school.id)}>
                            {school.shortName}
                          </RailChip>
                        ))}
                      </RailChipGroup>
                    ) : null}
                  </>
                ) : null}
                {isJobReviewBoard ? (
                  <RailChipGroup label={t('list.filterType')}>
                    <RailChip active={jobReviewType === 'all'} onClick={() => setJobReviewType('all')}>{t('list.all')}</RailChip>
                    {JOB_REVIEW_TYPES.map((item) => (
                      <RailChip key={item.id} active={jobReviewType === item.id} onClick={() => setJobReviewType(item.id)}>
                        {tRoot(`reviews.jobReview.types.${item.id}.label`)}
                      </RailChip>
                    ))}
                  </RailChipGroup>
                ) : null}
                <RailChipGroup label={t('rail.sort')}>
                  {(isCptOptBoard || isJobReviewBoard
                    ? [
                        { id: 'newest' as const, label: t('list.sortRecentlyUpdated') },
                        { id: 'oldest' as const, label: t('list.sortLeastRecentlyUpdated') },
                      ]
                    : [
                        { id: 'newest' as const, label: t('list.sortNewest') },
                        { id: 'oldest' as const, label: t('list.sortOldest') },
                      ]
                  ).map((option) => (
                    <RailChip key={option.id} active={sort === option.id} onClick={() => setSort(option.id)}>
                      {option.label}
                    </RailChip>
                  ))}
                </RailChipGroup>
              </RailFilterCard>
            ) : isFoodBoard ? (
              <RailFilterCard title={t('rail.foodFilterTitle')} count={paged.total}>
                <RailChipGroup label={t('rail.vibe')}>
                  <RailChip active={foodCategory === 'all'} onClick={() => setFoodCategory('all')}>{t('list.all')}</RailChip>
                  {FOOD_CATEGORIES.map((cat) => (
                    <RailChip key={cat.id} active={foodCategory === cat.id} onClick={() => setFoodCategory(cat.id)}>
                      {tFood(`categories.${cat.id}`)}
                    </RailChip>
                  ))}
                </RailChipGroup>
                <RailChipGroup label={t('rail.cuisine')}>
                  <RailChip active={foodCuisine === 'all'} onClick={() => setFoodCuisine('all')}>{t('list.allCuisines')}</RailChip>
                  {FOOD_CUISINES.map((cuisine) => (
                    <RailChip key={cuisine.id} active={foodCuisine === cuisine.id} onClick={() => setFoodCuisine(cuisine.id)}>
                      {getFoodCuisineLabel(cuisine.id, tFood) ?? cuisine.label}
                    </RailChip>
                  ))}
                </RailChipGroup>
              </RailFilterCard>
            ) : null
          }
        />
      }
    >
      <BoardListToolbar
        breadcrumbLabel={title}
        intro={t(communityBoardKey(boardId, 'listIntro'), {
          city: getCity(city).name,
        })}
        writeHref={postHref}
        writeLabel={identityVerified ? writeLabel : verifyCta}
        showWrite={showWriteCta}
        showFilter={!isFoodBoard && !isMarketBoard}
        filterInRail={isCptOptBoard || isJobReviewBoard || isAnonymous}
        onFilterClick={isFoodBoard ? undefined : openFilters}
        filterCount={isFoodBoard ? 0 : activeFilterCount}
      >
        {boardId === 'job-review' ? <CompanyDirectoryBanner /> : null}
        {isMarketBoard ? <MarketAppBanner /> : null}
        {isMarketBoard ? (
          <MarketSearchPanel filter={marketFilter} onChange={setMarketFilter} resultCount={paged.total} className='mt-4 lg:hidden' />
        ) : null}
        {showParentBanner ? (
          <Link
            href={`${href('/me')}#parent-invite`}
            className='mt-3 flex items-center gap-2.5 rounded-2xl bg-[var(--brand)]/[0.07] px-4 py-3 text-[13px] font-medium text-[var(--foreground)] ring-1 ring-[var(--brand)]/15 touch-manipulation transition hover:bg-[var(--brand)]/[0.1]'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-4 shrink-0 text-[var(--brand)]' aria-hidden>
              <path strokeLinecap='round' strokeLinejoin='round' d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
            </svg>
            <span className='min-w-0 flex-1'>{t('parent.anonymousBanner')}</span>
            <span className='shrink-0 text-[12px] font-semibold text-[var(--brand)]'>{t('parent.anonymousBannerCta')}</span>
          </Link>
        ) : null}
      </BoardListToolbar>

      {isFoodBoard ? (
        // Misaeng desktop: the same chips live in the right rail (맛집 찾기)
        <div className={MISAENG_DESIGN ? 'lg:hidden' : undefined}>
        <FoodCategoryStickyBar
          foodCategory={foodCategory}
          setFoodCategory={setFoodCategory}
          foodCuisine={foodCuisine}
          setFoodCuisine={setFoodCuisine}
        />
        </div>
      ) : null}

      {isFoodBoard && viewMode === 'map' ? (
        <section className='relative mt-3 pb-[5.5rem]'>
          {loading ? (
            <div className='flex h-[min(70vh,calc(100dvh-14rem))] items-center justify-center rounded-2xl bg-[#e8eaee]'>
              <LoadingState label={t('detail.loading')} />
            </div>
          ) : error ? (
            <EmptyState
              title={t('list.loadFailed')}
              description={error}
              actionHref={href(`/${boardId}`)}
              actionLabel={t('list.retry')}
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
            mapFabHidden ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
          )}
          aria-hidden={mapFabHidden}
        >
          <button
            type='button'
            tabIndex={mapFabHidden ? -1 : 0}
            disabled={mapFabHidden}
            onClick={() => setViewMode((mode) => (mode === 'list' ? 'map' : 'list'))}
            className='pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[var(--foreground)] shadow-[0_4px_6px_rgba(15,23,42,0.06),0_12px_28px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.06] touch-manipulation transition hover:bg-[#fafbfc] active:scale-[0.98] disabled:pointer-events-none'
            aria-label={viewMode === 'list' ? t('list.showMap') : t('list.showList')}
          >
            {viewMode === 'list' ? (
              <>
                <MapIcon className='size-4 text-[var(--brand)]' />
                {t('list.map')}
              </>
            ) : (
              <>
                <ListIcon className='size-4 text-[var(--brand)]' />
                {t('list.list')}
              </>
            )}
          </button>
        </div>
      ) : null}

      {!isFoodBoard ? (
        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('toolbar.filter')}
          footer={
            <div className='flex items-center justify-between gap-3 px-5 py-4'>
              <button
                type='button'
                onClick={clearFilters}
                className='text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-2 touch-manipulation'
              >
                {t('list.clearAll')}
              </button>
              <button
                type='button'
                onClick={applyFilters}
                className='inline-flex h-11 min-w-[140px] items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--navy-light)]'
              >
                {t('list.apply')}
              </button>
            </div>
          }
        >
          <div className='space-y-6 px-4 pb-2'>
            {isCptOptBoard ? (
              <>
                <FilterChipSection
                  title={t('list.filterType')}
                  ariaLabel={t('list.cptOptTypeAria')}
                  options={[
                    { id: 'all', label: t('list.all') },
                    ...CPT_OPT_TYPES.map((item) => ({
                      id: item.id,
                      label: tRoot(`reviews.cptOpt.types.${item.id}.label`),
                    })),
                  ]}
                  value={draftCptOptType}
                  onChange={setDraftCptOptType}
                />
                <FilterChipSection
                  title={t('list.filterCity')}
                  ariaLabel={t('list.filterCity')}
                  options={[
                    { id: 'all', label: t('list.all') },
                    ...CITY_IDS.map((id) => ({
                      id,
                      label: getCity(id).shortLabel,
                    })),
                  ]}
                  value={draftStatusCity}
                  onChange={setDraftStatusCity}
                />
                <FilterChipSection
                  title={t('list.filterSchool')}
                  ariaLabel={t('list.filterSchool')}
                  options={[
                    { id: 'all', label: t('list.all') },
                    ...enabledSchools.map((school) => ({
                      id: school.id,
                      label: school.shortName,
                    })),
                  ]}
                  value={draftStatusSchool}
                  onChange={setDraftStatusSchool}
                />
              </>
            ) : null}

            {isJobReviewBoard ? (
              <>
                <FilterChipSection
                  title={t('list.filterType')}
                  ariaLabel={t('list.jobReviewTypeAria')}
                  options={[
                    { id: 'all', label: t('list.all') },
                    ...JOB_REVIEW_TYPES.map((item) => ({
                      id: item.id,
                      label: tRoot(`reviews.jobReview.types.${item.id}.label`),
                    })),
                  ]}
                  value={draftJobReviewType}
                  onChange={setDraftJobReviewType}
                />
                <EmployerFilterSection
                  value={draftJobReviewEmployer}
                  onChange={setDraftJobReviewEmployer}
                />
              </>
            ) : null}

            <section>
              <h4 className='text-[14px] font-semibold text-[var(--foreground)]'>
                {t('list.search')}
              </h4>
              <input
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder={t('list.searchPlaceholder')}
                className='mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafbfc] px-3.5 text-[15px] outline-none transition placeholder:text-[var(--muted)] focus:border-black/20 focus:bg-white'
              />
            </section>

            <section>
              <h4 className='text-[14px] font-semibold text-[var(--foreground)]'>
                {t('list.sort')}
              </h4>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                {(isCptOptBoard || isJobReviewBoard
                  ? ([
                      { id: 'newest', label: t('list.sortRecentlyUpdated') },
                      { id: 'oldest', label: t('list.sortLeastRecentlyUpdated') },
                    ] as const)
                  : ([
                      { id: 'newest', label: t('list.sortNewest') },
                      { id: 'oldest', label: t('list.sortOldest') },
                    ] as const)
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
                          : 'border-black/[0.08] bg-white text-[var(--muted-foreground)] hover:border-black/15'
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

      {isAnonymous ? (
        <AnonymousBoardNoticeModal
          open={anonymousNotice.open}
          onClose={anonymousNotice.close}
          onSnooze24h={anonymousNotice.snooze24h}
        />
      ) : null}
    </BoardPageShell>
  )
}

function EmployerFilterSection({
  value,
  onChange,
}: {
  value: EmployerFilter
  onChange: (next: EmployerFilter) => void
}) {
  const t = useT('community')
  const tRoot = useT()
  const categoryOptions = STATUS_EMPLOYER_OPTIONS.filter(
    (option) => option.value !== STATUS_EMPLOYER_OTHER_VALUE
  ).map((option) => ({
    ...option,
    label: translateStatusEmployerOption(tRoot, option.value),
  }))

  return (
    <section>
      <h4 className='text-[14px] font-semibold text-[var(--foreground)]'>
        {t('list.company')}
      </h4>
      <div className='mt-2 flex flex-wrap gap-1.5' aria-label={t('list.companyFilterAria')}>
        <BoardQuickChip
          label={t('list.all')}
          active={value.mode === 'all'}
          onClick={() => onChange(EMPTY_EMPLOYER_FILTER)}
        />
        <BoardQuickChip
          label={t('list.companyName')}
          active={value.mode === 'name'}
          onClick={() => onChange({ mode: 'name', name: value.name, category: '' })}
        />
        <BoardQuickChip
          label={t('list.companyCategory')}
          active={value.mode === 'category'}
          onClick={() => onChange({ mode: 'category', name: '', category: value.category })}
        />
      </div>
      {value.mode === 'name' ? (
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, mode: 'name', name: e.target.value })}
          placeholder={t('list.companyNamePlaceholder')}
          className='mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafbfc] px-3.5 text-[15px] outline-none transition placeholder:text-[var(--muted)] focus:border-black/20 focus:bg-white'
        />
      ) : null}
      {value.mode === 'category' ? (
        <div className='mt-2'>
          <BottomSheetSelect
            title={t('list.companyCategory')}
            value={value.category}
            options={categoryOptions}
            onChange={(category) => onChange({ mode: 'category', name: '', category })}
            placeholder={t('list.companyCategoryPlaceholder')}
            emptyOption={{ value: '', label: t('list.none') }}
            overlayClassName='z-[10060]'
          />
        </div>
      ) : null}
    </section>
  )
}

function FilterChipSection<T extends string>({
  title,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  title: string
  ariaLabel: string
  options: ReadonlyArray<{ id: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <section>
      <h4 className='text-[14px] font-semibold text-[var(--foreground)]'>{title}</h4>
      <div className='mt-2 flex flex-wrap gap-1.5' aria-label={ariaLabel}>
        {options.map((option) => (
          <BoardQuickChip
            key={option.id}
            label={option.label}
            active={value === option.id}
            onClick={() => onChange(option.id)}
          />
        ))}
      </div>
    </section>
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
      <path strokeLinecap='round' strokeLinejoin='round' d='M9 4.5v12.75M15 6.75v12.75' />
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
