'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@lib'

interface ChipScrollRowProps {
  children: ReactNode
  leading?: ReactNode
  ariaLabel?: string
  className?: string
  /** 가장자리 페이드 색 (페이지 배경과 맞출 때) */
  edgeColor?: string
}

/** 좌우 화살표 + 페이드로 가로 스크롤 가능함을 보여주는 칩 행 */
export function ChipScrollRow({
  children,
  leading,
  ariaLabel,
  className,
  edgeColor = '#f8f8f9',
}: ChipScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  function updateEdge() {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setEdge({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    })
  }

  function scrollByDir(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === 'right' ? 140 : -140,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    updateEdge()
    const el = scrollRef.current
    if (!el) return
    const inner = el.firstElementChild
    const ro = new ResizeObserver(updateEdge)
    ro.observe(el)
    if (inner) ro.observe(inner)
    window.addEventListener('resize', updateEdge)
    const t = window.setTimeout(updateEdge, 50)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateEdge)
      window.clearTimeout(t)
    }
  }, [])

  return (
    <div className={cn('flex shrink-0 items-center gap-2 sm:gap-2.5', className)}>
      {leading ? <div className='shrink-0 py-0.5'>{leading}</div> : null}

      {leading ? (
        <span
          className='hidden h-6 w-px shrink-0 bg-[#dddddd] sm:block'
          aria-hidden
        />
      ) : null}

      <div className='relative min-w-0 flex-1'>
        <div
          ref={scrollRef}
          onScroll={updateEdge}
          className='overflow-x-auto overflow-y-hidden scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          <div
            className='flex w-max items-center gap-2 pr-12'
            role='listbox'
            aria-label={ariaLabel}
          >
            {children}
          </div>
        </div>

        {edge.left ? (
          <div className='pointer-events-none absolute inset-y-0 left-0 z-10 flex w-14 items-center'>
            <div
              aria-hidden
              className='absolute inset-y-0 left-0 w-8'
              style={{ backgroundColor: edgeColor }}
            />
            <div
              aria-hidden
              className='absolute inset-y-0 left-7 right-0'
              style={{
                backgroundImage: `linear-gradient(to right, ${edgeColor}, transparent)`,
              }}
            />
            <button
              type='button'
              aria-label='이전 보기'
              onClick={() => scrollByDir('left')}
              className='pointer-events-auto relative ml-0.5 inline-flex size-6 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[var(--foreground)] shadow-sm touch-manipulation'
            >
              <ChevronIcon className='size-3.5 rotate-180' />
            </button>
          </div>
        ) : null}

        {edge.right ? (
          <div className='pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end'>
            <div
              aria-hidden
              className='absolute inset-y-0 right-0 w-8'
              style={{ backgroundColor: edgeColor }}
            />
            <div
              aria-hidden
              className='absolute inset-y-0 left-0 right-7'
              style={{
                backgroundImage: `linear-gradient(to left, ${edgeColor}, transparent)`,
              }}
            />
            <button
              type='button'
              aria-label='더 보기'
              onClick={() => scrollByDir('right')}
              className='pointer-events-auto relative mr-0.5 inline-flex size-6 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[var(--foreground)] shadow-sm touch-manipulation'
            >
              <ChevronIcon className='size-3.5' />
            </button>
          </div>
        ) : null}
      </div>
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
