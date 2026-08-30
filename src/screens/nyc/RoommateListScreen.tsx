'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
  ROOMMATE_INTENT_OPTIONS,
  ROOMMATE_LOOKING_FOR_OPTIONS,
  formatRoommateBudget,
  normalizeRoommateLookingFor,
  roommateMatchesIntent,
  type RoommateIntent,
  type RoommateLookingFor,
} from '@lib/community/roommate'
import {
  getSchoolVerifyHref,
  isAccountSuspended,
  isSchoolVerified,
} from '@lib/community/schoolGate'
import { NYC_COMMUNITY_BOARD_META } from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { BoardListToolbar, BoardQuickChip } from '@widgets/nyc/BoardListToolbar'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { EmptyState } from '@widgets/nyc/EmptyState'
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

type IntentFilter = 'all' | RoommateIntent
type LookingForFilter = 'all' | RoommateLookingFor
type NeighborhoodFilter = 'all' | string

export function RoommateListScreen() {
  const meta = NYC_COMMUNITY_BOARD_META[BOARD_ID]
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [intent, setIntent] = useState<IntentFilter>('all')
  const [lookingFor, setLookingFor] = useState<LookingForFilter>('all')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodFilter>('all')
  const [budgetMin, setBudgetMin] = useState(BUDGET_BOUNDS.min)
  const [budgetMax, setBudgetMax] = useState(BUDGET_BOUNDS.max)

  const [draftIntent, setDraftIntent] = useState<IntentFilter>('all')
  const [draftLookingFor, setDraftLookingFor] =
    useState<LookingForFilter>('all')
  const [draftNeighborhood, setDraftNeighborhood] =
    useState<NeighborhoodFilter>('all')
  const [draftBudgetMin, setDraftBudgetMin] = useState(BUDGET_BOUNDS.min)
  const [draftBudgetMax, setDraftBudgetMax] = useState(BUDGET_BOUNDS.max)

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
    intentFilter: IntentFilter,
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
      looking === 'all' &&
      intentFilter !== 'all' &&
      !roommateMatchesIntent(type, intentFilter)
    ) {
      return false
    }
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
        matchesFilters(
          post,
          intent,
          lookingFor,
          neighborhood,
          budgetMin,
          budgetMax,
        ),
      ),
    [posts, intent, lookingFor, neighborhood, budgetMin, budgetMax],
  )

  const draftResultCount = useMemo(
    () =>
      posts.filter((post) =>
        matchesFilters(
          post,
          draftIntent,
          draftLookingFor,
          draftNeighborhood,
          draftBudgetMin,
          draftBudgetMax,
        ),
      ).length,
    [
      posts,
      draftIntent,
      draftLookingFor,
      draftNeighborhood,
      draftBudgetMin,
      draftBudgetMax,
    ],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (intent !== 'all' || lookingFor !== 'all') count += 1
    if (neighborhood !== 'all') count += 1
    if (budgetMin > BUDGET_BOUNDS.min || budgetMax < BUDGET_BOUNDS.max) {
      count += 1
    }
    return count
  }, [intent, lookingFor, neighborhood, budgetMin, budgetMax])

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
    } else if (intent !== 'all') {
      parts.push(
        ROOMMATE_INTENT_OPTIONS.find((item) => item.id === intent)?.label ?? '',
      )
    }
    if (neighborhood !== 'all') parts.push(neighborhood)
    if (budgetMin > BUDGET_BOUNDS.min || budgetMax < BUDGET_BOUNDS.max) {
      parts.push(
        `${formatRoommateBudget(budgetMin) ?? `$${budgetMin}`}–${formatRoommateBudget(budgetMax) ?? `$${budgetMax}`}`,
      )
    }
    if (parts.length === 0) return `${filteredPosts.length}개의 글`
    return `${parts.filter(Boolean).join(' · ')} · ${filteredPosts.length}개`
  }, [
    intent,
    lookingFor,
    neighborhood,
    budgetMin,
    budgetMax,
    filteredPosts.length,
  ])

  function openFilters() {
    setDraftIntent(intent)
    setDraftLookingFor(lookingFor)
    setDraftNeighborhood(neighborhood)
    setDraftBudgetMin(budgetMin)
    setDraftBudgetMax(budgetMax)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setIntent(draftIntent)
    setLookingFor(draftLookingFor)
    setNeighborhood(draftNeighborhood)
    setBudgetMin(draftBudgetMin)
    setBudgetMax(draftBudgetMax)
    setFiltersOpen(false)
  }

  function clearAllFilters() {
    setIntent('all')
    setLookingFor('all')
    setNeighborhood('all')
    setBudgetMin(BUDGET_BOUNDS.min)
    setBudgetMax(BUDGET_BOUNDS.max)
    setDraftIntent('all')
    setDraftLookingFor('all')
    setDraftNeighborhood('all')
    setDraftBudgetMin(BUDGET_BOUNDS.min)
    setDraftBudgetMax(BUDGET_BOUNDS.max)
  }

  function toggleQuickLookingFor(id: RoommateLookingFor) {
    if (lookingFor === id) {
      setLookingFor('all')
      setIntent('all')
      return
    }
    const option = ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === id)
    setLookingFor(id)
    setIntent(option?.intent ?? 'all')
  }

  function toggleQuickBudget(min: number, max: number) {
    const active = budgetMin === min && budgetMax === max
    setBudgetMin(active ? BUDGET_BOUNDS.min : min)
    setBudgetMax(active ? BUDGET_BOUNDS.max : max)
  }

  const newPath = `/nyc/${BOARD_ID}/new`
  const loginNext = `/nyc/login?next=${encodeURIComponent(newPath)}`
  const schoolVerified = isSchoolVerified(profile)
  const suspended = isAccountSuspended(profile)
  const canWrite = Boolean(user) && schoolVerified && !suspended
  const postHref = !user
    ? loginNext
    : suspended
      ? '/nyc/me'
      : schoolVerified
        ? newPath
        : getSchoolVerifyHref(newPath)
  const writeCtaLabel = !user
    ? '로그인'
    : suspended
      ? '이용 정지'
      : schoolVerified
        ? meta.writeLabel
        : '학교 인증하기'

  return (
    <PullToRefresh onRefresh={refreshPosts} className='flex flex-1 flex-col'>
      <BoardPageShell width='narrow' className='flex flex-1 flex-col'>
        <BoardListToolbar
          breadcrumbLabel='룸메이트 · 서블렛'
          intro={meta.listIntro}
          writeHref={postHref}
          writeLabel={authLoading ? meta.writeLabel : writeCtaLabel}
          onFilterClick={openFilters}
          filterCount={activeFilterCount}
          showWrite={!authLoading && !suspended}
        >
          <ChipScrollRow ariaLabel='빠른 필터'>
            <BoardQuickChip
              label='전체'
              active={lookingFor === 'all' && intent === 'all'}
              onClick={() => {
                setLookingFor('all')
                setIntent('all')
              }}
            />
            {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => (
              <BoardQuickChip
                key={option.id}
                label={option.label}
                active={lookingFor === option.id}
                onClick={() => toggleQuickLookingFor(option.id)}
              />
            ))}
            {BUDGET_PRESETS.map((preset) => (
              <BoardQuickChip
                key={preset.id}
                label={preset.label}
                active={activeBudgetPreset === preset.id}
                onClick={() => toggleQuickBudget(preset.min, preset.max)}
              />
            ))}
          </ChipScrollRow>
        </BoardListToolbar>

        <section className='flex-1 pb-14 pt-4 sm:pb-16 sm:pt-5'>
          {loading ? (
            <div className='space-y-4'>
              <Skeleton className='h-3.5 w-28' />
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className='h-[9.5rem] w-full rounded-[1.25rem]'
                />
              ))}
            </div>
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
                posts.length === 0 ? writeCtaLabel : '필터 초기화'
              }
              onAction={posts.length === 0 ? undefined : clearAllFilters}
            />
          ) : (
            <>
              <p className='mb-3.5 text-[12px] font-medium text-[var(--muted)] sm:mb-4 sm:text-[13px]'>
                {summaryLabel}
              </p>
              <div className='flex flex-col gap-4 sm:gap-5'>
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
                  setDraftIntent('all')
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
                분류
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label='전체'
                  active={draftIntent === 'all' && draftLookingFor === 'all'}
                  onClick={() => {
                    setDraftIntent('all')
                    setDraftLookingFor('all')
                  }}
                />
                {ROOMMATE_INTENT_OPTIONS.map((option) => (
                  <SheetChip
                    key={option.id}
                    label={option.label}
                    active={
                      draftIntent === option.id && draftLookingFor === 'all'
                    }
                    onClick={() => {
                      setDraftIntent(option.id)
                      setDraftLookingFor('all')
                    }}
                  />
                ))}
              </div>
              <div className='mt-4 space-y-3'>
                {ROOMMATE_INTENT_OPTIONS.map((group) => (
                  <div key={group.id}>
                    <p className='text-[12px] font-medium text-[var(--muted)]'>
                      {group.label}
                    </p>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {ROOMMATE_LOOKING_FOR_OPTIONS.filter(
                        (item) => item.intent === group.id,
                      ).map((option) => (
                        <SheetChip
                          key={option.id}
                          label={option.label}
                          active={draftLookingFor === option.id}
                          onClick={() => {
                            setDraftLookingFor(option.id)
                            setDraftIntent(option.intent)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                월 예산
              </h4>
              <p className='mt-1 text-[12px] text-[var(--muted)]'>
                {(formatRoommateBudget(draftBudgetMin) ??
                  `$${draftBudgetMin}`) +
                  ' – ' +
                  (formatRoommateBudget(draftBudgetMax) ??
                    `$${draftBudgetMax}`)}
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
