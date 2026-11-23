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
import { useDebounced, usePagedList } from '@hooks/usePagedList'
import { fetchCommunityPage, localizeCommunityError } from '@lib/community/client'
import {
  BUDGET_BOUNDS,
  BUDGET_PRESETS,
  BUDGET_STEP,
  DEFAULT_FILTERS,
  SORT_OPTIONS,
  budgetFiltered,
  moveInMonthsFrom,
  roommateFilterParams,
  type Filters,
  type SortOption,
} from '@lib/community/roommateList'
import { cityLoginPath, getCity } from '@lib/constants/cities'
import { useFormat, useT } from '@lib/i18n/client'
import {
  ROOMMATE_INTENT_OPTIONS,
  ROOMMATE_LOOKING_FOR_OPTIONS,
  formatRoommateBudget,
  getRoommateAreaGroups,
  roommateToday,
  type RoommateLookingFor,
} from '@lib/community/roommate'
import {
  getIdentityVerifyHref,
  isAccountSuspended,
  canWritePosts,
} from '@lib/community/schoolGate'
import { communityBoardKey } from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CommunityBoardRail, RailChip, RailChipGroup, RailFilterCard, SisterBoardChips } from '@widgets/nyc/CommunityBoardRail'
import { MISAENG_DESIGN } from '@lib/brand/design'
import { BoardListToolbar, BoardQuickChip } from '@widgets/nyc/BoardListToolbar'
import { HousingSegmentTabs } from '@widgets/nyc/HousingSegmentTabs'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { PagedListFooter } from '@widgets/nyc/PagedListFooter'
import { RoommatePostCard } from '@widgets/nyc/RoommatePostCard'

const BOARD_ID = 'roommate' as const
function activeFilterCountOf(filters: Filters) {
  return (
    (filters.intent !== 'all' || filters.lookingFor !== 'all' ? 1 : 0) +
    (filters.area !== 'all' ? 1 : 0) +
    (filters.moveIn !== 'all' ? 1 : 0) +
    (budgetFiltered(filters) ? 1 : 0) +
    (filters.query.trim() ? 1 : 0) +
    (filters.sort !== 'newest' ? 1 : 0)
  )
}

/** Posts per page (owner 11-23 infinite scroll) */
const PAGE_SIZE = 24

