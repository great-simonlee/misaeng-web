'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@lib'

interface ChipScrollRowProps {
  children: ReactNode
  leading?: ReactNode
  ariaLabel?: string
  className?: string
}

export function ChipScrollRow({
  children,
  leading,
  ariaLabel,
  className,
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
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateEdge)
    }
  }, [])

  const maskImage =
    edge.left || edge.right
      ? `linear-gradient(to right, ${
          edge.left ? 'transparent 0, #000 36px' : '#000'
        }, #000 calc(100% - 36px), ${
          edge.right ? 'transparent 100%' : '#000'
        })`
      : undefined

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
          style={{
            maskImage,
            WebkitMaskImage: maskImage,
          }}
        >
          <div
            className='flex w-max items-center gap-1.5 pr-12'
            role='listbox'
            aria-label={ariaLabel}
          >
            {children}
          </div>
        </div>

        {edge.left && (
          <button
            type='button'
            aria-label='이전 보기'
            onClick={() => scrollByDir('left')}
            className='absolute inset-y-0 left-0 z-10 my-auto inline-flex size-6 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[var(--foreground)] shadow-sm'
          >
            <ChevronIcon className='size-3.5 rotate-180' />
          </button>
        )}

        {edge.right && (
          <button
            type='button'
            aria-label='더 보기'
            onClick={() => scrollByDir('right')}
            className='absolute inset-y-0 right-0 z-10 my-auto inline-flex size-6 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[var(--foreground)] shadow-sm'
          >
            <ChevronIcon className='size-3.5' />
          </button>
        )}
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
