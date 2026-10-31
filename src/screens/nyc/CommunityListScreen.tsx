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

import { BottomSheet, BottomSheetSelect, LoadingState, PullToRefresh } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  fetchCommunityPosts,
  localizeCommunityError,
} from '@lib/community/client'
import {
  CITY_IDS,
  cityLoginPath,
  getCity,
  resolvePostCity,
  type CityId,
} from '@lib/constants/cities'
import { useEnabledSchools } from '@hooks/useVerifiedSchools'
import {
  getIdentityVerifyHref,
  isAccountSuspended,
  isIdentityVerified,
} from '@lib/community/schoolGate'
import {
  CPT_OPT_TYPES,
  getCptOptListTimestamp,
  normalizeCptOptType,
  type CptOptTypeId,
} from '@lib/community/cptOpt'
import {
  JOB_REVIEW_TYPES,
  getJobReviewListTimestamp,
  normalizeJobReviewType,
  type JobReviewTypeId,
} from '@lib/community/jobReview'
import {
  FOOD_CATEGORIES,
  FOOD_CUISINES,
  getFoodCuisineLabel,
  normalizeFoodCuisine,
  type FoodCuisineId,
} from '@lib/community/food'
import {
  communityBoardKey,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { listMockCommunityPosts } from '@lib/constants/communityMock'
import {
  EMPTY_EMPLOYER_FILTER,
  isEmployerFilterActive,
  matchesEmployerFilter,
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
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CommunityPostCard } from '@widgets/nyc/CommunityPostCard'
import { CompanyDirectoryBanner } from '@widgets/nyc/CompanyDirectoryBanner'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { FoodCategoryIcon } from '@widgets/nyc/FoodCategoryBadge'
import { RoommateListScreen } from '@screens/nyc/RoommateListScreen'

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
        data-ui='chip-bar'
        data-stuck={stuck || undefined}
        className={cn(
          'z-[90] border-b border-black/[0.04] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85',
          stuck
            ? 'fixed inset-x-0 top-14 py-2.5 sm:top-16'
            : 'relative -mx-4 mt-2 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'
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

function CommunityBoardListScreen({ boardId, title }: CommunityListScreenProps) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('community')
  const tRoot = useT()
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      }
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
        const data = await fetchCommunityPosts(boardId, city)
        setPosts(data)
        setError(null)
      } catch (err) {
        const msg = getErrorMessage(
          localizeCommunityError(err, t),
          t('list.loadFailed'),
        )
        setError(msg)
        if (!opts?.silent) toastError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [boardId, city, t, toastError]
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
      next = next.filter((post) => normalizeFoodCuisine(post.detail) === foodCuisine)
    }
    if (isCptOptBoard && cptOptType !== 'all') {
      next = next.filter((post) => normalizeCptOptType(post.cptOptType, post.detail) === cptOptType)
    }
    if (isCptOptBoard && statusCity !== 'all') {
      next = next.filter((post) => resolvePostCity(post.city) === statusCity)
    }
    if (isCptOptBoard && statusSchool !== 'all') {
      next = next.filter((post) => post.authorSchoolId === statusSchool)
    }
    if (isJobReviewBoard && jobReviewType !== 'all') {
      next = next.filter(
        (post) => normalizeJobReviewType(post.jobReviewType, post.detail) === jobReviewType
      )
    }
    if (isJobReviewBoard && isEmployerFilterActive(jobReviewEmployer)) {
      next = next.filter((post) => matchesEmployerFilter(post.location, jobReviewEmployer))
    }
    if (!isFoodBoard && q) {
      next = next.filter((post) => {
        const haystack = [
          post.title,
          post.description,
          post.location,
          post.detail,
          ...(isCptOptBoard
            ? [
                post.authorSchoolName,
                post.cptOptTips,
                ...(post.cptOptTimeline ?? []).flatMap((entry) => [
                  entry.prepared,
                  entry.submitted,
                  entry.resultReceived,
                  entry.nextStep,
                ]),
              ]
            : []),
          ...(isJobReviewBoard
            ? [
                post.jobReviewTips,
                post.jobReviewIndustry,
                ...(post.jobReviewTimeline ?? []).flatMap((entry) => [
                  entry.stageLabel,
                  entry.platform,
                  entry.documentsSubmitted,
                  entry.interviewRound,
                  entry.stageReviewHtml,
                  entry.outcome,
                ]),
              ]
            : []),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    const getSortTime = (post: CommunityPost) =>
      isCptOptBoard
        ? getCptOptListTimestamp(post)
        : isJobReviewBoard
          ? getJobReviewListTimestamp(post)
          : post.createdAt
    return [...next].sort((a, b) =>
      sort === 'newest' ? getSortTime(b) - getSortTime(a) : getSortTime(a) - getSortTime(b)
    )
  }, [
    posts,
    query,
    sort,
    foodCategory,
    foodCuisine,
    cptOptType,
    statusCity,
    statusSchool,
    jobReviewType,
    jobReviewEmployer,
    isFoodBoard,
    isCptOptBoard,
    isJobReviewBoard,
  ])

  /** 지도: 실데이터 + 복수 후기 목데이터(같은 placeId)를 합쳐 핀 데모 */
  const mapPosts = useMemo(() => {
    if (!isFoodBoard) return filteredPosts
    const mocks = listMockCommunityPosts('food', city)
    const byId = new Map<string, CommunityPost>()
    for (const post of mocks) byId.set(post.id, post)
    for (const post of filteredPosts) byId.set(post.id, post)
    let merged = Array.from(byId.values())
    if (foodCategory !== 'all') {
      merged = merged.filter((post) => post.foodCategory === foodCategory)
    }
    if (foodCuisine !== 'all') {
      merged = merged.filter((post) => normalizeFoodCuisine(post.detail) === foodCuisine)
    }
    return merged.sort((a, b) => b.createdAt - a.createdAt)
  }, [city, filteredPosts, foodCategory, foodCuisine, isFoodBoard])

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
  const identityVerified = isIdentityVerified(profile)
  const suspended = isAccountSuspended(profile)
  const canWrite = Boolean(user) && identityVerified && !suspended
  const verifyCta = t('verify.cta')
  const writeLabel = t(communityBoardKey(boardId, 'writeLabel'))
  const postHref = !user
    ? loginNext
    : suspended
      ? href('/me')
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
  const showWriteCta = !authLoading && Boolean(user) && !suspended

  const listSection = (
    <section className={cn('pt-4 sm:pt-5', isFoodBoard ? 'pb-20 sm:pb-24' : 'pb-14 sm:pb-16')}>
      {loading && <LoadingState className='py-20' label={t('detail.loading')} />}

      {!loading && error && (
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
            posts.length === 0
              ? t('list.emptyTitle', { board: title })
              : t('list.noMatchTitle')
          }
          description={
            posts.length === 0
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
          actionHref={posts.length === 0 ? postHref : undefined}
          actionLabel={posts.length === 0 ? writeCtaLabel : undefined}
        />
      )}

      {!loading && filteredPosts.length > 0 && (
        <div
          className={
            isFoodBoard
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-5'
              : 'flex flex-col gap-4 sm:gap-5'
          }
        >
          {filteredPosts.map((post) => (
            <CommunityPostCard key={post.id} post={post} boardId={boardId} />
          ))}
        </div>
      )}
    </section>
  )

  return (
    <BoardPageShell width={isFoodBoard ? 'wide' : 'narrow'}>
      <BoardListToolbar
        breadcrumbLabel={title}
        intro={t(communityBoardKey(boardId, 'listIntro'), {
          city: getCity(city).name,
        })}
        writeHref={postHref}
        writeLabel={identityVerified ? writeLabel : verifyCta}
        showWrite={showWriteCta}
        showFilter={!isFoodBoard}
        onFilterClick={isFoodBoard ? undefined : openFilters}
        filterCount={isFoodBoard ? 0 : activeFilterCount}
      >
        {boardId === 'job-review' ? <CompanyDirectoryBanner /> : null}
      </BoardListToolbar>

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
          data-ui='floating-bottom'
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
