'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { usePagedGallery } from '@hooks/usePagedGallery'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import {
  formatHousingAvailableDate,
  formatListingBedBath,
  formatPropertyAmenityFee,
  formatPropertyIncomeRequirements,
  findListingRoomByKey,
  getHousingRoomLabel,
  getHousingRoomNet,
  getListingAmenityPerks,
  getListingArea,
  getListingCardBadges,
  getListingDisplayAddress,
  getListingImages,
  getListingUnitNet,
  getListingUnitRent,
  getListingAvailableDate,
  getListingYoutubeUrl,
  getMockHousingListing,
  getPricedRooms,
  getRoomSelectionKey,
  shouldShowListingRoomRows,
  sortHousingRooms,
} from '@lib/constants/housingMock'
import { fetchHousingListing, shouldUnoptimizeHousingImage } from '@lib/housing/fetchListings'
import { KAKAO_INQUIRY_URL } from '@lib/constants/nyc'
import { cn } from '@lib'
import type { HousingListing, HousingRoom } from '@/types/nyc'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { PerkBadge } from '@widgets/nyc/HousingPostCard'
import { HousingLocationMap } from '@widgets/nyc/HousingLocationMap'
import { HousingRoommateIntro } from '@widgets/nyc/HousingRoommateIntro'
import { LoadingState, SchoolBadge } from '@components'

interface HousingDetailScreenProps {
  postId: string
}

