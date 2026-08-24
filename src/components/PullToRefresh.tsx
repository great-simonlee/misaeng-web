'use client'

import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@lib'

const PULL_THRESHOLD = 76
const PULL_MAX = 120
const REFRESH_HOLD = 96
const BRAND = '#F64310'

type PullToRefreshProps = {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}

function getScrollTop() {
  if (typeof window === 'undefined') return 0
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  const disabledRef = useRef(disabled)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  const setPullBoth = useCallback((value: number) => {
    pullRef.current = value
    setPull(value)
  }, [])

  const finishRefresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    setRefreshing(true)
    setPullBoth(REFRESH_HOLD)
    try {
      await onRefreshRef.current()
    } finally {
      refreshingRef.current = false
      setRefreshing(false)
      setPullBoth(0)
      startYRef.current = null
      pullingRef.current = false
    }
  }, [setPullBoth])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (disabledRef.current || refreshingRef.current) return
      if (getScrollTop() > 2) {
        startYRef.current = null
        return
      }
      startYRef.current = e.touches[0]?.clientY ?? null
      pullingRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (
        disabledRef.current ||
        refreshingRef.current ||
        startYRef.current == null
      ) {
        return
      }
      if (getScrollTop() > 2) {
        startYRef.current = null
        setPullBoth(0)
        pullingRef.current = false
        return
      }

      const currentY = e.touches[0]?.clientY ?? startYRef.current
      const delta = currentY - startYRef.current
      if (delta <= 0) {
        setPullBoth(0)
        pullingRef.current = false
        return
      }

      pullingRef.current = true
      const next = Math.min(PULL_MAX, delta * 0.42)
      setPullBoth(next)
      if (next > 8 && e.cancelable) {
        e.preventDefault()
      }
    }

    function onTouchEnd() {
      if (disabledRef.current || refreshingRef.current) return
      const shouldRefresh =
        pullingRef.current && pullRef.current >= PULL_THRESHOLD
      startYRef.current = null
      pullingRef.current = false
      if (shouldRefresh) {
        void finishRefresh()
        return
      }
      setPullBoth(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [finishRefresh, setPullBoth])

  const progress = Math.min(1, pull / PULL_THRESHOLD)
  const ready = progress >= 1
  const showIndicator = pull > 4 || refreshing
  const indicatorHeight = Math.max(pull, refreshing ? REFRESH_HOLD : 0)
  const logoScale = refreshing ? 1 : 0.72 + progress * 0.28

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        aria-hidden={!showIndicator}
        className={cn(
          'pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center',
          refreshing ? 'items-center overflow-visible' : 'items-end overflow-hidden',
          showIndicator ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: indicatorHeight }}
      >
        <div
          className={cn(
            'flex flex-col items-center gap-1.5',
            refreshing ? 'py-3' : 'mb-2.5 pt-3',
          )}
        >
          <div
            className={cn(
              'relative flex size-11 items-center justify-center rounded-full bg-white transition-[box-shadow,transform]',
              ready || refreshing
                ? 'shadow-[0_6px_20px_rgba(246,67,16,0.28)]'
                : 'shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
            )}
            style={{
              transform: `scale(${logoScale})`,
            }}
          >
            {/* 진행 링 */}
            <span
              className={cn(
                'absolute inset-0',
                refreshing && 'misaeng-ptr-orbit',
              )}
              aria-hidden
            >
              <svg
                className='size-full -rotate-90'
                viewBox='0 0 44 44'
              >
                <circle
                  cx='22'
                  cy='22'
                  r='19'
                  fill='none'
                  stroke='rgba(246,67,16,0.12)'
                  strokeWidth='2.5'
                />
                <circle
                  cx='22'
                  cy='22'
                  r='19'
                  fill='none'
                  stroke={BRAND}
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeDasharray={
                    refreshing
                      ? `${2 * Math.PI * 19 * 0.28} ${2 * Math.PI * 19}`
                      : 2 * Math.PI * 19
                  }
                  strokeDashoffset={
                    refreshing ? 0 : 2 * Math.PI * 19 * (1 - progress)
                  }
                />
              </svg>
            </span>

            <span className='relative z-[1] flex size-6 items-center justify-center'>
              <Image
                src='/img/logo_square.png'
                alt=''
                width={48}
                height={48}
                className='size-full object-contain mix-blend-lighten'
                priority
              />
            </span>

            {(ready || refreshing) && (
              <span
                className='absolute inset-0 rounded-full ring-2 ring-[#F64310]/25'
                aria-hidden
              />
            )}
          </div>

          <p
            className={cn(
              'text-[11px] font-semibold tracking-tight transition-colors',
              ready || refreshing ? 'text-[#F64310]' : 'text-[var(--muted)]',
            )}
          >
            {refreshing
              ? '미생 새로고침 중…'
              : ready
                ? '놓으면 새로고침'
                : '당겨서 새로고침'}
          </p>
        </div>
      </div>

      <div
        style={{
          transform:
            pull > 0 || refreshing ? `translateY(${pull}px)` : undefined,
          transition: pullingRef.current ? 'none' : 'transform 180ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