export function RoommateListScreen() {
  const t = useT('housing')
  const tCommunity = useT('community')
  const format = useFormat()
  const city = useCity()
  const href = useCityPath()
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS)
  const query = useDebounced(filters.query, 300)

  /*
   * Pages from the server (owner 11-23): filters and sort run there (src/lib/community/roommateList.ts), 24 posts at
   * a time, the next page when the bottom of the list comes near.
   */
  const serverFilters = useMemo(() => roommateFilterParams({ ...filters, query }), [filters, query])
  const paged = usePagedList<CommunityPost>(JSON.stringify([city, serverFilters]), (cursor, signal) =>
    fetchCommunityPage({ boardId: BOARD_ID, city, limit: PAGE_SIZE, cursor, filters: serverFilters, signal }).then((page) => ({
      items: page.posts,
      nextCursor: page.nextCursor,
      total: page.total,
      meta: page.roommateAreas,
    })),
  )
  const loading = paged.loading
  useEffect(() => {
    if (paged.error && paged.items.length === 0) {
      toastError(getErrorMessage(localizeCommunityError(paged.error, tCommunity), t('roommate.list.loadFailed')))
    }
  }, [paged.error, paged.items.length, t, tCommunity, toastError])
  const refreshPosts = useCallback(async () => {
    await paged.reload()
  }, [paged])

  const today = roommateToday()
  /** 이번 달부터 MOVE_IN_MONTHS개의 'YYYY-MM' */
  const moveInMonths = useMemo(() => moveInMonthsFrom(today), [today])
  const areaGroups = getRoommateAreaGroups(city)

  const filteredPosts = paged.items
  const boardEmpty = paged.total === 0 && activeFilterCountOf(filters) === 0

  // 필터 시트의 "N개 보기": the server counts with the draft filters while the sheet is open
  const [draftResultCount, setDraftResultCount] = useState(0)
  useEffect(() => {
    if (!filtersOpen) return
    const abort = new AbortController()
    const timer = window.setTimeout(() => {
      void fetchCommunityPage({ boardId: BOARD_ID, city, limit: 1, filters: roommateFilterParams(draft), signal: abort.signal })
        .then((page) => setDraftResultCount(page.total))
        .catch(() => {})
    }, 200)
    return () => {
      window.clearTimeout(timer)
      abort.abort()
    }
  }, [filtersOpen, draft, city])

  /** 동네별 글 수 (필터 칩 옆 숫자): from the server, over the whole board */
  const areaCounts = useMemo(
    () => new Map(Object.entries((paged.meta as Record<string, number> | undefined) ?? {})),
    [paged.meta],
  )

  const activeFilterCount = activeFilterCountOf(filters)

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
      return t('roommate.list.summaryAll', { count: paged.total })
    }
    return t('roommate.list.summaryFiltered', {
      count: paged.total,
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
  // 직장 인증 대기(보류 글)도 쓸 수 있다. 학부모는 질문·자유에만 → 글쓰기 화면이 안내한다
  const identityVerified = canWritePosts(profile)
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
      <BoardPageShell
        width='narrow'
        className='flex flex-1 flex-col'
        rail={
          <CommunityBoardRail
            boardId={BOARD_ID}
            boardTitle={tCommunity(`categories.${BOARD_ID}.title`)}
            writeHref={postHref}
            writeLabel={writeCtaLabel}
            showWrite={!authLoading && !suspended}
            beforeBoards={
              // 렌트 / 룸메이트 switch + the quick filters next to the list on desktop (owner 11-23); full sheet one click away
              <RailFilterCard
                title={t('list.title')}
                count={paged.total}
                action={
                  <button
                    type='button'
                    onClick={openFilters}
                    className='flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--foreground)] text-[13.5px] font-semibold text-white transition hover:bg-black'
                  >
                    {tCommunity('rail.moreFilters')}
                    {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
                  </button>
                }
              >
                <HousingSegmentTabs active='roommate' className='mt-3 flex w-full [&>a]:flex-1 [&>a]:justify-center' />
                <RailChipGroup label={t('roommate.list.category')}>
                  <RailChip
                    active={filters.lookingFor === 'all' && filters.intent === 'all'}
                    onClick={() => updateFilters({ lookingFor: 'all', intent: 'all' })}
                  >
                    {t('list.sheet.all')}
                  </RailChip>
                  {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => (
                    <RailChip key={option.id} active={filters.lookingFor === option.id} onClick={() => toggleQuickLookingFor(option.id)}>
                      {t(`roommate.lookingFor.${option.id}.shortLabel`)}
                    </RailChip>
                  ))}
                </RailChipGroup>
                <RailChipGroup label={t('roommate.list.monthlyBudget')}>
                  {BUDGET_PRESETS.map((preset) => (
                    <RailChip key={preset.id} active={activeBudgetPreset === preset.id} onClick={() => toggleQuickBudget(preset.min, preset.max)}>
                      {t(`roommate.list.budgetPresets.${preset.id}`)}
                    </RailChip>
                  ))}
                </RailChipGroup>
              </RailFilterCard>
            }
          />
        }
      >
        <BoardListToolbar
          breadcrumbLabel={MISAENG_DESIGN ? t('list.title') : t('roommate.list.breadcrumb')}
          belowTitle={MISAENG_DESIGN ? <HousingSegmentTabs active='roommate' className='mt-4 lg:hidden' /> : undefined}
          intro={tCommunity(communityBoardKey(BOARD_ID, 'listIntro'), { city: getCity(city).name })}
          writeHref={postHref}
          writeLabel={authLoading ? tCommunity(communityBoardKey(BOARD_ID, 'writeLabel')) : writeCtaLabel}
          onFilterClick={openFilters}
          filterCount={activeFilterCount}
          filterInRail
          showWrite={!authLoading && !suspended}
        >
          {/* Misaeng desktop: these chips live in the right rail */}
          <div className={MISAENG_DESIGN ? 'lg:hidden' : undefined}>
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
          </div>
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
            <>
            <EmptyState
              title={
                boardEmpty
                  ? t('roommate.list.empty.noPostsTitle')
                  : t('roommate.list.empty.noMatchTitle')
              }
              description={
                boardEmpty
                  ? canWrite
                    ? t('roommate.list.empty.firstPost')
                    : user
                      ? t('roommate.list.empty.verifyToPost')
                      : t('roommate.list.empty.loginToPost')
                  : t('list.empty.description')
              }
              actionHref={boardEmpty ? postHref : undefined}
              actionLabel={
                boardEmpty ? writeCtaLabel : t('list.empty.action')
              }
              onAction={boardEmpty ? undefined : clearAllFilters}
            />
            {MISAENG_DESIGN && boardEmpty ? <SisterBoardChips boardId={BOARD_ID} className='lg:hidden' /> : null}
            </>
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
              <PagedListFooter
                sentinelRef={paged.sentinelRef}
                hasMore={paged.hasMore}
                loadingMore={paged.loadingMore}
                failed={Boolean(paged.error)}
                onRetry={paged.retry}
                retryLabel={tCommunity('list.retry')}
                failedLabel={t('roommate.list.loadFailed')}
              />
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
