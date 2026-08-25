'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@lib'

export type PhotoLightboxItem = {
  id: string
  imageUrl: string
  caption?: string | null
}

type PhotoLightboxProps = {
  open: boolean
  items: PhotoLightboxItem[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
  /** 상단 작은 라벨 (예: 메뉴) */
  eyebrow?: string
}

type TrackSlide = PhotoLightboxItem & { trackKey: string }

/**
 * 전체 화면 사진 확대 — 가로 스냅 캐러셀 + 끝↔처음 루프
 */
export function PhotoLightbox({
  open,
  items,
  index,
  onClose,
  onIndexChange,
  eyebrow,
}: PhotoLightboxProps) {
  const count = items.length
  const looping = count > 1
  const safeIndex = count > 0 ? Math.min(Math.max(index, 0), count - 1) : 0

  const trackSlides = useMemo<TrackSlide[]>(() => {
    if (count === 0) return []
    if (!looping) {
      return items.map((item) => ({ ...item, trackKey: item.id }))
    }
    const first = items[0]
    const last = items[count - 1]
    return [
      { ...last, trackKey: `${last.id}__clone-prev` },
      ...items.map((item) => ({ ...item, trackKey: item.id })),
      { ...first, trackKey: `${first.id}__clone-next` },
    ]
  }, [items, count, looping])

  const scrollRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(safeIndex)
  const jumpingRef = useRef(false)
  const scrollingRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(safeIndex)

  const rawFromLogical = useCallback(
    (logical: number) => (looping ? logical + 1 : logical),
    [looping],
  )

  const logicalFromRaw = useCallback(
    (raw: number) => {
      if (!looping) {
        return Math.min(Math.max(raw, 0), Math.max(count - 1, 0))
      }
      if (raw <= 0) return count - 1
      if (raw >= count + 1) return 0
      return raw - 1
    },
    [looping, count],
  )

  const jumpToRaw = useCallback((raw: number) => {
    const el = scrollRef.current
    if (!el) return
    const width = el.clientWidth
    if (width <= 0) return
    jumpingRef.current = true
    el.scrollTo({ left: raw * width, behavior: 'auto' })
    requestAnimationFrame(() => {
      jumpingRef.current = false
    })
  }, [])

  const scrollToLogical = useCallback(
    (logical: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollRef.current
      if (!el || count <= 0) return
      const width = el.clientWidth
      if (width <= 0) return
      scrollingRef.current = behavior === 'smooth'
      el.scrollTo({
        left: rawFromLogical(logical) * width,
        behavior,
      })
      indexRef.current = logical
      setActiveIndex(logical)
      if (behavior === 'auto') scrollingRef.current = false
    },
    [count, rawFromLogical],
  )

  const goTo = useCallback(
    (next: number, behavior: ScrollBehavior = 'smooth') => {
      if (count <= 0) return
      const last = count - 1
      const from = indexRef.current
      const target = ((next % count) + count) % count
      const el = scrollRef.current
      const width = el?.clientWidth ?? 0

      onIndexChange(target)
      indexRef.current = target
      setActiveIndex(target)

      if (!el || width <= 0) return

      // 끝→처음 / 처음→끝: 클론으로 부드럽게 넘긴 뒤 scrollend에서 점프
      if (looping) {
        if (from === last && target === 0) {
          scrollingRef.current = true
          el.scrollTo({ left: (count + 1) * width, behavior })
          return
        }
        if (from === 0 && target === last) {
          scrollingRef.current = true
          el.scrollTo({ left: 0, behavior })
          return
        }
      }

      scrollingRef.current = behavior === 'smooth'
      el.scrollTo({
        left: rawFromLogical(target) * width,
        behavior,
      })
      if (behavior === 'auto') scrollingRef.current = false
    },
    [count, looping, onIndexChange, rawFromLogical],
  )

  const goPrev = useCallback(() => goTo(indexRef.current - 1), [goTo])
  const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo])

  useLayoutEffect(() => {
    if (!open) return
    indexRef.current = safeIndex
    setActiveIndex(safeIndex)
    jumpToRaw(rawFromLogical(safeIndex))
    // 오픈·아이템 교체 시에만 (스와이프 중 safeIndex 동기화로 끊기지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, jumpToRaw, rawFromLogical])

  // 외부 index 변경 (이미 스크롤/점프 중이면 무시)
  useEffect(() => {
    if (!open) return
    if (indexRef.current === safeIndex) return
    if (scrollingRef.current || jumpingRef.current) return
    scrollToLogical(safeIndex, 'smooth')
  }, [open, safeIndex, scrollToLogical])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, goPrev, goNext])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !open || count <= 1) return

    function applyLogical(logical: number) {
      if (logical === indexRef.current) return
      indexRef.current = logical
      setActiveIndex(logical)
      onIndexChange(logical)
    }

    function normalizeRaw(node: HTMLDivElement, width: number) {
      const raw = Math.round(node.scrollLeft / width)
      if (!looping) {
        return Math.min(Math.max(raw, 0), count - 1)
      }
      if (raw <= 0) {
        jumpToRaw(count)
        return count
      }
      if (raw >= count + 1) {
        jumpToRaw(1)
        return 1
      }
      return raw
    }

    function syncFromScroll() {
      if (jumpingRef.current) return
      const node = scrollRef.current
      if (!node) return
      const width = node.clientWidth
      if (width <= 0) return
      const raw = Math.round(node.scrollLeft / width)
      applyLogical(logicalFromRaw(raw))
    }

    function onScrollEnd() {
      if (jumpingRef.current) return
      const node = scrollRef.current
      if (!node) return
      const width = node.clientWidth
      if (width <= 0) return
      const raw = normalizeRaw(node, width)
      const target = raw * width
      if (Math.abs(node.scrollLeft - target) > 1) {
        node.scrollTo({ left: target, behavior: 'auto' })
      }
      scrollingRef.current = false
      applyLogical(logicalFromRaw(raw))
    }

    let fallbackTimer = 0
    function onScroll() {
      if (jumpingRef.current) return
      syncFromScroll()
      window.clearTimeout(fallbackTimer)
      fallbackTimer = window.setTimeout(onScrollEnd, 100)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scrollend', onScrollEnd)
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onScrollEnd)
      window.clearTimeout(fallbackTimer)
    }
  }, [open, count, looping, jumpToRaw, logicalFromRaw, onIndexChange])

  useEffect(() => {
    if (!open) return
    function align() {
      if (jumpingRef.current) return
      jumpToRaw(rawFromLogical(indexRef.current))
    }
    window.addEventListener('resize', align)
    return () => window.removeEventListener('resize', align)
  }, [open, jumpToRaw, rawFromLogical])

  if (!open || count === 0 || typeof document === 'undefined') return null

  return createPortal(
    <div
      className='fixed inset-0 z-[10050] flex flex-col bg-black'
      role='dialog'
      aria-modal
      aria-label='사진 크게 보기'
      onClick={onClose}
    >
      <div
        className='relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)]'
        onClick={(e) => e.stopPropagation()}
      >
        <p className='min-w-0 truncate text-[13px] font-medium text-white/70'>
          {eyebrow || '\u00A0'}
        </p>
        <button
          type='button'
          onClick={onClose}
          className='inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation transition hover:bg-white/20'
          aria-label='닫기'
        >
          <CloseIcon className='size-5' />
        </button>
      </div>

      <div
        className='relative min-h-0 flex-1'
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={scrollRef}
          className={cn(
            'flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden',
            'overscroll-x-contain',
            '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          )}
          aria-roledescription='carousel'
        >
          {trackSlides.map((item, trackIndex) => {
            const caption = item.caption?.trim() || ''
            const logical = looping
              ? trackIndex === 0
                ? count - 1
                : trackIndex === trackSlides.length - 1
                  ? 0
                  : trackIndex - 1
              : trackIndex
            return (
              <div
                key={item.trackKey}
                className='flex h-full w-full min-w-full shrink-0 snap-start snap-always flex-col'
                aria-hidden={logical !== activeIndex}
              >
                <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-3 pt-[min(14vh,6rem)] sm:px-10 sm:pt-[min(16vh,7rem)]'>
                  <div className='relative h-[min(42dvh,420px)] w-full shrink-0'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={caption || ''}
                      className='pointer-events-none absolute inset-0 m-auto max-h-full max-w-full object-contain select-none'
                      draggable={false}
                    />
                  </div>
                  {caption ? (
                    <p className='mt-4 max-w-lg px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[15px] leading-relaxed text-white sm:mt-5 sm:text-[16px]'>
                      {caption}
                    </p>
                  ) : (
                    <div
                      className='pb-[max(1.5rem,env(safe-area-inset-bottom))]'
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {count > 1 ? (
          <div className='pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3rem+min(14vh,6rem))] z-10 mx-auto flex h-[min(42dvh,420px)] w-full max-w-3xl items-center justify-between px-1 sm:top-[calc(env(safe-area-inset-top)+3rem+min(16vh,7rem))] sm:px-8'>
            <NavButton ariaLabel='이전 사진' onClick={goPrev}>
              <ChevronIcon className='size-5 rotate-180' />
            </NavButton>
            <NavButton ariaLabel='다음 사진' onClick={goNext}>
              <ChevronIcon className='size-5' />
            </NavButton>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

function NavButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'pointer-events-auto inline-flex size-11 items-center justify-center rounded-full',
        'border border-white/40 bg-black/55 text-white shadow-[0_2px_12px_rgba(0,0,0,0.45)]',
        'touch-manipulation backdrop-blur-md transition hover:bg-black/70 hover:border-white/60',
      )}
    >
      {children}
    </button>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' d='M6 6l12 12M18 6 6 18' />
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
