'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

/** 화면 끝 이 거리 안으로 끌면 페이지가 따라 스크롤된다 */
const AUTO_SCROLL_EDGE = 72
const AUTO_SCROLL_MAX_SPEED = 14
const LIFT_SCALE = 1.02
const LIFT_SHADOW = '0 18px 36px -12px rgba(0, 0, 0, 0.22)'
const SETTLE_MS = 220
const SETTLE_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

type DragSession = {
  key: string
  from: number
  over: number
  pointerId: number
  startClientY: number
  startScrollY: number
  lastClientY: number
  /** 끌기 시작할 때 각 카드의 위치 (문서 기준) */
  tops: number[]
  bottoms: number[]
  order: string[]
  frame: number
}

/** 배열에서 한 항목을 옮긴 새 배열 */
export function moveArrayItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
  return next
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * 세로 목록 드래그 정렬 (라이브러리 없이 pointer events + FLIP).
 * - 손잡이를 누르고 끌면 카드가 떠오르고, 나머지 카드가 옆으로 비켜난다. 놓으면 순서 확정.
 * - 마우스·터치·펜 모두 같은 코드. 손잡이에서 ↑/↓/Home 키로도 옮길 수 있다.
 * - 끄는 동안은 DOM 스타일만 바꿔서 화면 전체를 다시 그리지 않는다.
 */
