'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  BottomSheet,
  PullToRefresh,
  RangeSlider,
  Skeleton,
} from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { fetchCommunityPosts, localizeCommunityError } from '@lib/community/client'
import { cityLoginPath, getCity } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
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
  getIdentityVerifyHref,
  isAccountSuspended,
  isIdentityVerified,
} from '@lib/community/schoolGate'
import { communityBoardKey } from '@lib/constants/nyc'
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

/** 라벨: housing `roommate.list.budgetPresets.<id>` */
const BUDGET_PRESETS = [
  { id: 'under-1500', min: 0, max: 1500 },
  { id: '1500-2000', min: 1500, max: 2000 },
  { id: '2000-2500', min: 2000, max: 2500 },
  { id: '2500-plus', min: 2500, max: BUDGET_BOUNDS.max },
] as const

/** 글의 location 원문과 부분 일치로 거르는 값이라 번역하지 않는다 (장소 이름 데이터) */
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
  const t = useT('housing')
  const tCommunity = useT('community')
  const city = useCity()
  const href = useCityPath()
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
        const data = await fetchCommunityPosts(BOARD_ID, city)
        setPosts(data)
      } catch (err) {
        if (!opts?.silent) {
          toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('roommate.list.loadFailed')))
        }
        throw err
      } finally {
        setLoading(false)
      }
    },
    [city, toastError, t, tCommunity],
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
      parts.push(t(`roommate.lookingFor.${lookingFor}.label`))
    } else if (intent !== 'all') {
      parts.push(t(`roommate.intents.${intent}.label`))
    }
    if (neighborhood !== 'all') parts.push(neighborhood)
    if (budgetMin > BUDGET_BOUNDS.min || budgetMax < BUDGET_BOUNDS.max) {
      parts.push(
        `${formatRoommateBudget(budgetMin) ?? `$${budgetMin}`}–${formatRoommateBudget(budgetMax) ?? `$${budgetMax}`}`,
      )
    }
    if (parts.length === 0) {
      return t('roommate.list.summaryAll', { count: filteredPosts.length })
    }
    return t('roommate.list.summaryFiltered', {
      count: filteredPosts.length,
      filters: parts.filter(Boolean).join(' · '),
    })
  }, [
    t,
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

  const newPath = href(`/${BOARD_ID}/new`)
  const loginNext = cityLoginPath(city, newPath)
  const identityVerified = isIdentityVerified(profile)
  const suspended = isAccountSuspended(profile)
  const canWrite = Boolean(user) && identityVerified && !suspended
  const verifyCta = tCommunity('verify.cta')
  const postHref = !user
    ? loginNext
    : suspended
      ? href('/me')
      : identityVerified
        ? newPath
        : getIdentityVerifyHref(newPath)
  const writeCtaLabel = !user
    ? t('roommate.list.login')
    : suspended
      ? t('roommate.list.suspended')
      : identityVerified
        ? tCommunity(communityBoardKey(BOARD_ID, 'writeLabel'))
        : verifyCta

  return (
    <PullToRefresh onRefresh={refreshPosts} className='flex flex-1 flex-col'>
      <BoardPageShell width='narrow' className='flex flex-1 flex-col'>
        <BoardListToolbar
          breadcrumbLabel={t('roommate.list.breadcrumb')}
          intro={tCommunity(communityBoardKey(BOARD_ID, 'listIntro'), { city: getCity(city).name })}
          writeHref={postHref}
          writeLabel={authLoading ? tCommunity(communityBoardKey(BOARD_ID, 'writeLabel')) : writeCtaLabel}
          onFilterClick={openFilters}
          filterCount={activeFilterCount}
          showWrite={!authLoading && !suspended}
        >
          <ChipScrollRow ariaLabel={t('list.quickFilters')}>
            <BoardQuickChip
              label={t('list.sheet.all')}
              active={lookingFor === 'all' && intent === 'all'}
              onClick={() => {
                setLookingFor('all')
                setIntent('all')
              }}
            />
            {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => (
              <BoardQuickChip
                key={option.id}
                label={t(`roommate.lookingFor.${option.id}.label`)}
                active={lookingFor === option.id}
                onClick={() => toggleQuickLookingFor(option.id)}
              />
            ))}
            {BUDGET_PRESETS.map((preset) => (
              <BoardQuickChip
                key={preset.id}
                label={t(`roommate.list.budgetPresets.${preset.id}`)}
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
                  ? t('roommate.list.empty.noPostsTitle')
                  : t('roommate.list.empty.noMatchTitle')
              }
              description={
                posts.length === 0
                  ? canWrite
                    ? t('roommate.list.empty.firstPost')
                    : user
                      ? t('roommate.list.empty.verifyToPost')
                      : t('roommate.list.empty.loginToPost')
                  : t('list.empty.description')
              }
              actionHref={posts.length === 0 ? postHref : undefined}
              actionLabel={
                posts.length === 0 ? writeCtaLabel : t('list.empty.action')
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
          title={t('list.filters')}
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
                {t('list.sheet.clearAll')}
              </button>
              <button
                type='button'
                onClick={applyFilters}
                className='inline-flex h-11 min-w-[140px] items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--navy-light)]'
              >
                {t('roommate.list.showResults', { count: draftResultCount })}
              </button>
            </div>
          }
        >
          <div className='space-y-7 overflow-x-hidden px-3 pb-2'>
            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                {t('roommate.list.category')}
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label={t('list.sheet.all')}
                  active={draftIntent === 'all' && draftLookingFor === 'all'}
                  onClick={() => {
                    setDraftIntent('all')
                    setDraftLookingFor('all')
                  }}
                />
                {ROOMMATE_INTENT_OPTIONS.map((option) => (
                  <SheetChip
                    key={option.id}
                    label={t(`roommate.intents.${option.id}.label`)}
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
                      {t(`roommate.intents.${group.id}.label`)}
                    </p>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {ROOMMATE_LOOKING_FOR_OPTIONS.filter(
                        (item) => item.intent === group.id,
                      ).map((option) => (
                        <SheetChip
                          key={option.id}
                          label={t(`roommate.lookingFor.${option.id}.label`)}
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
                {t('roommate.list.monthlyBudget')}
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
                    label={t(`roommate.list.budgetPresets.${preset.id}`)}
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
                {t('roommate.list.neighborhood')}
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label={t('list.sheet.all')}
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
