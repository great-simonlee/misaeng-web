'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@lib'
import type { FoodCarouselSlide } from '@lib/community/food'

type FoodDetailHeroCarouselProps = {
  slides: FoodCarouselSlide[]
  backHref: string
  backLabel?: string
  className?: string
}

export function FoodDetailHeroCarousel({
  slides,
  backHref,
  backLabel = '목록',
  className,
}: FoodDetailHeroCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current
    if (!el || slides.length === 0) return
    const width = el.clientWidth || 1
    const index = Math.round(el.scrollLeft / width)
    setActiveIndex(Math.min(Math.max(index, 0), slides.length - 1))
  }, [slides.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateActiveIndex, { passive: true })
    return () => el.removeEventListener('scroll', updateActiveIndex)
  }, [updateActiveIndex])

  if (slides.length === 0) {
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
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className='flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className='relative aspect-[4/3] w-full shrink-0 snap-center bg-[#e8eaee]'
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt=''
              className='h-full w-full object-cover'
            />
          </div>
        ))}
      </div>

      <div className='pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent' />
      <CarouselBackButton backHref={backHref} backLabel={backLabel} />

      {slides.length > 1 ? (
        <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm'>
          {slides.map((slide, index) => (
            <span
              key={slide.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === activeIndex
                  ? 'w-4 bg-white'
                  : 'w-1.5 bg-white/50',
              )}
            />
          ))}
        </div>
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
