'use client'

import Link from 'next/link'
import { useRef } from 'react'

import { usePagedGallery } from '@hooks/usePagedGallery'
import { cn } from '@lib'
import type { FoodCarouselSlide } from '@lib/community/food'

type FoodDetailHeroCarouselProps = {
  slides: FoodCarouselSlide[]
  backHref: string
  backLabel?: string
  className?: string
  /** 사진 탭(드래그 아님) 시 확대 보기 */
  onSlideOpen?: (index: number) => void
}

export function FoodDetailHeroCarousel({
  slides,
  backHref,
  backLabel = '목록',
  className,
  onSlideOpen,
}: FoodDetailHeroCarouselProps) {
  const count = slides.length
  const {
    ref: scrollRef,
    index: activeIndex,
    goTo,
    pointerHandlers,
  } = usePagedGallery(count)
  const tapStartRef = useRef<{ x: number; y: number } | null>(null)

  if (count === 0) {
    return (
      <div
        className={cn(
          'relative aspect-[4/3] bg-gradient-to-br from-[#eceef1] to-[#dfe3ea]',
          className,
        )}
      >
        <CarouselBackButton backHref={backHref} backLabel={backLabel} />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        ref={scrollRef}
        {...pointerHandlers}
        onPointerDown={(e) => {
          pointerHandlers.onPointerDown?.(e)
          tapStartRef.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={(e) => {
          pointerHandlers.onPointerUp?.(e)
          const start = tapStartRef.current
          tapStartRef.current = null
          if (!start || !onSlideOpen) return
          const dx = Math.abs(e.clientX - start.x)
          const dy = Math.abs(e.clientY - start.y)
          if (dx < 8 && dy < 8) onSlideOpen(activeIndex)
        }}
        onPointerCancel={(e) => {
          pointerHandlers.onPointerCancel?.(e)
          tapStartRef.current = null
        }}
        className='flex aspect-[4/3] cursor-zoom-in snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
        aria-roledescription='carousel'
        aria-label='맛집 사진'
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className='relative h-full w-full min-w-full shrink-0 snap-start snap-always bg-[#e8eaee]'
            aria-hidden={index !== activeIndex}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt={slide.label || ''}
              draggable={false}
              className='pointer-events-none h-full w-full select-none object-cover'
            />
          </div>
        ))}
      </div>

      <div className='pointer-events-none absolute inset-x-0 top-0 z-[1] h-20 bg-gradient-to-b from-black/40 to-transparent' />
      <CarouselBackButton backHref={backHref} backLabel={backLabel} />

      {count > 1 ? (
        <>
          <button
            type='button'
            aria-label='이전 사진'
            onClick={() => goTo(activeIndex - 1)}
            className='absolute left-3 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[var(--foreground)] shadow-md touch-manipulation transition hover:bg-white sm:left-4 sm:size-10'
          >
            <ChevronIcon className='size-4 rotate-180 sm:size-[1.1rem]' />
          </button>
          <button
            type='button'
            aria-label='다음 사진'
            onClick={() => goTo(activeIndex + 1)}
            className='absolute right-3 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[var(--foreground)] shadow-md touch-manipulation transition hover:bg-white sm:right-4 sm:size-10'
          >
            <ChevronIcon className='size-4 sm:size-[1.1rem]' />
          </button>

          <div className='absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur-sm sm:bottom-4'>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type='button'
                aria-label={`${index + 1}번째 사진`}
                aria-current={index === activeIndex}
                onClick={() => goTo(index)}
                className={cn(
                  'h-1.5 rounded-full touch-manipulation transition-all',
                  index === activeIndex
                    ? 'w-4 bg-white'
                    : 'w-1.5 bg-white/50 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function CarouselBackButton({
  backHref,
  backLabel,
}: {
  backHref: string
  backLabel: string
}) {
  return (
    <Link
      href={backHref}
      className='absolute left-3 top-3 z-10 inline-flex h-9 items-center gap-1 rounded-full bg-black/35 px-3 text-[12px] font-semibold text-white backdrop-blur-md touch-manipulation transition hover:bg-black/50 sm:left-4 sm:top-4'
    >
      <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden
      >
        <path d='m15 18-6-6 6-6' />
      </svg>
      {backLabel}
    </Link>
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
