'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

interface PagedGalleryGoToOptions {
  wrap?: boolean
  behavior?: ScrollBehavior
}

export function usePagedGallery(count: number, resetKey?: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const swipingRef = useRef(false)
  const scrollIdleTimerRef = useRef<number>(0)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const syncIndexFromScroll = useCallback(() => {
    const el = ref.current
    if (!el || count <= 0) return
    const width = el.clientWidth
    if (width <= 0) return
    const next = Math.round(el.scrollLeft / width)
    const clamped = Math.min(Math.max(next, 0), count - 1)
    if (clamped !== indexRef.current) {
      indexRef.current = clamped
      setIndex(clamped)
    }
  }, [count])

  const markScrolling = useCallback(() => {
    swipingRef.current = true
    window.clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = window.setTimeout(() => {
      swipingRef.current = false
    }, 150)
  }, [])

  const goTo = useCallback(
    (next: number, options: PagedGalleryGoToOptions = {}) => {
      const el = ref.current
      const last = Math.max(count - 1, 0)
      let clamped = next
      if (options.wrap && count > 0) {
        clamped = ((next % count) + count) % count
      } else {
        clamped = Math.min(Math.max(next, 0), last)
      }
      setIndex(clamped)
      indexRef.current = clamped
      if (!el || count <= 0) return
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: options.behavior ?? 'smooth',
      })
    },
    [count],
  )

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (count <= 1) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return
    const dx = Math.abs(event.clientX - start.x)
    const dy = Math.abs(event.clientY - start.y)
    if (dx > 8 && dx > dy) {
      markScrolling()
    }
  }

  function onPointerCancel() {
    pointerStartRef.current = null
  }

  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setIndex(0)
    indexRef.current = 0
  }

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: 0 })
    indexRef.current = 0
    setIndex(0)
  }, [resetKey])

  useEffect(() => {
    const el = ref.current
    if (!el || count <= 1) return

    function onScroll() {
      markScrolling()
      syncIndexFromScroll()
    }

    function onScrollEnd() {
      syncIndexFromScroll()
      window.clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = window.setTimeout(() => {
        swipingRef.current = false
      }, 80)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scrollend', onScrollEnd)

    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onScrollEnd)
      window.clearTimeout(scrollIdleTimerRef.current)
    }
  }, [count, markScrolling, syncIndexFromScroll])

  useEffect(() => {
    function align() {
      const el = ref.current
      if (!el) return
      el.scrollTo({ left: indexRef.current * el.clientWidth })
    }
    window.addEventListener('resize', align)
    return () => window.removeEventListener('resize', align)
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(scrollIdleTimerRef.current)
  }, [])

  return {
    ref,
    index,
    goTo,
    swipingRef,
    pointerHandlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
    },
  }
}
