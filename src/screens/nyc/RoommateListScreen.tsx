'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  BottomSheet,
  PullToRefresh,
  RangeSlider,
  Skeleton,
} from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { fetchCommunityPosts } from '@lib/community/client'
import {
  ROOMMATE_BUDGET_MAX,
  ROOMMATE_LOOKING_FOR_OPTIONS,
  formatRoommateBudget,
  normalizeRoommateLookingFor,
  type RoommateLookingFor,
} from '@lib/community/roommate'
import {
  getSchoolVerifyHref,
  isSchoolVerified,
} from '@lib/community/schoolGate'
import { NYC_COMMUNITY_BOARD_META } from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { HousingPostCardSkeletonGrid } from '@widgets/nyc/HousingPostCardSkeleton'
import { RoommatePostCard } from '@widgets/nyc/RoommatePostCard'

const BOARD_ID = 'roommate' as const
const BUDGET_STEP = 100
const BUDGET_BOUNDS = { min: 0, max: Math.min(5000, ROOMMATE_BUDGET_MAX) }

const BUDGET_PRESETS = [
  { id: 'under-1500', label: '$1,500 이하', min: 0, max: 1500 },
  { id: '1500-2000', label: '$1,500–2,000', min: 1500, max: 2000 },
  { id: '2000-2500', label: '$2,000–2,500', min: 2000, max: 2500 },
  { id: '2500-plus', label: '$2,500+', min: 2500, max: BUDGET_BOUNDS.max },
] as const

const NEIGHBORHOOD_HINTS = [
  '맨해튼',
  '브루클린',
  '퀸즈',
  '플러싱',
  '저지시티',
  'UES',
  'UWS',
  'Williamsburg',
  'Astoria',
] as const

type LookingForFilter = 'all' | RoommateLookingFor
type NeighborhoodFilter = 'all' | string

