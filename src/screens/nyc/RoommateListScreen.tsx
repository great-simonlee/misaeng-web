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
import { useFormat, useT } from '@lib/i18n/client'
import {
  ROOMMATE_BUDGET_MAX,
  ROOMMATE_INTENT_OPTIONS,
  ROOMMATE_LOOKING_FOR_OPTIONS,
  formatRoommateBudget,
  getRoommateAreaGroups,
  getRoommateTimeline,
  isRoommateBoostActive,
  normalizeRoommateLookingFor,
  roommateLocationInArea,
  roommateMatchesIntent,
  roommateToday,
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
/** 슬라이더 끝값. 오른쪽 끝(max)은 "그 이상 전부"로 본다 */
const BUDGET_BOUNDS = { min: 0, max: Math.min(5000, ROOMMATE_BUDGET_MAX) }
/** 입주 시기 칩: 이번 달 + 다음 N달, 그 뒤는 "이후" 하나로 */
const MOVE_IN_MONTHS = 4

/** 라벨: housing `roommate.list.budgetPresets.<id>` */
const BUDGET_PRESETS = [
  { id: 'under-1500', min: 0, max: 1500 },
  { id: '1500-2000', min: 1500, max: 2000 },
  { id: '2000-2500', min: 2000, max: 2500 },
  { id: '2500-plus', min: 2500, max: BUDGET_BOUNDS.max },
] as const

/** 라벨: housing `roommate.list.sortOptions.<id>` */
const SORT_OPTIONS = ['newest', 'moveInSoon', 'priceLow', 'priceHigh'] as const
type SortOption = (typeof SORT_OPTIONS)[number]

type Filters = {
  intent: 'all' | RoommateIntent
  lookingFor: 'all' | RoommateLookingFor
  /** 'all' | 동네 묶음 id (ROOMMATE_AREA_GROUPS) */
  area: string
  /** 'all' | 'YYYY-MM' | 'later' */
  moveIn: string
  budgetMin: number
  budgetMax: number
  query: string
  sort: SortOption
}

const DEFAULT_FILTERS: Filters = {
  intent: 'all',
  lookingFor: 'all',
  area: 'all',
  moveIn: 'all',
  budgetMin: BUDGET_BOUNDS.min,
  budgetMax: BUDGET_BOUNDS.max,
  query: '',
  sort: 'newest',
}

function budgetFiltered(filters: Filters) {
  return filters.budgetMin > BUDGET_BOUNDS.min || filters.budgetMax < BUDGET_BOUNDS.max
}

/** 입주일이 속한 달 'YYYY-MM'. 이미 입주 가능하면 이번 달 */
function moveInMonthOf(post: CommunityPost, today: string) {
  const start = post.roommateMoveInDate?.trim()
  if (!start) return null
  return (start < today ? today : start).slice(0, 7)
}

function matchesFilters(
  post: CommunityPost,
  filters: Filters,
  ctx: { city: string; today: string; months: string[] },
) {
  const type = normalizeRoommateLookingFor(post.roommateLookingFor, post.detail)
  if (filters.lookingFor !== 'all' && type !== filters.lookingFor) return false
  if (
    filters.lookingFor === 'all' &&
    filters.intent !== 'all' &&
    !roommateMatchesIntent(type, filters.intent)
  ) {
    return false
  }
  if (
    filters.area !== 'all' &&
    !roommateLocationInArea(post.location, ctx.city, filters.area)
  ) {
    return false
  }
  if (filters.moveIn !== 'all') {
    const month = moveInMonthOf(post, ctx.today)
    if (!month) return false
    if (filters.moveIn === 'later') {
      if (month <= ctx.months[ctx.months.length - 1]) return false
    } else if (month !== filters.moveIn) {
      return false
    }
  }
  if (budgetFiltered(filters)) {
    const budget = post.roommateBudgetMax
    if (budget == null) return false
    if (budget < filters.budgetMin) return false
    // 오른쪽 끝이면 상한 없음 ($5,000 넘는 글도 포함)
    if (filters.budgetMax < BUDGET_BOUNDS.max && budget > filters.budgetMax) return false
  }
  const q = filters.query.trim().toLowerCase()
  if (q) {
    const haystack = [post.title, post.description, post.location]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

/**
 * 정렬: 상단 노출 중인 글이 항상 먼저, 기간이 지난 글은 항상 뒤로.
 * 그 안에서 고른 정렬 (값이 없는 글은 뒤로).
 */
function sortPosts(posts: CommunityPost[], sort: SortOption, today: string) {
  const now = Date.now()
  const rank = (post: CommunityPost) =>
    isRoommateBoostActive(post, now) ? 0 : getRoommateTimeline(post, today).ended ? 2 : 1
  const compareOptional = (a: number | string | null, b: number | string | null, dir: 1 | -1) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    return a < b ? -dir : a > b ? dir : 0
  }
  return [...posts].sort((a, b) => {
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    let result = 0
    if (sort === 'priceLow') result = compareOptional(a.roommateBudgetMax, b.roommateBudgetMax, 1)
    else if (sort === 'priceHigh') result = compareOptional(a.roommateBudgetMax, b.roommateBudgetMax, -1)
    else if (sort === 'moveInSoon') {
      result = compareOptional(a.roommateMoveInDate || null, b.roommateMoveInDate || null, 1)
    }
    return result !== 0 ? result : b.createdAt - a.createdAt
  })
}

export function RoommateListScreen() {
  const t = useT('housing')
  const tCommunity = useT('community')
  const format = useFormat()
  const city = useCity()
  const href = useCityPath()
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS)

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

  const today = roommateToday()
  /** 이번 달부터 MOVE_IN_MONTHS개의 'YYYY-MM' */
  const moveInMonths = useMemo(() => {
    const [year, month] = today.split('-').map(Number)
    return Array.from({ length: MOVE_IN_MONTHS }, (_, index) => {
      const date = new Date(year, month - 1 + index, 1)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })
  }, [today])
  const filterCtx = useMemo(
    () => ({ city, today, months: moveInMonths }),
    [city, today, moveInMonths],
  )
  const areaGroups = getRoommateAreaGroups(city)

  const filteredPosts = useMemo(
    () =>
      sortPosts(
        posts.filter((post) => matchesFilters(post, filters, filterCtx)),
        filters.sort,
        today,
      ),
    [posts, filters, filterCtx, today],
  )

  const draftResultCount = useMemo(
    () => posts.filter((post) => matchesFilters(post, draft, filterCtx)).length,
    [posts, draft, filterCtx],
  )

  /** 동네별 글 수 (필터 칩 옆 숫자) */
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const group of areaGroups) {
      counts.set(
        group.id,
        posts.filter((post) => roommateLocationInArea(post.location, city, group.id)).length,
      )
    }
    return counts
  }, [areaGroups, posts, city])

  const activeFilterCount =
    (filters.intent !== 'all' || filters.lookingFor !== 'all' ? 1 : 0) +
    (filters.area !== 'all' ? 1 : 0) +
    (filters.moveIn !== 'all' ? 1 : 0) +
    (budgetFiltered(filters) ? 1 : 0) +
    (filters.query.trim() ? 1 : 0) +
    (filters.sort !== 'newest' ? 1 : 0)

  const activeBudgetPreset = BUDGET_PRESETS.find(
    (preset) => preset.min === filters.budgetMin && preset.max === filters.budgetMax,
  )?.id

  function monthLabel(key: string) {
    const [year, month] = key.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return format.date(date, {
      month: 'short',
      ...(year !== Number(today.slice(0, 4)) ? { year: 'numeric' } : {}),
    })
  }

  function moveInLabel(value: string) {
    if (value === 'later') {
      const next = moveInMonths[moveInMonths.length - 1].split('-').map(Number)
      const after = new Date(next[0], next[1], 1)
      const key = `${after.getFullYear()}-${String(after.getMonth() + 1).padStart(2, '0')}`
      return t('roommate.list.moveInLater', { month: monthLabel(key) })
    }
    return monthLabel(value)
  }

  function budgetLabel(value: number) {
    const label = formatRoommateBudget(value) ?? `$${value}`
    return value >= BUDGET_BOUNDS.max ? `${label}+` : label
  }

  const summaryLabel = (() => {
    const parts: string[] = []
    if (filters.lookingFor !== 'all') {
      parts.push(t(`roommate.lookingFor.${filters.lookingFor}.shortLabel`))
    } else if (filters.intent !== 'all') {
      parts.push(t(`roommate.intents.${filters.intent}.label`))
    }
    if (filters.area !== 'all') parts.push(t(`roommate.areas.${filters.area}`))
    if (filters.moveIn !== 'all') parts.push(moveInLabel(filters.moveIn))
    if (budgetFiltered(filters)) {
      parts.push(`${budgetLabel(filters.budgetMin)}–${budgetLabel(filters.budgetMax)}`)
    }
    if (filters.query.trim()) parts.push(`"${filters.query.trim()}"`)
    if (parts.length === 0) {
      return t('roommate.list.summaryAll', { count: filteredPosts.length })
    }
    return t('roommate.list.summaryFiltered', {
      count: filteredPosts.length,
      filters: parts.join(' · '),
    })
  })()

  function updateDraft(patch: Partial<Filters>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function updateFilters(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function openFilters() {
    setDraft(filters)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setFilters(draft)
    setFiltersOpen(false)
  }

  function clearAllFilters() {
    setFilters(DEFAULT_FILTERS)
    setDraft(DEFAULT_FILTERS)
  }

  function toggleQuickLookingFor(id: RoommateLookingFor) {
    if (filters.lookingFor === id) {
      updateFilters({ lookingFor: 'all', intent: 'all' })
      return
    }
    const option = ROOMMATE_LOOKING_FOR_OPTIONS.find((item) => item.id === id)
    updateFilters({ lookingFor: id, intent: option?.intent ?? 'all' })
  }

  function toggleQuickBudget(min: number, max: number) {
    const active = filters.budgetMin === min && filters.budgetMax === max
    updateFilters({
      budgetMin: active ? BUDGET_BOUNDS.min : min,
      budgetMax: active ? BUDGET_BOUNDS.max : max,
    })
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
              active={filters.lookingFor === 'all' && filters.intent === 'all'}
              onClick={() => updateFilters({ lookingFor: 'all', intent: 'all' })}
            />
            {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => (
              <BoardQuickChip
                key={option.id}
                label={t(`roommate.lookingFor.${option.id}.shortLabel`)}
                active={filters.lookingFor === option.id}
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
                  className='h-[10.5rem] w-full rounded-[1.25rem]'
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
              <div className='mb-3.5 flex items-center justify-between gap-3 sm:mb-4'>
                <p className='min-w-0 truncate text-[12px] font-medium text-[var(--muted)] sm:text-[13px]'>
                  {summaryLabel}
                </p>
                <label className='relative shrink-0'>
                  <span className='sr-only'>{tCommunity('list.sort')}</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
                    className='h-8 appearance-none rounded-full bg-white pl-3 pr-7 text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] outline-none transition hover:ring-black/15 focus:ring-black/25'
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`roommate.list.sortOptions.${option}`)}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.2'
                    className='pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-[var(--muted)]'
                    aria-hidden
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' d='m6 9 6 6 6-6' />
                  </svg>
                </label>
              </div>
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
                onClick={() => setDraft(DEFAULT_FILTERS)}
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
                {tCommunity('list.search')}
              </h4>
              <input
                type='search'
                value={draft.query}
                onChange={(e) => updateDraft({ query: e.target.value })}
                placeholder={tCommunity('list.searchPlaceholder')}
                className='mt-3 h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafbfc] px-3.5 text-[15px] outline-none transition placeholder:text-[var(--muted)] focus:border-black/20 focus:bg-white'
              />
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                {t('roommate.list.category')}
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label={t('list.sheet.all')}
                  active={draft.intent === 'all' && draft.lookingFor === 'all'}
                  onClick={() => updateDraft({ intent: 'all', lookingFor: 'all' })}
                />
                {ROOMMATE_INTENT_OPTIONS.map((option) => (
                  <SheetChip
                    key={option.id}
                    label={t(`roommate.intents.${option.id}.label`)}
                    active={draft.intent === option.id && draft.lookingFor === 'all'}
                    onClick={() => updateDraft({ intent: option.id, lookingFor: 'all' })}
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
                          active={draft.lookingFor === option.id}
                          onClick={() =>
                            updateDraft({ lookingFor: option.id, intent: option.intent })
                          }
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
                {`${budgetLabel(draft.budgetMin)} – ${budgetLabel(draft.budgetMax)}`}
              </p>
              <div className='mt-3'>
                <RangeSlider
                  min={BUDGET_BOUNDS.min}
                  max={BUDGET_BOUNDS.max}
                  step={BUDGET_STEP}
                  valueMin={draft.budgetMin}
                  valueMax={draft.budgetMax}
                  onChange={({ min, max }) => updateDraft({ budgetMin: min, budgetMax: max })}
                  formatValue={budgetLabel}
                />
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {BUDGET_PRESETS.map((preset) => (
                  <SheetChip
                    key={preset.id}
                    label={t(`roommate.list.budgetPresets.${preset.id}`)}
                    active={
                      draft.budgetMin === preset.min && draft.budgetMax === preset.max
                    }
                    onClick={() =>
                      updateDraft({ budgetMin: preset.min, budgetMax: preset.max })
                    }
                  />
                ))}
              </div>
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                {t('roommate.list.moveIn')}
              </h4>
              <p className='mt-1 text-[12px] text-[var(--muted)]'>
                {t('roommate.list.moveInHint')}
              </p>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label={t('list.sheet.all')}
                  active={draft.moveIn === 'all'}
                  onClick={() => updateDraft({ moveIn: 'all' })}
                />
                {[...moveInMonths, 'later'].map((value) => (
                  <SheetChip
                    key={value}
                    label={moveInLabel(value)}
                    active={draft.moveIn === value}
                    onClick={() => updateDraft({ moveIn: value })}
                  />
                ))}
              </div>
            </section>

            {areaGroups.length > 0 ? (
              <section>
                <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                  {t('roommate.list.neighborhood')}
                </h4>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <SheetChip
                    label={t('list.sheet.all')}
                    active={draft.area === 'all'}
                    onClick={() => updateDraft({ area: 'all' })}
                  />
                  {areaGroups.map((group) => {
                    const count = areaCounts.get(group.id) ?? 0
                    return (
                      <SheetChip
                        key={group.id}
                        label={t(`roommate.areas.${group.id}`)}
                        count={count}
                        active={draft.area === group.id}
                        onClick={() => updateDraft({ area: group.id })}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                {tCommunity('list.sort')}
              </h4>
              <div className='mt-3 grid grid-cols-2 gap-2'>
                {SORT_OPTIONS.map((option) => {
                  const active = draft.sort === option
                  return (
                    <button
                      key={option}
                      type='button'
                      onClick={() => updateDraft({ sort: option })}
                      className={cn(
                        'h-11 rounded-xl border px-2 text-[13px] font-semibold touch-manipulation transition',
                        active
                          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
                          : 'border-black/[0.08] bg-white text-[var(--muted-foreground)] hover:border-black/15',
                      )}
                    >
                      {t(`roommate.list.sortOptions.${option}`)}
                    </button>
                  )
                })}
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
  count,
  onClick,
}: {
  label: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-2 text-left text-[12px] font-medium leading-snug touch-manipulation transition',
        active
          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
          : 'border-black/[0.08] bg-white text-[var(--foreground)] hover:border-black/15',
      )}
    >
      {label}
      {count != null && count > 0 ? (
        <span className='tabular-nums text-[var(--muted)]'>{count}</span>
      ) : null}
    </button>
  )
}
