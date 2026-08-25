'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

interface PagedGalleryGoToOptions {
  wrap?: boolean
  behavior?: ScrollBehavior
}

interface PagedGalleryOptions {
  /**
   * true면 DOM에 [마지막 클론, ...원본, 첫 클론]을 렌더해야 함.
   * trackCount = count + 2 (count > 1일 때)
   */
  loop?: boolean
}

export function usePagedGallery(
  count: number,
  resetKey?: string,
  options: PagedGalleryOptions = {},
) {
  const { loop = false } = options
  const looping = loop && count > 1
  const trackCount = looping ? count + 2 : count

  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const swipingRef = useRef(false)
  const jumpingRef = useRef(false)
  const scrollIdleTimerRef = useRef<number>(0)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

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

  const syncIndexFromScroll = useCallback(() => {
    const el = ref.current
    if (!el || count <= 0 || jumpingRef.current) return
    const width = el.clientWidth
    if (width <= 0) return
    const raw = Math.round(el.scrollLeft / width)
    const next = logicalFromRaw(raw)
    if (next !== indexRef.current) {
      indexRef.current = next
      setIndex(next)
    }
  }, [count, logicalFromRaw])

  const markScrolling = useCallback(() => {
    swipingRef.current = true
    window.clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = window.setTimeout(() => {
      swipingRef.current = false
    }, 150)
  }, [])

  const jumpToRaw = useCallback((raw: number) => {
    const el = ref.current
    if (!el) return
    const width = el.clientWidth
    if (width <= 0) return
    jumpingRef.current = true
    el.scrollTo({ left: raw * width, behavior: 'auto' })
    requestAnimationFrame(() => {
      jumpingRef.current = false
    })
  }, [])

  const goTo = useCallback(
    (next: number, goOptions: PagedGalleryGoToOptions = {}) => {
      const el = ref.current
      const last = Math.max(count - 1, 0)
      let logical = next
      if (goOptions.wrap && count > 0) {
        logical = ((next % count) + count) % count
      } else {
        logical = Math.min(Math.max(next, 0), last)
      }

      const from = indexRef.current
      setIndex(logical)
      indexRef.current = logical
      if (!el || count <= 0) return

      const width = el.clientWidth
      if (width <= 0) return

      // 루프: 끝→처음 / 처음→끝은 클론 슬라이드로 자연스럽게 넘긴 뒤 점프
      if (looping && goOptions.wrap) {
        if (from === last && logical === 0) {
          el.scrollTo({
            left: (count + 1) * width,
            behavior: goOptions.behavior ?? 'smooth',
          })
          return
        }
        if (from === 0 && logical === last) {
          el.scrollTo({
            left: 0,
            behavior: goOptions.behavior ?? 'smooth',
          })
          return
        }
      }

      el.scrollTo({
        left: rawFromLogical(logical) * width,
        behavior: goOptions.behavior ?? 'smooth',
      })
    },
    [count, looping, rawFromLogical],
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
  }

  useEffect(() => {
    indexRef.current = index
  }, [index])

  // 루프 시 첫 페인트 전에 실제 첫 장 위치로 맞춤 (마지막 클론이 보이지 않게)
  useLayoutEffect(() => {
    jumpToRaw(rawFromLogical(0))
  }, [resetKey, count, rawFromLogical, jumpToRaw])

  useEffect(() => {
    const el = ref.current
    if (!el || count <= 1) return

    function normalizeLoopPosition(node: HTMLDivElement, width: number) {
      if (!looping) return Math.round(node.scrollLeft / width)
      const raw = Math.round(node.scrollLeft / width)
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

    function onScrollEnd() {
      const node = ref.current
      if (!node || jumpingRef.current) return
      const width = node.clientWidth
      if (width <= 0) {
        syncIndexFromScroll()
      } else {
        const raw = normalizeLoopPosition(node, width)
        const logical = logicalFromRaw(raw)
        const target = raw * width
        if (Math.abs(node.scrollLeft - target) > 1) {
          node.scrollTo({ left: target, behavior: 'auto' })
        }
        if (logical !== indexRef.current) {
          indexRef.current = logical
          setIndex(logical)
        }
      }
      window.clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = window.setTimeout(() => {
        swipingRef.current = false
      }, 80)
    }

    let scrollEndFallback = 0
    function onScrollFallback() {
      if (jumpingRef.current) return
      markScrolling()
      syncIndexFromScroll()
      window.clearTimeout(scrollEndFallback)
      scrollEndFallback = window.setTimeout(() => {
        onScrollEnd()
      }, 120)
    }

    el.addEventListener('scroll', onScrollFallback, { passive: true })
    el.addEventListener('scrollend', onScrollEnd)

    return () => {
      el.removeEventListener('scroll', onScrollFallback)
      el.removeEventListener('scrollend', onScrollEnd)
      window.clearTimeout(scrollIdleTimerRef.current)
      window.clearTimeout(scrollEndFallback)
    }
  }, [
    count,
    looping,
    jumpToRaw,
    logicalFromRaw,
    markScrolling,
    syncIndexFromScroll,
  ])

  useEffect(() => {
    function align() {
      const el = ref.current
      if (!el || jumpingRef.current) return
      el.scrollTo({
        left: rawFromLogical(indexRef.current) * el.clientWidth,
        behavior: 'auto',
      })
    }
    window.addEventListener('resize', align)
    return () => window.removeEventListener('resize', align)
  }, [rawFromLogical])

  useEffect(() => {
    return () => window.clearTimeout(scrollIdleTimerRef.current)
  }, [])

  return {
    ref,
    index,
    goTo,
    swipingRef,
    /** 루프일 때 DOM 슬라이드 수 (클론 포함) */
    trackCount,
    looping,
    pointerHandlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
    },
  }
}