export function useDragReorder({
  keys,
  onReorder,
}: {
  /** 지금 화면 순서대로의 항목 key */
  keys: string[]
  /** from → to로 옮기기 (상태 갱신은 호출하는 쪽에서) */
  onReorder: (from: number, to: number) => void
}) {
  const itemEls = useRef(new Map<string, HTMLElement>())
  const handleEls = useRef(new Map<string, HTMLElement>())
  const keysRef = useRef(keys)
  keysRef.current = keys
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder

  const sessionRef = useRef<DragSession | null>(null)
  /** 순서를 바꾸기 직전 화면 위치 → 바뀐 뒤 그 자리에서 미끄러지듯 이동 */
  const flipRef = useRef<{ tops: Map<string, number>; liftedKey: string | null } | null>(null)
  const focusKeyRef = useRef<string | null>(null)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [flipTick, setFlipTick] = useState(0)
  const orderSignature = keys.join('|')

  const itemRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) itemEls.current.set(key, el)
      else itemEls.current.delete(key)
    },
    [],
  )

  const handleRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) handleEls.current.set(key, el)
      else handleEls.current.delete(key)
    },
    [],
  )

  function captureTops(liftedKey: string | null) {
    const tops = new Map<string, number>()
    for (const key of keysRef.current) {
      const el = itemEls.current.get(key)
      if (el) tops.set(key, el.getBoundingClientRect().top)
    }
    flipRef.current = { tops, liftedKey }
  }

  useLayoutEffect(() => {
    const flip = flipRef.current
    if (!flip) return
    flipRef.current = null
    const reduce = prefersReducedMotion()
    for (const [key, oldTop] of flip.tops) {
      const el = itemEls.current.get(key)
      if (!el) continue
      const delta = oldTop - el.getBoundingClientRect().top
      const lifted = key === flip.liftedKey
      if (reduce || (!lifted && Math.abs(delta) < 0.5)) continue
      el.animate(
        [
          {
            transform: `translate3d(0, ${delta}px, 0) scale(${lifted ? LIFT_SCALE : 1})`,
            boxShadow: lifted ? LIFT_SHADOW : 'none',
          },
          { transform: 'translate3d(0, 0, 0) scale(1)', boxShadow: 'none' },
        ],
        { duration: SETTLE_MS, easing: SETTLE_EASING },
      )
    }
    const focusKey = focusKeyRef.current
    focusKeyRef.current = null
    if (focusKey) handleEls.current.get(focusKey)?.focus({ preventScroll: true })
  }, [orderSignature, flipTick])

  /** 버튼·키보드로 옮기기 (애니메이션 포함) */
  const move = useCallback((from: number, to: number, options?: { focusKey?: string }) => {
    const count = keysRef.current.length
    const target = Math.max(0, Math.min(to, count - 1))
    if (sessionRef.current || from === target || from < 0 || from >= count) return
    captureTops(null)
    focusKeyRef.current = options?.focusKey ?? null
    onReorderRef.current(from, target)
  }, [])

  function layoutDrag(session: DragSession) {
    const { from, tops, bottoms, order } = session
    const count = order.length
    const rawDy =
      session.lastClientY - session.startClientY + (window.scrollY - session.startScrollY)
    // 목록 위·아래 밖으로는 끌려 나가지 않게
    const dy = Math.max(tops[0] - tops[from], Math.min(rawDy, bottoms[count - 1] - bottoms[from]))
    const center = (tops[from] + bottoms[from]) / 2 + dy

    let over = from
    for (let i = from + 1; i < count; i += 1) {
      if (center >= (tops[i] + bottoms[i]) / 2) over = i
    }
    for (let i = from - 1; i >= 0; i -= 1) {
      if (center <= (tops[i] + bottoms[i]) / 2) over = i
    }
    session.over = over

    const gap = count > 1 ? Math.max(0, tops[1] - bottoms[0]) : 0
    const shift = bottoms[from] - tops[from] + gap
    order.forEach((key, i) => {
      const el = itemEls.current.get(key)
      if (!el) return
      if (i === from) {
        el.style.transform = `translate3d(0, ${dy}px, 0) scale(${LIFT_SCALE})`
        return
      }
      let offset = 0
      if (from < over && i > from && i <= over) offset = -shift
      if (over < from && i >= over && i < from) offset = shift
      el.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : ''
    })
  }

  const finishDrag = useCallback((commit: boolean) => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null
    cancelAnimationFrame(session.frame)
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerCancel)
    window.removeEventListener('keydown', onWindowKeyDown, true)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('-webkit-user-select')

    const to = commit ? session.over : session.from
    // 지금 보이는 자리(이동 중인 transform 포함)를 기억한 뒤 transform을 지우고 순서를 바꾼다
    captureTops(session.key)
    for (const key of session.order) {
      const el = itemEls.current.get(key)
      if (el) el.style.transform = ''
    }
    setDraggingKey(null)
    if (to !== session.from) onReorderRef.current(session.from, to)
    else setFlipTick((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // window 리스너는 고정 참조가 필요해서 ref로 최신 함수를 가리킨다
  const finishRef = useRef(finishDrag)
  finishRef.current = finishDrag

  function onWindowPointerMove(event: PointerEvent) {
    const session = sessionRef.current
    if (!session || event.pointerId !== session.pointerId) return
    event.preventDefault()
    session.lastClientY = event.clientY
    layoutDrag(session)
  }

  function onWindowPointerUp(event: PointerEvent) {
    if (sessionRef.current?.pointerId !== event.pointerId) return
    finishRef.current(true)
  }

  function onWindowPointerCancel(event: PointerEvent) {
    if (sessionRef.current?.pointerId !== event.pointerId) return
    finishRef.current(false)
  }

  function onWindowKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    finishRef.current(false)
  }

  function autoScrollLoop() {
    const session = sessionRef.current
    if (!session) return
    const y = session.lastClientY
    const height = window.innerHeight
    let speed = 0
    if (y < AUTO_SCROLL_EDGE) speed = -((AUTO_SCROLL_EDGE - y) / AUTO_SCROLL_EDGE)
    else if (y > height - AUTO_SCROLL_EDGE) speed = (y - (height - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE
    if (speed !== 0) {
      window.scrollBy(0, Math.round(Math.max(-1, Math.min(1, speed)) * AUTO_SCROLL_MAX_SPEED))
      layoutDrag(session)
    }
    session.frame = requestAnimationFrame(autoScrollLoop)
  }

  const startDrag = useCallback((key: string, event: ReactPointerEvent<HTMLElement>) => {
    if (sessionRef.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const order = keysRef.current.slice()
    const from = order.indexOf(key)
    if (from < 0 || order.length < 2) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* 일부 브라우저는 캡처 실패 — window 리스너로 충분 */
    }

    const scrollY = window.scrollY
    const tops: number[] = []
    const bottoms: number[] = []
    for (const itemKey of order) {
      const rect = itemEls.current.get(itemKey)?.getBoundingClientRect()
      tops.push((rect?.top ?? 0) + scrollY)
      bottoms.push((rect?.bottom ?? 0) + scrollY)
    }

    sessionRef.current = {
      key,
      from,
      over: from,
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startScrollY: scrollY,
      lastClientY: event.clientY,
      tops,
      bottoms,
      order,
      frame: 0,
    }
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    document.body.style.setProperty('-webkit-user-select', 'none')
    window.addEventListener('pointermove', onWindowPointerMove, { passive: false })
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerCancel)
    window.addEventListener('keydown', onWindowKeyDown, true)
    sessionRef.current.frame = requestAnimationFrame(autoScrollLoop)
    setDraggingKey(key)
    layoutDrag(sessionRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 끄는 도중 화면을 떠나면 정리
  useEffect(() => () => finishRef.current(false), [])

  /** 손잡이에 붙일 props */
  const getHandleProps = useCallback(
    (key: string, index: number) => ({
      ref: handleRef(key),
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => startDrag(key, event),
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        const count = keysRef.current.length
        let to: number | null = null
        if (event.key === 'ArrowUp') to = index - 1
        else if (event.key === 'ArrowDown') to = index + 1
        else if (event.key === 'Home') to = 0
        else if (event.key === 'End') to = count - 1
        if (to == null) return
        event.preventDefault()
        move(index, to, { focusKey: key })
      },
      style: { touchAction: 'none' as const },
    }),
    [handleRef, move, startDrag],
  )

  return { draggingKey, itemRef, getHandleProps, move }
}
