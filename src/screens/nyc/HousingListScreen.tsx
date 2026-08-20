'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BottomSheet, RangeSlider } from '@components'
import {
  formatHousingPriceFilterLabel,
  getHousingPriceBounds,
  getHousingPricePresetId,
  getHousingPricePresets,
  getHousingRoomTypeLabel,
  getHousingUnitTypeLabel,
  getListingArea,
  getListingUnitType,
  housingMatchesPerk,
  housingMatchesPrice,
  housingMatchesRoomType,
  HOUSING_AMENITY_PERKS,
  HOUSING_BENEFIT_PERKS,
  HOUSING_LISTING_KINDS,
  HOUSING_NEIGHBORHOODS,
  HOUSING_PERKS,
  HOUSING_PRICE_STEP,
  HOUSING_ROOM_TYPES,
  HOUSING_UNIT_TYPES,
  isHousingPriceFilterActive,
  listMockHousingPosts,
  type HousingListingKind,
} from '@lib/constants/housingMock'
import { fetchHousingListings, mergeMockAndLiveHousingListings } from '@lib/housing/fetchListings'
import { cn } from '@lib'
import type {
  HousingListing,
  HousingPerkId,
  HousingRoomType,
  HousingUnitType,
} from '@/types/nyc'
import { HousingPostCard } from '@widgets/nyc/HousingPostCard'

type UnitTypeFilter = 'all' | HousingUnitType
type RoomTypeFilter = 'all' | HousingRoomType
type NeighborhoodFilter = 'all' | string
type ListingKindFilter = 'all' | HousingListingKind

function defaultPriceRange(kind: ListingKindFilter) {
  if (kind === 'all') {
    const bounds = getHousingPriceBounds('unit')
    return { min: bounds.min, max: bounds.max }
  }
  const bounds = getHousingPriceBounds(kind)
  return { min: bounds.min, max: bounds.max }
}