export function RoommateListScreen() {
  const meta = NYC_COMMUNITY_BOARD_META[BOARD_ID]
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [lookingFor, setLookingFor] = useState<LookingForFilter>('all')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodFilter>('all')
  const [budgetMin, setBudgetMin] = useState(BUDGET_BOUNDS.min)
  const [budgetMax, setBudgetMax] = useState(BUDGET_BOUNDS.max)

  const [draftLookingFor, setDraftLookingFor] =
    useState<LookingForFilter>('all')
  const [draftNeighborhood, setDraftNeighborhood] =
    useState<NeighborhoodFilter>('all')
  const [draftBudgetMin, setDraftBudgetMin] = useState(BUDGET_BOUNDS.min)
  const [draftBudgetMax, setDraftBudgetMax] = useState(BUDGET_BOUNDS.max)

  const chipScrollRef = useRef<HTMLDivElement>(null)
  const [chipEdge, setChipEdge] = useState({ left: false, right: false })

  function updateChipScrollHint() {
    const el = chipScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setChipEdge({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    })
  }

  function scrollChips(direction: 'left' | 'right') {
    const el = chipScrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === 'right' ? 140 : -140,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    updateChipScrollHint()
    const el = chipScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(updateChipScrollHint)
    ro.observe(el)
    window.addEventListener('resize', updateChipScrollHint)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateChipScrollHint)
    }
  }, [])

  const loadPosts = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      try {
        const data = await fetchCommunityPosts(BOARD_ID)
        setPosts(data)
      } catch (err) {
        if (!opts?.silent) {
          toastError(getErrorMessage(err, '목록을 불러오지 못했어요'))
        }
        throw err
      } finally {
        setLoading(false)
      }
    },
    [toastError],
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

  function matchesFilters(
    post: CommunityPost,
    looking: LookingForFilter,
    area: NeighborhoodFilter,
    min: number,
    max: number,
  ) {
    const type = normalizeRoommateLookingFor(
      post.roommateLookingFor,
      post.detail,
    )
    if (looking !== 'all' && type !== looking) return false
    if (
      area !== 'all' &&
      !(post.location || '').toLowerCase().includes(area.toLowerCase())
    ) {
      return false
    }
    const budget = post.roommateBudgetMax
    if (budget != null) {
      if (budget < min || budget > max) return false
    } else if (min > BUDGET_BOUNDS.min || max < BUDGET_BOUNDS.max) {
      return false
    }
    return true
  }

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) =>
        matchesFilters(post, lookingFor, neighborhood, budgetMin, budgetMax),
      ),
    [posts, lookingFor, neighborhood, budgetMin, budgetMax],
  )

  const draftResultCount = useMemo(
    () =>
      posts.filter((post) =>
        matchesFilters(
          post,
          draftLookingFor,
          draftNeighborhood,
          draftBudgetMin,
          draftBudgetMax,
        ),
      ).length,
    [
      posts,
      draftLookingFor,
      draftNeighborhood,
      draftBudgetMin,
      draftBudgetMax,
    ],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (lookingFor !== 'all') count += 1
    if (neighborhood !== 'all') count += 1
    if (budgetMin > BUDGET_BOUNDS.min || budgetMax < BUDGET_BOUNDS.max) {
      count += 1
    }
    return count
  }, [lookingFor, neighborhood, budgetMin, budgetMax])

  const neighborhoodOptions = useMemo(() => {
    const fromPosts = [
      ...new Set(
        posts
          .map((post) => post.location?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ]
    const merged = [
      ...fromPosts,
      ...NEIGHBORHOOD_HINTS.filter(
        (hint) =>
          !fromPosts.some((area) =>
            area.toLowerCase().includes(hint.toLowerCase()),
          ),
      ),
    ]
    return merged
  }, [posts])

  const activeBudgetPreset = BUDGET_PRESETS.find(
    (preset) => preset.min === budgetMin && preset.max === budgetMax,
  )?.id

  const summaryLabel = useMemo(() => {
    const parts: string[] = []
    if (lookingFor !== 'all') {
      parts.push(
        ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === lookingFor)
          ?.label ?? '',
      )
    }
    if (neighborhood !== 'all') parts.push(neighborhood)
    if (budgetMin > BUDGET_BOUNDS.min || budgetMax < BUDGET_BOUNDS.max) {
      parts.push(
        `${formatRoommateBudget(budgetMin) ?? `$${budgetMin}`}–${formatRoommateBudget(budgetMax) ?? `$${budgetMax}`}`,
      )
    }
    if (parts.length === 0) return `등록 글 ${filteredPosts.length}개`
    return `${parts.filter(Boolean).join(' · ')} · ${filteredPosts.length}개`
  }, [lookingFor, neighborhood, budgetMin, budgetMax, filteredPosts.length])

  function openFilters() {
    setDraftLookingFor(lookingFor)
    setDraftNeighborhood(neighborhood)
    setDraftBudgetMin(budgetMin)
    setDraftBudgetMax(budgetMax)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setLookingFor(draftLookingFor)
    setNeighborhood(draftNeighborhood)
    setBudgetMin(draftBudgetMin)
    setBudgetMax(draftBudgetMax)
    setFiltersOpen(false)
  }

  function clearAllFilters() {
    setLookingFor('all')
    setNeighborhood('all')
    setBudgetMin(BUDGET_BOUNDS.min)
    setBudgetMax(BUDGET_BOUNDS.max)
    setDraftLookingFor('all')
    setDraftNeighborhood('all')
    setDraftBudgetMin(BUDGET_BOUNDS.min)
    setDraftBudgetMax(BUDGET_BOUNDS.max)
  }

  function toggleQuickLookingFor(id: RoommateLookingFor) {
    setLookingFor((prev) => (prev === id ? 'all' : id))
  }

  function toggleQuickBudget(min: number, max: number) {
    const active = budgetMin === min && budgetMax === max
    setBudgetMin(active ? BUDGET_BOUNDS.min : min)
    setBudgetMax(active ? BUDGET_BOUNDS.max : max)
  }

  const newPath = `/nyc/${BOARD_ID}/new`
  const loginNext = `/nyc/login?next=${encodeURIComponent(newPath)}`
  const schoolVerified = isSchoolVerified(profile)
  const canWrite = Boolean(user) && schoolVerified
  const postHref = !user
    ? loginNext
    : schoolVerified
      ? newPath
      : getSchoolVerifyHref(newPath)
  const writeCtaLabel = !user
    ? '로그인'
    : schoolVerified
      ? meta.writeLabel
      : '학교 인증하기'

  return (
    <PullToRefresh onRefresh={refreshPosts} className='flex flex-1 flex-col'>
      <BoardPageShell width='wide' className='flex flex-1 flex-col'>
        <header className='pt-5 sm:pt-8 lg:pt-10'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0'>
              <h1 className='text-[1.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.75rem] lg:text-[2rem]'>
                룸메이트 · 서블렛
              </h1>
              <p className='mt-3 max-w-2xl text-[13px] leading-[1.45] text-[var(--muted)] sm:mt-3.5 sm:text-[14px] sm:leading-relaxed lg:text-[15px]'>
                {meta.listIntro}
              </p>
            </div>
            {!authLoading && user ? (
              <Link
                href={postHref}
                className='inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)]'
              >
                <PencilIcon className='size-3.5' />
                {schoolVerified ? meta.writeLabel : '학교 인증하기'}
              </Link>
            ) : !authLoading ? (
              <Link
                href={loginNext}
                className='inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)]'
              >
                <PencilIcon className='size-3.5' />
                로그인
              </Link>
            ) : null}
          </div>

          <div className='mt-4 flex items-center gap-2 sm:mt-5 sm:gap-2.5'>
            <button
              type='button'
              onClick={openFilters}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold touch-manipulation transition sm:h-9 sm:px-3.5 sm:text-[13px]',
                activeFilterCount > 0
                  ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
                  : 'border-[#dddddd] bg-white text-[var(--foreground)] hover:border-[#b0b0b0]',
              )}
            >
              <FiltersIcon className='size-3.5' />
              필터
              {activeFilterCount > 0 ? (
                <span className='inline-flex min-w-4.5 items-center justify-center rounded-full bg-[var(--foreground)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white'>
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            <span
              className='hidden h-6 w-px shrink-0 bg-[#dddddd] sm:block'
              aria-hidden
            />

            <div className='relative min-w-0 flex-1'>
              <div
                ref={chipScrollRef}
                onScroll={updateChipScrollHint}
                className='overflow-x-auto overflow-y-hidden scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              >
                <div
                  className='flex w-max items-center gap-1.5 pr-12'
                  role='listbox'
                  aria-label='빠른 필터'
                >
                  {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => (
                    <QuickChip
                      key={option.id}
                      label={option.label}
                      active={lookingFor === option.id}
                      onClick={() => toggleQuickLookingFor(option.id)}
                    />
                  ))}
                  {BUDGET_PRESETS.map((preset) => (
                    <QuickChip
                      key={preset.id}
                      label={preset.label}
                      active={activeBudgetPreset === preset.id}
                      onClick={() => toggleQuickBudget(preset.min, preset.max)}
                    />
                  ))}
                </div>
              </div>

              {chipEdge.left ? (
                <div className='pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center'>
                  <div
                    aria-hidden
                    className='absolute inset-y-0 left-0 w-8 bg-white'
                  />
                  <div
                    aria-hidden
                    className='absolute inset-y-0 left-7 right-0 bg-gradient-to-r from-white to-transparent'
                  />
                  <button
                    type='button'
                    aria-label='이전 필터 보기'
                    onClick={() => scrollChips('left')}
                    className='pointer-events-auto relative ml-0.5 inline-flex size-6 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[var(--foreground)] shadow-sm'
                  >
                    <ChevronIcon className='size-3.5 rotate-180' />
                  </button>
                </div>
              ) : null}

              {chipEdge.right ? (
                <div className='pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end'>
                  <div
                    aria-hidden
                    className='absolute inset-y-0 right-0 w-8 bg-white'
                  />
                  <div
                    aria-hidden
                    className='absolute inset-y-0 right-7 left-0 bg-gradient-to-l from-white to-transparent'
                  />
                  <button
                    type='button'
                    aria-label='더 많은 필터 보기'
                    onClick={() => scrollChips('right')}
                    className='pointer-events-auto relative mr-0.5 inline-flex size-6 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[var(--foreground)] shadow-sm'
                  >
                    <ChevronIcon className='size-3.5' />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className='flex-1 pb-14 pt-4 sm:pb-16 sm:pt-5'>
          {loading ? (
            <>
              <Skeleton className='mb-3.5 h-3.5 w-36' />
              <HousingPostCardSkeletonGrid />
            </>
          ) : filteredPosts.length === 0 ? (
              <EmptyState
              title={
                posts.length === 0
                  ? '아직 룸메이트·서블렛 글이 없습니다'
                  : '조건에 맞는 글이 없어요'
              }
              description={
                posts.length === 0
                  ? canWrite
                    ? '첫 글을 올려 커뮤니티를 시작해 보세요.'
                    : user
                      ? '학교 이메일 인증 후 글을 올릴 수 있어요.'
                      : '로그인 후 글을 올릴 수 있어요.'
                  : '필터를 바꿔 다시 검색해 보세요.'
              }
              actionHref={posts.length === 0 ? postHref : undefined}
              actionLabel={
                posts.length === 0
                  ? writeCtaLabel
                  : '필터 초기화'
              }
              onAction={posts.length === 0 ? undefined : clearAllFilters}
            />
          ) : (
            <>
              <p className='mb-3.5 text-[12px] font-medium text-[var(--muted)] sm:mb-4 sm:text-[13px]'>
                {summaryLabel}
              </p>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5'>
                {filteredPosts.map((post) => (
                  <RoommatePostCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </section>

        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title='필터'
          maxHeightClassName='max-h-[min(85dvh,720px)]'
          footer={
            <div className='flex items-center justify-between gap-3 px-5 py-4'>
              <button
                type='button'
                onClick={() => {
                  setDraftLookingFor('all')
                  setDraftNeighborhood('all')
                  setDraftBudgetMin(BUDGET_BOUNDS.min)
                  setDraftBudgetMax(BUDGET_BOUNDS.max)
                }}
                className='text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-2 touch-manipulation'
              >
                전체 해제
              </button>
              <button
                type='button'
                onClick={applyFilters}
                className='inline-flex h-11 min-w-[140px] items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--navy-light)]'
              >
                글 {draftResultCount}개 보기
              </button>
            </div>
          }
        >
          <div className='space-y-7 overflow-x-hidden px-3 pb-2'>
            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                유형
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label='전체'
                  active={draftLookingFor === 'all'}
                  onClick={() => setDraftLookingFor('all')}
                />
                {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => (
                  <SheetChip
                    key={option.id}
                    label={option.label}
                    active={draftLookingFor === option.id}
                    onClick={() => setDraftLookingFor(option.id)}
                  />
                ))}
              </div>
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                월 예산
              </h4>
              <p className='mt-1 text-[12px] text-[var(--muted)]'>
                {(formatRoommateBudget(draftBudgetMin) ?? `$${draftBudgetMin}`) +
                  ' – ' +
                  (formatRoommateBudget(draftBudgetMax) ?? `$${draftBudgetMax}`)}
              </p>
              <div className='mt-3'>
                <RangeSlider
                  min={BUDGET_BOUNDS.min}
                  max={BUDGET_BOUNDS.max}
                  step={BUDGET_STEP}
                  valueMin={draftBudgetMin}
                  valueMax={draftBudgetMax}
                  onChange={({ min, max }) => {
                    setDraftBudgetMin(min)
                    setDraftBudgetMax(max)
                  }}
                  formatValue={(value) =>
                    formatRoommateBudget(value) ?? `$${value}`
                  }
                />
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {BUDGET_PRESETS.map((preset) => (
                  <SheetChip
                    key={preset.id}
                    label={preset.label}
                    active={
                      draftBudgetMin === preset.min &&
                      draftBudgetMax === preset.max
                    }
                    onClick={() => {
                      setDraftBudgetMin(preset.min)
                      setDraftBudgetMax(preset.max)
                    }}
                  />
                ))}
              </div>
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                동네
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label='전체'
                  active={draftNeighborhood === 'all'}
                  onClick={() => setDraftNeighborhood('all')}
                />
                {neighborhoodOptions.map((area) => (
                  <SheetChip
                    key={area}
                    label={area}
                    active={draftNeighborhood === area}
                    onClick={() => setDraftNeighborhood(area)}
                  />
                ))}
              </div>
            </section>
          </div>
        </BottomSheet>
      </BoardPageShell>
    </PullToRefresh>
  )
}

function QuickChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      role='option'
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-[12px] font-medium leading-none touch-manipulation transition sm:px-3.5 sm:text-[13px]',
        active
          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
          : 'border-[#dddddd] bg-white text-[var(--foreground)] hover:border-[#b0b0b0]',
      )}
    >
      {label}
    </button>
  )
}

function SheetChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-3 py-2 text-left text-[12px] font-medium leading-snug touch-manipulation transition',
        active
          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
          : 'border-black/[0.08] bg-white text-[var(--foreground)] hover:border-black/15',
      )}
    >
      {label}
    </button>
  )
}

function FiltersIcon({ className }: { className?: string }) {
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
        d='M4 7h10M18 7h2M4 12h2M10 12h10M4 17h8M16 17h4'
      />
      <circle cx='16' cy='7' r='2' />
      <circle cx='8' cy='12' r='2' />
      <circle cx='14' cy='17' r='2' />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'
      />
    </svg>
  )
}
