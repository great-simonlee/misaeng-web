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
  const startRef = useRef<{
    x: number
    y: number
    index: number
    axis?: 'x' | 'y'
  } | null>(null)
  const swipingRef = useRef(false)
  const restoreTimerRef = useRef<number>(0)

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
      window.clearTimeout(restoreTimerRef.current)
      el.style.scrollSnapType = 'none'
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: options.behavior ?? 'smooth',
      })
      restoreTimerRef.current = window.setTimeout(() => {
        el.style.scrollSnapType = ''
      }, 360)
    },
    [count],
  )

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (count <= 1) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      index: indexRef.current,
    }
    swipingRef.current = false
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current
    const el = ref.current
    if (!start || !el || count <= 1) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!start.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (start.axis === 'x') {
        swipingRef.current = true
        el.style.scrollSnapType = 'none'
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        startRef.current = null
      }
      return
    }

    if (start.axis !== 'x') return

    const width = el.clientWidth
    if (width <= 0) return
    const raw = start.index * width - dx
    const min = Math.max(0, start.index - 1) * width
    const max = Math.min(count - 1, start.index + 1) * width
    el.scrollLeft = Math.min(Math.max(raw, min), max)
  }

  function settle(clientX: number) {
    const start = startRef.current
    const el = ref.current
    startRef.current = null
    if (!start || start.axis !== 'x' || !el) return
    const dx = clientX - start.x
    const threshold = Math.max(36, el.clientWidth * 0.12)
    if (dx <= -threshold) goTo(start.index + 1)
    else if (dx >= threshold) goTo(start.index - 1)
    else goTo(start.index)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    settle(event.clientX)
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current
    startRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (start?.axis === 'x') goTo(start.index)
  }

  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setIndex(0)
  }

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTo({ left: 0 })
  }, [resetKey])

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
    return () => window.clearTimeout(restoreTimerRef.current)
  }, [])

  return {
    ref,
    index,
    goTo,
    swipingRef,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  }
}