export function HousingDetailScreen({ postId }: HousingDetailScreenProps) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const searchParams = useSearchParams()
  const roomParam = searchParams.get('room')
  const mockListing = useMemo(
    () => getMockHousingListing(postId) ?? null,
    [postId],
  )
  const [liveListing, setLiveListing] = useState<HousingListing | null>(null)
  const [loadingLive, setLoadingLive] = useState(!postId.startsWith('mock-'))
  const listing = liveListing ?? mockListing
  const [userRoomKey, setUserRoomKey] = useState<{
    postId: string
    roomParam: string | null
    roomKey: string
  } | null>(null)
  const images = listing ? getListingImages(listing) : []
  const {
    ref: galleryScrollRef,
    index: activeImage,
    goTo: goToGallery,
    pointerHandlers: galleryPointerHandlers,
  } = usePagedGallery(images.length, postId)
  const thumbScrollRef = useRef<HTMLDivElement>(null)
  const [thumbEdge, setThumbEdge] = useState({ left: false, right: false })

  useEffect(() => {
    let cancelled = false
    if (postId.startsWith('mock-')) {
      setLiveListing(null)
      setLoadingLive(false)
      return
    }
    setLoadingLive(true)
    void fetchHousingListing(postId)
      .then((next) => {
        if (cancelled) return
        setLiveListing(next)
      })
      .finally(() => {
        if (!cancelled) setLoadingLive(false)
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  function updateThumbScrollHint() {
    const el = thumbScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setThumbEdge({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    })
  }

  function scrollThumbs(direction: 'left' | 'right') {
    const el = thumbScrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === 'right' ? 160 : -160,
      behavior: 'smooth',
    })
  }

  function goToImage(index: number) {
    goToGallery(index, { wrap: true })
  }

  const roomRows = useMemo(() => {
    if (!listing) return []
    return sortHousingRooms(getPricedRooms(listing))
  }, [listing])

  const resolvedRoomKey = useMemo(() => {
    if (
      userRoomKey?.postId === postId &&
      userRoomKey.roomParam === roomParam
    ) {
      return userRoomKey.roomKey
    }
    if (!listing) return null
    const fromQuery = findListingRoomByKey(listing, roomParam)
    if (fromQuery) {
      const index = roomRows.findIndex((room) => room === fromQuery)
      return getRoomSelectionKey(fromQuery, index >= 0 ? index : 0)
    }
    const first = roomRows[0]
    return first ? getRoomSelectionKey(first, 0) : null
  }, [listing, postId, roomParam, roomRows, userRoomKey])

  useEffect(() => {
    updateThumbScrollHint()
    const el = thumbScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(updateThumbScrollHint)
    ro.observe(el)
    window.addEventListener('resize', updateThumbScrollHint)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateThumbScrollHint)
    }
  }, [listing?.id, images.length])

  useEffect(() => {
    const el = thumbScrollRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>(
      `[data-thumb-index="${activeImage}"]`,
    )
    if (!active) return
    const left = active.offsetLeft
    const right = left + active.offsetWidth
    const viewLeft = el.scrollLeft
    const viewRight = viewLeft + el.clientWidth
    const pad = 16
    if (left < viewLeft + pad) {
      el.scrollTo({ left: Math.max(0, left - pad), behavior: 'smooth' })
    } else if (right > viewRight - 56) {
      el.scrollTo({
        left: right - el.clientWidth + 56,
        behavior: 'smooth',
      })
    }
    updateThumbScrollHint()
  }, [activeImage])

  const selectedRoom: HousingRoom | null = useMemo(() => {
    if (!listing) return null
    if (resolvedRoomKey) {
      return (
        findListingRoomByKey(listing, resolvedRoomKey) ?? roomRows[0] ?? null
      )
    }
    return roomRows[0] ?? null
  }, [listing, roomRows, resolvedRoomKey])

  async function handleClose() {
    if (!listing || !user || listing.id.startsWith('mock-')) return
    toastError('Supabase 연동 후 이용할 수 있어요')
  }

  function handleKakaoInquiry() {
    if (!KAKAO_INQUIRY_URL) {
      toastError('카카오톡 문의 링크를 준비 중이에요')
      return
    }
    window.open(KAKAO_INQUIRY_URL, '_blank', 'noopener,noreferrer')
  }

  async function handleShare() {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(window.location.href)
      success('주소를 복사했어요')
    } catch {
      toastError('주소 복사에 실패했어요')
    }
  }

  if (loadingLive && !listing) {
    return <LoadingState fullPage />
  }

  if (!listing || listing.status === 'closed') {
    return (
      <div className='mx-auto max-w-3xl px-4 py-12'>
        <EmptyState
          title='게시글을 찾을 수 없습니다'
          description='마감되었거나 삭제된 하우징 글일 수 있습니다.'
          actionHref='/nyc/housing'
          actionLabel='하우징 목록으로'
        />
      </div>
    )
  }

  const isAuthor =
    user?.uid === listing.authorUid && !listing.id.startsWith('mock-')
  const displayAddress = getListingDisplayAddress(listing)
  const area = getListingArea(listing)
  const unitRent = getListingUnitRent(listing)
  const unitNet = getListingUnitNet(listing)
  const availableDate = getListingAvailableDate(listing)
  const youtubeUrl = getListingYoutubeUrl(listing)
  const amenityPerks = getListingAmenityPerks(listing)
  const benefitBadges = getListingCardBadges(listing)
  const hasAmenities = amenityPerks.length > 0
  const showRoomRows = shouldShowListingRoomRows(listing)
  const mailSubject = encodeURIComponent(`[Misaeng Housing] ${displayAddress}`)
  const mailHref = `mailto:${listing.contactEmail}?subject=${mailSubject}`
  const { property, unit } = listing

  return (
    <div className='flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_48%,#ffffff_100%)]'>
      <article className='mx-auto w-full max-w-7xl px-4 pt-7 pb-14 sm:px-6 sm:py-10 lg:px-8 lg:py-12'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          <Link href='/nyc/housing' className='hover:text-[#F64310]'>
            하우징
          </Link>
          {' / '}
          {area}
        </p>

        <div className='mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10'>
          <div className='min-w-0'>
            <div className='relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#eef0f3] ring-1 ring-black/[0.04] sm:aspect-[16/11]'>
              {images.length > 0 ? (
                <div
                  ref={galleryScrollRef}
                  {...galleryPointerHandlers}
                  className='flex h-full snap-x snap-proximity overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                >
                  {images.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className='relative h-full w-full min-w-full shrink-0 snap-start'
                    >
                      <Image
                        src={src}
                        alt=''
                        fill
                        priority={index === 0}
                        draggable={false}
                        unoptimized={shouldUnoptimizeHousingImage(src)}
                        className='object-cover'
                        sizes='(max-width: 1024px) 100vw, 55vw'
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className='flex h-full items-center justify-center text-sm text-[var(--muted)]'>
                  등록된 사진이 없어요
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type='button'
                    aria-label='이전 사진'
                    onClick={() => goToImage(activeImage - 1)}
                    className='absolute left-3 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[var(--foreground)] shadow-md touch-manipulation transition hover:bg-white sm:left-4 sm:size-10'
                  >
                    <ChevronIcon className='size-4 rotate-180 sm:size-[1.1rem]' />
                  </button>
                  <button
                    type='button'
                    aria-label='다음 사진'
                    onClick={() => goToImage(activeImage + 1)}
                    className='absolute right-3 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[var(--foreground)] shadow-md touch-manipulation transition hover:bg-white sm:right-4 sm:size-10'
                  >
                    <ChevronIcon className='size-4 sm:size-[1.1rem]' />
                  </button>
                </>
              )}

              <div className='absolute bottom-3 right-3 z-10 flex items-center gap-1.5 sm:bottom-4 sm:right-4'>
                {youtubeUrl ? (
                  <a
                    href={youtubeUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white touch-manipulation transition hover:bg-black/70'
                  >
                    <YoutubePlayIcon className='size-3 shrink-0 text-[#FF0000]' />
                    영상 보기
                  </a>
                ) : null}
                {images.length > 1 ? (
                  <p className='rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white'>
                    {activeImage + 1} / {images.length}
                  </p>
                ) : null}
              </div>
            </div>

            {images.length > 1 && (
              <div className='relative mt-3'>
                <div
                  ref={thumbScrollRef}
                  onScroll={updateThumbScrollHint}
                  className='overflow-x-auto overflow-y-hidden scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                >
                  <div className='flex w-max gap-2.5 pr-12'>
                    {images.map((src, index) => {
                      const active = activeImage === index
                      return (
                        <button
                          key={`${src}-${index}`}
                          type='button'
                          data-thumb-index={index}
                          onClick={() => goToImage(index)}
                          className={cn(
                            'relative h-16 w-20 shrink-0 rounded-xl border-2 p-0.5 touch-manipulation transition sm:h-[4.5rem] sm:w-24',
                            active
                              ? 'border-[#F64310]'
                              : 'border-transparent opacity-80 hover:opacity-100',
                          )}
                          aria-label={`사진 ${index + 1}`}
                          aria-pressed={active}
                        >
                          <span className='relative block h-full w-full overflow-hidden rounded-[10px]'>
                            <Image
                              src={src}
                              alt=''
                              fill
                              unoptimized={shouldUnoptimizeHousingImage(src)}
                              className='object-cover'
                              sizes='96px'
                            />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {thumbEdge.left && (
                  <div className='pointer-events-none absolute inset-y-[-2px] left-0 z-10 flex w-[4.25rem] items-center'>
                    <div
                      aria-hidden
                      className='absolute inset-0 bg-gradient-to-r from-[#f4f5f7] from-[12%] via-[#f4f5f7]/80 via-[48%] to-transparent'
                    />
                    <button
                      type='button'
                      aria-label='이전 썸네일 보기'
                      onClick={() => scrollThumbs('left')}
                      className='pointer-events-auto relative ml-1 inline-flex size-7 items-center justify-center rounded-full border border-black/[0.06] bg-white/95 text-[var(--foreground)] shadow-[0_2px_10px_rgba(15,23,42,0.12)] backdrop-blur-[2px] touch-manipulation transition hover:bg-white'
                    >
                      <ChevronIcon className='size-3.5 rotate-180' />
                    </button>
                  </div>
                )}

                {thumbEdge.right && (
                  <div className='pointer-events-none absolute inset-y-[-2px] right-0 z-10 flex w-[4.25rem] items-center justify-end'>
                    <div
                      aria-hidden
                      className='absolute inset-0 bg-gradient-to-l from-[#f4f5f7] from-[12%] via-[#f4f5f7]/80 via-[48%] to-transparent'
                    />
                    <button
                      type='button'
                      aria-label='더 많은 썸네일 보기'
                      onClick={() => scrollThumbs('right')}
                      className='pointer-events-auto relative mr-1 inline-flex size-7 items-center justify-center rounded-full border border-black/[0.06] bg-white/95 text-[var(--foreground)] shadow-[0_2px_10px_rgba(15,23,42,0.12)] backdrop-blur-[2px] touch-manipulation transition hover:bg-white'
                    >
                      <ChevronIcon className='size-3.5' />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className='mt-6 hidden space-y-4 lg:block'>
              {listing.roommateWaiting && (
                <HousingRoommateIntro roommate={listing.roommateWaiting} />
              )}
              <HousingPropertySection listing={listing} />
              <HousingLocationMap
                address={displayAddress}
                neighborhood={area}
              />
            </div>
          </div>

          <div className='min-w-0 lg:pt-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='min-w-0 text-[1.5rem] font-bold leading-snug tracking-tight text-[var(--foreground)] sm:text-[1.85rem]'>
                {displayAddress}
              </h1>
              {listing.authorSchoolId ? (
                <SchoolBadge schoolId={listing.authorSchoolId} />
              ) : null}
            </div>

            <p className='mt-3 text-[1.35rem] font-semibold tracking-tight text-[#F64310]'>
              ${unitRent.toLocaleString()}
              <span className='text-base font-medium text-[#F64310]/75'>
                /월
              </span>
              {unitNet != null ? (
                <span className='ml-2 text-[15px] font-medium tabular-nums text-[var(--muted)]'>
                  / ${unitNet.toLocaleString()}
                </span>
              ) : null}
              <span className='ml-2 text-[13px] font-medium text-[var(--muted)]'>
                · {formatListingBedBath(listing)}
              </span>
            </p>

            {benefitBadges.length > 0 && (
              <div className='mt-4'>
                <p className='text-[12px] font-semibold text-[var(--muted)]'>
                  혜택
                </p>
                <div className='mt-2 flex flex-wrap gap-1.5'>
                  {benefitBadges.map((badge) => (
                    <PerkBadge key={badge.key} label={badge.label} />
                  ))}
                </div>
              </div>
            )}

            {showRoomRows && (
              <div className='mt-4'>
                <p className='text-[12px] font-semibold text-[var(--muted)]'>
                  룸 옵션
                </p>
                <div className='mt-2 space-y-1.5'>
                  {roomRows.map((room, index) => {
                    const roomKey = getRoomSelectionKey(room, index)
                    const active = roomKey === resolvedRoomKey
                    const roomNet = getHousingRoomNet(listing, room)
                    return (
                      <button
                        key={roomKey}
                        type='button'
                        onClick={() =>
                          setUserRoomKey({ postId, roomParam, roomKey })
                        }
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left touch-manipulation transition ring-1',
                          active
                            ? 'bg-white ring-[var(--foreground)]'
                            : 'bg-white/70 ring-black/[0.04] hover:ring-black/[0.08]',
                        )}
                      >
                        <span className='min-w-0'>
                          <span className='block text-[14px] font-semibold text-[var(--foreground)]'>
                            {getHousingRoomLabel(room)}
                          </span>
                          <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>
                            입주 {formatHousingAvailableDate(availableDate) || '미정'}
                          </span>
                        </span>
                        <span className='text-right text-[14px] font-semibold tabular-nums text-[var(--foreground)]'>
                          ${room.price.toLocaleString()}
                          <span className='font-medium text-[var(--muted)]'>
                            /월
                          </span>
                          {roomNet != null ? (
                            <span className='mt-0.5 block text-[12px] font-medium text-[var(--muted)]'>
                              ${roomNet.toLocaleString()}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {listing.roommateWaiting && (
              <div className='mt-4 lg:hidden'>
                <HousingRoommateIntro roommate={listing.roommateWaiting} />
              </div>
            )}

            {hasAmenities && (
              <div className='mt-4'>
                <p className='text-[12px] font-semibold text-[var(--muted)]'>
                  어메니티
                </p>
                <div className='mt-2 flex flex-wrap gap-1.5'>
                  {amenityPerks.map((perk) => (
                    <PerkBadge key={perk} perk={perk} />
                  ))}
                </div>
              </div>
            )}

            <dl className='mt-5 grid grid-cols-2 gap-3 text-sm'>
              <DetailStat label='지역' value={area} />
              <DetailStat
                label='유닛 전체'
                value={
                  unitNet != null
                    ? `$${unitRent.toLocaleString()} / $${unitNet.toLocaleString()}/월`
                    : `$${unitRent.toLocaleString()}/월`
                }
              />
              <DetailStat
                label='룸 타입'
                value={selectedRoom ? getHousingRoomLabel(selectedRoom) : '미정'}
              />
              <DetailStat
                label='입주 가능일'
                value={formatHousingAvailableDate(availableDate) || '미정'}
              />
              <DetailStat
                label='상태'
                value={unit.available ? '모집 중' : '마감'}
              />
            </dl>

            <div className='mt-6 space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/[0.05]'>
              <p className='text-[11px] font-medium tracking-[0.14em] text-[var(--muted)]'>
                상세 설명
              </p>
              <p className='whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
                {listing.description}
              </p>
            </div>

            <div className='mt-5 lg:hidden'>
              <HousingPropertySection listing={listing} className='mb-4' />
              <HousingLocationMap
                address={displayAddress}
                neighborhood={area}
              />
            </div>

            <div className='mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-stretch'>
              <a
                href={mailHref}
                className='inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-[#F64310]/35 bg-[#F64310]/08 px-5 text-sm font-semibold text-[#c9360d] touch-manipulation transition hover:border-[#F64310]/50 hover:bg-[#F64310]/12'
              >
                이메일 문의
              </a>
              <button
                type='button'
                onClick={handleKakaoInquiry}
                className='inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-[#E8D84A] bg-[#FEE500]/85 px-5 text-sm font-semibold text-[#191919] touch-manipulation transition hover:bg-[#FEE500]'
              >
                카카오톡 문의
              </button>
              <button
                type='button'
                onClick={() => void handleShare()}
                className='inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] touch-manipulation transition hover:border-black/20 hover:bg-[#f7f8fa]'
              >
                공유하기
              </button>
            </div>

            {isAuthor && (
              <button
                type='button'
                onClick={() => void handleClose()}
                className='mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted-foreground)] touch-manipulation hover:border-red-300 hover:text-red-600 sm:w-auto'
              >
                게시 마감
              </button>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}

function HousingPropertySection({
  listing,
  className,
}: {
  listing: HousingListing
  className?: string
}) {
  const { property } = listing
  const amenityFeeLabel = formatPropertyAmenityFee(property)
  const incomeLabel = formatPropertyIncomeRequirements(property)
  const utilities = property.includedUtility ?? []
  const hasContent =
    property.subway.length > 0 ||
    property.amenities.length > 0 ||
    property.appliances.length > 0 ||
    utilities.length > 0 ||
    property.partWall ||
    amenityFeeLabel ||
    incomeLabel

  if (!hasContent) return null

  return (
    <section
      className={cn(
        'rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.05] sm:px-5 sm:py-5',
        className,
      )}
    >
      <h2 className='text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        건물 정보
      </h2>

      <dl className='mt-3 space-y-2.5 text-[13px]'>
        {property.zipcode ? (
          <PropertyRow label='우편번호' value={property.zipcode} />
        ) : null}
        {property.partWall ? (
          <PropertyRow label='벽 옵션' value={property.partWall} />
        ) : null}
        {amenityFeeLabel ? (
          <PropertyRow label='어메니티 Fee' value={amenityFeeLabel} />
        ) : null}
        {incomeLabel ? (
          <PropertyRow label='소득 요건' value={incomeLabel} />
        ) : null}
        {utilities.length > 0 ? (
          <PropertyRow label='포함 유틸' value={utilities.join(' · ')} />
        ) : null}
      </dl>

      {property.subway.length > 0 && (
        <PropertyList title='지하철' items={property.subway} />
      )}
      {property.amenities.length > 0 && (
        <PropertyList title='건물 어메니티' items={property.amenities} />
      )}
      {property.appliances.length > 0 && (
        <PropertyList title='가전/유닛' items={property.appliances} />
      )}
    </section>
  )
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex gap-3'>
      <dt className='w-24 shrink-0 text-[var(--muted)]'>{label}</dt>
      <dd className='min-w-0 font-medium text-[var(--foreground)]'>{value}</dd>
    </div>
  )
}

function PropertyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className='mt-4'>
      <p className='text-[12px] font-semibold text-[var(--muted)]'>{title}</p>
      <ul className='mt-2 flex flex-wrap gap-1.5'>
        {items.map((item) => (
          <li
            key={item}
            className='rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[12px] font-medium text-[var(--foreground)]'
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-white px-3.5 py-3 ring-1 ring-black/[0.04]'>
      <dt className='text-[11px] text-[var(--muted)]'>{label}</dt>
      <dd className='mt-0.5 text-[13px] font-semibold text-[var(--foreground)]'>
        {value}
      </dd>
    </div>
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

function YoutubePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.2 3.5-6.2 3.5z' />
    </svg>
  )
}
