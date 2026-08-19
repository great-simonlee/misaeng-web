'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { usePagedGallery } from '@hooks/usePagedGallery'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  formatHousingCreditOfferLabel,
  formatHousingAvailableRange,
  getHousingRoomOptionLabel,
  getHousingUnitTypeLabel,
  getMockHousingPost,
  HOUSING_AMENITY_PERKS,
  HOUSING_BENEFIT_PERKS,
  sortHousingRoomOptions,
} from '@lib/constants/housingMock'
import { KAKAO_INQUIRY_URL } from '@lib/constants/nyc'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { closeHousingPost, getHousingPost } from '@lib/firebase/housing'
import { cn } from '@lib'
import type { HousingPost, HousingRoomOption } from '@/types/nyc'
import { EmptyState } from '@widgets/nyc/EmptyState'
import {
  PerkBadge,
  RoommateCompositionBadge,
} from '@widgets/nyc/HousingPostCard'
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
  const [post, setPost] = useState<HousingPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const {
    ref: galleryScrollRef,
    index: activeImage,
    goTo: goToGallery,
    pointerHandlers: galleryPointerHandlers,
  } = usePagedGallery(post?.images.length ?? 0, postId)
  const thumbScrollRef = useRef<HTMLDivElement>(null)
  const [thumbEdge, setThumbEdge] = useState({ left: false, right: false })
  // const configured = isFirebaseConfigured()

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

  useEffect(() => {
    setLoading(true)
    setError(null)

    const mock = getMockHousingPost(postId)
    if (mock) {
      setPost(mock)
      setLoading(false)
      return
    }

    // 임시: 파이어베이스 하우징 상세 조회 비활성화
    setPost(null)
    setLoading(false)
  }, [postId])

  const roomOptions = useMemo(
    () => (post ? sortHousingRoomOptions(post.roomOptions) : []),
    [post],
  )

  useEffect(() => {
    if (!post) return
    const fromQuery = roomOptions.find((option) => option.id === roomParam)
    setSelectedOptionId(fromQuery?.id ?? roomOptions[0]?.id ?? null)
  }, [post, roomParam, roomOptions])

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
  }, [post?.id, post?.images.length])

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

  const selectedOption: HousingRoomOption | null = useMemo(() => {
    if (!selectedOptionId) return roomOptions[0] ?? null
    return (
      roomOptions.find((option) => option.id === selectedOptionId) ??
      roomOptions[0] ??
      null
    )
  }, [roomOptions, selectedOptionId])

  async function handleClose() {
    if (!post || !user || post.id.startsWith('mock-')) return
    // 임시: 파이어베이스 마감 비활성화
    toastError('Firebase가 일시적으로 비활성화되어 있어요')
    /*
    try {
      await closeHousingPost(post.id)
      setPost({ ...post, status: 'closed' })
      success('게시글을 마감했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '마감에 실패했어요'))
    }
    */
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

  if (loading) {
    return <LoadingState fullPage />
  }

  if (error || !post || post.status === 'closed') {
    return (
      <div className='mx-auto max-w-3xl px-4 py-12'>
        <EmptyState
          title='게시글을 찾을 수 없습니다'
          description={
            error ?? '마감되었거나 삭제된 하우징 글일 수 있습니다.'
          }
          actionHref='/nyc/housing'
          actionLabel='하우징 목록으로'
        />
      </div>
    )
  }

  const isAuthor = user?.uid === post.authorUid && !post.id.startsWith('mock-')
  const images = post.images
  const unitTypeLabel = post.unitType
    ? getHousingUnitTypeLabel(post.unitType)
    : '미정'
  const benefitPerks = post.perks.filter(
    (perk) =>
      HOUSING_BENEFIT_PERKS.includes(perk) &&
      perk !== 'free-credit' &&
      perk !== 'roommate-waiting',
  )
  const amenityPerks = post.perks.filter((perk) =>
    HOUSING_AMENITY_PERKS.includes(perk),
  )
  const hasBenefits = benefitPerks.length > 0 || Boolean(post.creditOffer)
  const hasAmenities = amenityPerks.length > 0
  const mailSubject = encodeURIComponent(`[Misaeng Housing] ${post.title}`)
  const mailHref = `mailto:${post.contactEmail}?subject=${mailSubject}`

  return (
    <div className='flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_48%,#ffffff_100%)]'>
      <article className='mx-auto w-full max-w-7xl px-4 pt-7 pb-14 sm:px-6 sm:py-10 lg:px-8 lg:py-12'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          <Link href='/nyc/housing' className='hover:text-[#F64310]'>
            하우징
          </Link>
          {' / '}
          {post.neighborhood}
        </p>

        <div className='mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10'>
          <div className='min-w-0'>
            <div className='relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#eef0f3] ring-1 ring-black/[0.04] sm:aspect-[16/11]'>
              {images.length > 0 ? (
                <div
                  ref={galleryScrollRef}
                  {...galleryPointerHandlers}
                  className='flex h-full touch-pan-y snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                >
                  {images.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className='relative h-full w-full min-w-full shrink-0 snap-start snap-always'
                    >
                      <Image
                        src={src}
                        alt=''
                        fill
                        priority={index === 0}
                        draggable={false}
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
                {post.youtubeUrl ? (
                  <a
                    href={post.youtubeUrl}
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

            {/* 데스크톱: 사진 아래 룸메이트 소개 + 지도 */}
            <div className='mt-6 hidden space-y-4 lg:block'>
              {post.roommateWaiting && (
                <HousingRoommateIntro roommate={post.roommateWaiting} />
              )}
              <HousingLocationMap
                address={post.title}
                neighborhood={post.neighborhood}
              />
            </div>
          </div>

          <div className='min-w-0 lg:pt-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='min-w-0 truncate text-[1.5rem] font-bold leading-snug tracking-tight text-[var(--foreground)] sm:text-[1.85rem]'>
                {post.title}
              </h1>
              <SchoolBadge schoolId={post.authorSchoolId} />
            </div>

            <p className='mt-3 text-[1.35rem] font-semibold tracking-tight text-[#F64310]'>
              ${post.unitRent.toLocaleString()}
              <span className='text-base font-medium text-[#F64310]/75'>
                /월
              </span>
              <span className='ml-2 text-[13px] font-medium text-[var(--muted)]'>
                · 유닛 전체
              </span>
            </p>

            {roomOptions.length > 1 && (
              <div className='mt-4'>
                <p className='text-[12px] font-semibold text-[var(--muted)]'>
                  룸 옵션
                </p>
                <div className='mt-2 space-y-1.5'>
                  {roomOptions.map((option) => {
                    const active = option.id === selectedOption?.id
                    return (
                      <button
                        key={option.id}
                        type='button'
                        onClick={() => setSelectedOptionId(option.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left touch-manipulation transition ring-1',
                          active
                            ? 'bg-white ring-[var(--foreground)]'
                            : 'bg-white/70 ring-black/[0.04] hover:ring-black/[0.08]',
                        )}
                      >
                        <span className='min-w-0'>
                          <span className='block text-[14px] font-semibold text-[var(--foreground)]'>
                            {getHousingRoomOptionLabel(option)}
                          </span>
                          <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>
                            입주{' '}
                            {formatHousingAvailableRange(
                              option.availableFrom,
                              option.availableTo,
                            ) || '미정'}
                          </span>
                        </span>
                        <span className='flex shrink-0 flex-col items-end gap-1'>
                          {option.roommateWaiting &&
                            option.roommateComposition && (
                              <RoommateCompositionBadge
                                composition={option.roommateComposition}
                                compact
                              />
                            )}
                          <span className='text-[14px] font-semibold tabular-nums text-[var(--foreground)]'>
                            ${option.rent.toLocaleString()}
                            <span className='font-medium text-[var(--muted)]'>
                              /월
                            </span>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {post.roommateWaiting && (
              <div className='mt-4 lg:hidden'>
                <HousingRoommateIntro roommate={post.roommateWaiting} />
              </div>
            )}

            {(hasBenefits || hasAmenities) && (
              <div className='mt-4 space-y-3.5'>
                {hasBenefits && (
                  <div>
                    <p className='text-[12px] font-semibold text-[var(--muted)]'>
                      혜택
                    </p>
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {benefitPerks.map((perk) => (
                        <PerkBadge key={perk} perk={perk} />
                      ))}
                      {post.creditOffer && (
                        <PerkBadge
                          label={formatHousingCreditOfferLabel(
                            post.creditOffer,
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}
                {hasAmenities && (
                  <div>
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
              </div>
            )}

            <dl className='mt-5 grid grid-cols-2 gap-3 text-sm'>
              <DetailStat label='지역' value={post.neighborhood} />
              <DetailStat label='유닛 타입' value={unitTypeLabel} />
              <DetailStat
                label='유닛 전체'
                value={`$${post.unitRent.toLocaleString()}/월`}
              />
              <DetailStat
                label='룸 타입'
                value={
                  selectedOption
                    ? getHousingRoomOptionLabel(selectedOption)
                    : '미정'
                }
              />
              <DetailStat
                label='입주 가능일'
                value={
                  selectedOption
                    ? formatHousingAvailableRange(
                        selectedOption.availableFrom,
                        selectedOption.availableTo,
                      ) || '미정'
                    : '미정'
                }
              />
              <DetailStat label='상태' value='모집 중' />
            </dl>

            <div className='mt-6 space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/[0.05]'>
              <p className='text-[11px] font-medium tracking-[0.14em] text-[var(--muted)]'>
                상세 설명
              </p>
              <p className='whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--muted-foreground)]'>
                {post.description}
              </p>
            </div>

            <div className='mt-5 lg:hidden'>
              <HousingLocationMap
                address={post.title}
                neighborhood={post.neighborhood}
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