export function HousingListScreen() {
  const [listingKind, setListingKind] = useState<ListingKindFilter>('all')
  const [unitType, setUnitType] = useState<UnitTypeFilter>('all')
  const [roomType, setRoomType] = useState<RoomTypeFilter>('all')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodFilter>('all')
  const [perks, setPerks] = useState<HousingPerkId[]>([])
  const [priceMin, setPriceMin] = useState<number>(
    getHousingPriceBounds('unit').min,
  )
  const [priceMax, setPriceMax] = useState<number>(
    getHousingPriceBounds('unit').max,
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [livePosts, setLivePosts] = useState<HousingListing[]>([])

  const [draftListingKind, setDraftListingKind] =
    useState<ListingKindFilter>('all')
  const [draftUnitType, setDraftUnitType] = useState<UnitTypeFilter>('all')
  const [draftRoomType, setDraftRoomType] = useState<RoomTypeFilter>('all')
  const [draftNeighborhood, setDraftNeighborhood] =
    useState<NeighborhoodFilter>('all')
  const [draftPerks, setDraftPerks] = useState<HousingPerkId[]>([])
  const [draftPriceMin, setDraftPriceMin] = useState<number>(
    getHousingPriceBounds('unit').min,
  )
  const [draftPriceMax, setDraftPriceMax] = useState<number>(
    getHousingPriceBounds('unit').max,
  )

  const chipScrollRef = useRef<HTMLDivElement>(null)
  const [chipEdge, setChipEdge] = useState({ left: false, right: false })
  const didNudgeRef = useRef(false)

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

    // 가로 스크롤 가능함을 한 번 살짝 보여줌
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!reduceMotion && !didNudgeRef.current) {
      didNudgeRef.current = true
      const nudge = window.setTimeout(() => {
        if (el.scrollWidth <= el.clientWidth + 4) return
        el.scrollTo({ left: 56, behavior: 'smooth' })
        window.setTimeout(() => {
          el.scrollTo({ left: 0, behavior: 'smooth' })
        }, 520)
      }, 480)
      return () => {
        ro.disconnect()
        window.removeEventListener('resize', updateChipScrollHint)
        window.clearTimeout(nudge)
      }
    }

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateChipScrollHint)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchHousingListings().then((listings) => {
      if (!cancelled) setLivePosts(listings)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const mockPosts = useMemo(() => listMockHousingPosts(), [])
  const posts = useMemo(
    () => mergeMockAndLiveHousingListings(mockPosts, livePosts),
    [livePosts, mockPosts],
  )

  const filteredPosts = useMemo(() => {
    return posts.filter((listing) => {
      const matchUnit =
        listingKind !== 'unit' ||
        unitType === 'all' ||
        getListingUnitType(listing) === unitType
      const matchRoom =
        listingKind !== 'room' ||
        roomType === 'all' ||
        housingMatchesRoomType(listing, roomType)
      const matchArea =
        neighborhood === 'all' || getListingArea(listing) === neighborhood
      const matchPerks =
        perks.length === 0 ||
        perks.every((perk) => housingMatchesPerk(listing, perk))
      const matchPrice = housingMatchesPrice(
        listing,
        listingKind,
        priceMin,
        priceMax,
        roomType,
      )
      return matchUnit && matchRoom && matchArea && matchPerks && matchPrice
    })
  }, [
    posts,
    listingKind,
    unitType,
    roomType,
    neighborhood,
    perks,
    priceMin,
    priceMax,
  ])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (listingKind !== 'all') count += 1
    if (listingKind === 'unit' && unitType !== 'all') count += 1
    if (listingKind === 'room' && roomType !== 'all') count += 1
    if (neighborhood !== 'all') count += 1
    if (isHousingPriceFilterActive(listingKind, priceMin, priceMax)) count += 1
    count += perks.length
    return count
  }, [
    listingKind,
    unitType,
    roomType,
    neighborhood,
    perks,
    priceMin,
    priceMax,
  ])

  const neighborhoodOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const area of HOUSING_NEIGHBORHOODS) counts[area] = 0
    for (const listing of posts) {
      counts[getListingArea(listing)] =
        (counts[getListingArea(listing)] ?? 0) + 1
    }
    const withPosts = HOUSING_NEIGHBORHOODS.filter((area) => counts[area] > 0)
    const withoutPosts = HOUSING_NEIGHBORHOODS.filter(
      (area) => counts[area] === 0,
    )
    return { ordered: [...withPosts, ...withoutPosts], counts }
  }, [posts])

  const summaryLabel = useMemo(() => {
    const parts: string[] = []
    if (listingKind === 'unit') parts.push('전체 유닛')
    if (listingKind === 'room') parts.push('개인 방')
    if (listingKind === 'unit' && unitType !== 'all') {
      parts.push(getHousingUnitTypeLabel(unitType))
    }
    if (listingKind === 'room' && roomType !== 'all') {
      parts.push(getHousingRoomTypeLabel(roomType))
    }
    if (neighborhood !== 'all') parts.push(neighborhood)
    const priceLabel = formatHousingPriceFilterLabel(
      listingKind,
      priceMin,
      priceMax,
    )
    if (priceLabel) parts.push(priceLabel)
    for (const perk of perks) {
      const label = HOUSING_PERKS.find((item) => item.id === perk)?.label
      if (label) parts.push(label)
    }
    if (parts.length === 0) return `등록 매물 ${filteredPosts.length}개`
    return `${parts.join(' · ')} · ${filteredPosts.length}개`
  }, [
    listingKind,
    unitType,
    roomType,
    neighborhood,
    perks,
    priceMin,
    priceMax,
    filteredPosts.length,
  ])

  function applyListingKind(
    next: ListingKindFilter,
    target: 'applied' | 'draft',
  ) {
    const range = defaultPriceRange(next)
    if (target === 'applied') {
      setListingKind(next)
      setUnitType('all')
      setRoomType('all')
      setPriceMin(range.min)
      setPriceMax(range.max)
      return
    }
    setDraftListingKind(next)
    setDraftUnitType('all')
    setDraftRoomType('all')
    setDraftPriceMin(range.min)
    setDraftPriceMax(range.max)
  }

  function openFilters() {
    setDraftListingKind(listingKind)
    setDraftUnitType(unitType)
    setDraftRoomType(roomType)
    setDraftNeighborhood(neighborhood)
    setDraftPerks(perks)
    setDraftPriceMin(priceMin)
    setDraftPriceMax(priceMax)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setListingKind(draftListingKind)
    setUnitType(draftListingKind === 'unit' ? draftUnitType : 'all')
    setRoomType(draftListingKind === 'room' ? draftRoomType : 'all')
    setNeighborhood(draftNeighborhood)
    setPerks(draftPerks)
    setPriceMin(draftPriceMin)
    setPriceMax(draftPriceMax)
    setFiltersOpen(false)
  }

  function clearAllFilters() {
    const range = defaultPriceRange('all')
    setListingKind('all')
    setUnitType('all')
    setRoomType('all')
    setNeighborhood('all')
    setPerks([])
    setPriceMin(range.min)
    setPriceMax(range.max)
    setDraftListingKind('all')
    setDraftUnitType('all')
    setDraftRoomType('all')
    setDraftNeighborhood('all')
    setDraftPerks([])
    setDraftPriceMin(range.min)
    setDraftPriceMax(range.max)
  }

  function toggleQuickPerk(id: HousingPerkId) {
    setPerks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function toggleQuickListingKind(kind: HousingListingKind) {
    applyListingKind(listingKind === kind ? 'all' : kind, 'applied')
  }

  function toggleQuickPrice(min: number, max: number) {
    if (listingKind === 'all') return
    const bounds = getHousingPriceBounds(listingKind)
    const active = priceMin === min && priceMax === max
    setPriceMin(active ? bounds.min : min)
    setPriceMax(active ? bounds.max : max)
  }

  function toggleDraftPerk(id: HousingPerkId) {
    setDraftPerks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const draftResultCount = useMemo(() => {
    return posts.filter((listing) => {
      const matchUnit =
        draftListingKind !== 'unit' ||
        draftUnitType === 'all' ||
        getListingUnitType(listing) === draftUnitType
      const matchRoom =
        draftListingKind !== 'room' ||
        draftRoomType === 'all' ||
        housingMatchesRoomType(listing, draftRoomType)
      const matchArea =
        draftNeighborhood === 'all' ||
        getListingArea(listing) === draftNeighborhood
      const matchPerks =
        draftPerks.length === 0 ||
        draftPerks.every((perk) => housingMatchesPerk(listing, perk))
      const matchPrice = housingMatchesPrice(
        listing,
        draftListingKind,
        draftPriceMin,
        draftPriceMax,
        draftRoomType,
      )
      return matchUnit && matchRoom && matchArea && matchPerks && matchPrice
    }).length
  }, [
    posts,
    draftListingKind,
    draftUnitType,
    draftRoomType,
    draftNeighborhood,
    draftPerks,
    draftPriceMin,
    draftPriceMax,
  ])

  const pricePresets =
    listingKind === 'all' ? [] : getHousingPricePresets(listingKind)
  const draftPriceBounds =
    draftListingKind === 'all'
      ? getHousingPriceBounds('unit')
      : getHousingPriceBounds(draftListingKind)
  const draftPricePresets =
    draftListingKind === 'all' ? [] : getHousingPricePresets(draftListingKind)
  const activePricePreset = getHousingPricePresetId(
    listingKind,
    priceMin,
    priceMax,
  )
  const draftPricePreset = getHousingPricePresetId(
    draftListingKind,
    draftPriceMin,
    draftPriceMax,
  )

  return (
    <div className='flex flex-1 flex-col bg-[#f7f8fa]'>
      <header className='mx-auto w-full max-w-7xl px-4 pb-3 pt-6 sm:px-6 sm:pb-4 sm:pt-8 lg:px-8 lg:pt-9'>
        <h1 className='sr-only'>하우징</h1>
        <p className='text-[11px] font-medium tracking-[0.16em] text-[var(--muted)] sm:text-[10px] sm:tracking-[0.2em]'>
          <Link href='/nyc' className='hover:text-[#F64310]'>
            NYC
          </Link>{' '}
          / 하우징
        </p>

        {/* Airbnb-style filter bar */}
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
            {activeFilterCount > 0 && (
              <span className='inline-flex min-w-4.5 items-center justify-center rounded-full bg-[var(--foreground)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white'>
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className='hidden h-6 w-px shrink-0 bg-[#dddddd] sm:block' aria-hidden />

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
                {HOUSING_LISTING_KINDS.map((kind) => (
                  <QuickChip
                    key={kind.id}
                    label={kind.label}
                    active={listingKind === kind.id}
                    onClick={() => toggleQuickListingKind(kind.id)}
                  />
                ))}
                {pricePresets.map((preset) => (
                  <QuickChip
                    key={preset.id}
                    label={preset.label}
                    active={activePricePreset === preset.id}
                    onClick={() => toggleQuickPrice(preset.min, preset.max)}
                  />
                ))}
                {HOUSING_PERKS.map((perk) => (
                  <QuickChip
                    key={perk.id}
                    label={perk.label}
                    active={perks.includes(perk.id)}
                    onClick={() => toggleQuickPerk(perk.id)}
                  />
                ))}
              </div>
            </div>

            {chipEdge.left && (
              <div className='pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center'>
                <div
                  aria-hidden
                  className='absolute inset-y-0 left-0 w-8 bg-[#f7f8fa]'
                />
                <div
                  aria-hidden
                  className='absolute inset-y-0 left-7 right-0 bg-gradient-to-r from-[#f7f8fa] to-transparent'
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
            )}

            {chipEdge.right && (
              <div className='pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end'>
                <div
                  aria-hidden
                  className='absolute inset-y-0 right-0 w-8 bg-[#f7f8fa]'
                />
                <div
                  aria-hidden
                  className='absolute inset-y-0 right-7 left-0 bg-gradient-to-l from-[#f7f8fa] to-transparent'
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
            )}
          </div>
        </div>
      </header>

      <section className='mx-auto w-full max-w-7xl flex-1 px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8 lg:pb-16'>
        {filteredPosts.length === 0 ? (
          <div className='rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-black/[0.04]'>
            <p className='text-[15px] font-semibold text-[var(--foreground)]'>
              조건에 맞는 매물이 없어요
            </p>
            <p className='mt-1.5 text-[14px] text-[var(--muted-foreground)] sm:text-[13px]'>
              필터를 바꿔 다시 검색해 보세요.
            </p>
            <button
              type='button'
              onClick={clearAllFilters}
              className='mt-5 inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-[14px] font-semibold text-white touch-manipulation sm:text-[13px]'
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <>
            <p className='mb-3 text-[13px] text-[var(--muted)] sm:mb-3.5 sm:text-[12px]'>
              {summaryLabel}
            </p>
            <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-3.5'>
              {filteredPosts.map((listing) => (
                <HousingPostCard
                  key={listing.id}
                  listing={listing}
                  highlightRoomType={
                    listingKind === 'room' ? roomType : 'all'
                  }
                />
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
                setDraftListingKind('all')
                setDraftUnitType('all')
                setDraftRoomType('all')
                setDraftNeighborhood('all')
                setDraftPerks([])
                setDraftPriceMin(getHousingPriceBounds('unit').min)
                setDraftPriceMax(getHousingPriceBounds('unit').max)
              }}
              className='text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-2 touch-manipulation'
            >
              전체 해제
            </button>
            <button
              type='button'
              onClick={applyFilters}
              className='inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-[var(--foreground)] px-5 text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--navy-light)]'
            >
              매물 {draftResultCount}개 보기
            </button>
          </div>
        }
      >
        <div className='space-y-7 overflow-x-hidden px-3 pb-2'>
            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                무엇을 찾으세요?
              </h4>
              <div className='mt-3 grid grid-cols-2 gap-2'>
                {HOUSING_LISTING_KINDS.map((kind) => {
                  const active = draftListingKind === kind.id
                  return (
                    <button
                      key={kind.id}
                      type='button'
                      onClick={() =>
                        applyListingKind(
                          active ? 'all' : kind.id,
                          'draft',
                        )
                      }
                      className={cn(
                        'rounded-2xl border px-3.5 py-3 text-left touch-manipulation transition',
                        active
                          ? 'border-[var(--foreground)] bg-white'
                          : 'border-[#dddddd] bg-white hover:border-[#b0b0b0]',
                      )}
                    >
                      <span className='block text-[13px] font-semibold text-[var(--foreground)]'>
                        {kind.label}
                      </span>
                      <span className='mt-0.5 block text-[11px] leading-snug text-[var(--muted)]'>
                        {kind.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {draftListingKind === 'unit' && (
              <>
                <section>
                  <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                    유닛 타입
                  </h4>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <SheetChip
                      label='전체'
                      active={draftUnitType === 'all'}
                      onClick={() => setDraftUnitType('all')}
                    />
                    {HOUSING_UNIT_TYPES.map((type) => (
                      <SheetChip
                        key={type.id}
                        label={type.label}
                        active={draftUnitType === type.id}
                        onClick={() => setDraftUnitType(type.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                    가격
                  </h4>
                  <p className='mt-1 text-[12px] text-[var(--muted)]'>
                    유닛 전체 월세
                  </p>
                  <RangeSlider
                    className='mt-4 px-1'
                    min={draftPriceBounds.min}
                    max={draftPriceBounds.max}
                    step={HOUSING_PRICE_STEP}
                    valueMin={draftPriceMin}
                    valueMax={draftPriceMax}
                    onChange={({ min, max }) => {
                      setDraftPriceMin(min)
                      setDraftPriceMax(max)
                    }}
                    formatValue={(value) =>
                      value >= draftPriceBounds.max
                        ? `$${value.toLocaleString()}+`
                        : `$${value.toLocaleString()}`
                    }
                  />
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {draftPricePresets.map((preset) => (
                      <SheetChip
                        key={preset.id}
                        label={preset.label}
                        active={draftPricePreset === preset.id}
                        onClick={() => {
                          if (draftPricePreset === preset.id) {
                            setDraftPriceMin(draftPriceBounds.min)
                            setDraftPriceMax(draftPriceBounds.max)
                            return
                          }
                          setDraftPriceMin(preset.min)
                          setDraftPriceMax(preset.max)
                        }}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}

            {draftListingKind === 'room' && (
              <>
                <section>
                  <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                    룸 타입
                  </h4>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <SheetChip
                      label='전체'
                      active={draftRoomType === 'all'}
                      onClick={() => setDraftRoomType('all')}
                    />
                    {HOUSING_ROOM_TYPES.map((type) => (
                      <SheetChip
                        key={type.id}
                        label={type.label}
                        active={draftRoomType === type.id}
                        onClick={() => setDraftRoomType(type.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                    가격
                  </h4>
                  <p className='mt-1 text-[12px] text-[var(--muted)]'>
                    룸 월세
                  </p>
                  <RangeSlider
                    className='mt-4 px-1'
                    min={draftPriceBounds.min}
                    max={draftPriceBounds.max}
                    step={HOUSING_PRICE_STEP}
                    valueMin={draftPriceMin}
                    valueMax={draftPriceMax}
                    onChange={({ min, max }) => {
                      setDraftPriceMin(min)
                      setDraftPriceMax(max)
                    }}
                    formatValue={(value) =>
                      value >= draftPriceBounds.max
                        ? `$${value.toLocaleString()}+`
                        : `$${value.toLocaleString()}`
                    }
                  />
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {draftPricePresets.map((preset) => (
                      <SheetChip
                        key={preset.id}
                        label={preset.label}
                        active={draftPricePreset === preset.id}
                        onClick={() => {
                          if (draftPricePreset === preset.id) {
                            setDraftPriceMin(draftPriceBounds.min)
                            setDraftPriceMax(draftPriceBounds.max)
                            return
                          }
                          setDraftPriceMin(preset.min)
                          setDraftPriceMax(preset.max)
                        }}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                혜택
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                {HOUSING_BENEFIT_PERKS.map((perkId) => {
                  const perk = HOUSING_PERKS.find((item) => item.id === perkId)
                  if (!perk) return null
                  return (
                    <SheetChip
                      key={perk.id}
                      label={perk.label}
                      active={draftPerks.includes(perk.id)}
                      onClick={() => toggleDraftPerk(perk.id)}
                    />
                  )
                })}
              </div>
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                어메니티
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                {HOUSING_AMENITY_PERKS.map((perkId) => {
                  const perk = HOUSING_PERKS.find((item) => item.id === perkId)
                  if (!perk) return null
                  return (
                    <SheetChip
                      key={perk.id}
                      label={perk.label}
                      active={draftPerks.includes(perk.id)}
                      onClick={() => toggleDraftPerk(perk.id)}
                    />
                  )
                })}
              </div>
            </section>

            <section>
              <h4 className='text-[15px] font-semibold text-[var(--foreground)]'>
                지역
              </h4>
              <div className='mt-3 flex flex-wrap gap-2'>
                <SheetChip
                  label='전체'
                  active={draftNeighborhood === 'all'}
                  onClick={() => setDraftNeighborhood('all')}
                />
                {neighborhoodOptions.ordered.map((area) => (
                  <SheetChip
                    key={area}
                    label={`${area}${
                      neighborhoodOptions.counts[area]
                        ? ` · ${neighborhoodOptions.counts[area]}`
                        : ''
                    }`}
                    active={draftNeighborhood === area}
                    onClick={() => setDraftNeighborhood(area)}
                  />
                ))}
              </div>
            </section>
          </div>
      </BottomSheet>
    </div>
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
          : 'border-[#dddddd] bg-white text-[var(--foreground)] hover:border-[#b0b0b0]',
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
