'use client'

import {
  useCallback,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react'

export type AnchoredPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
}

function measureAnchoredPosition(
  el: HTMLElement,
  gap: number,
): AnchoredPosition {
  const rect = el.getBoundingClientRect()
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0
  const spaceBelow = viewportHeight - (rect.bottom - viewportOffsetTop) - 12
  const spaceAbove = rect.top - viewportOffsetTop - 12
  const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove
  const maxHeight = Math.max(
    120,
    Math.min(240, preferBelow ? spaceBelow : spaceAbove),
  )

  if (preferBelow) {
    return {
      top: rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
    }
  }

  return {
    top: Math.max(8, rect.top - gap - maxHeight),
    left: rect.left,
    width: rect.width,
    maxHeight,
  }
}

/**
 * 앵커 요소 바로 아래에 fixed 드롭다운을 붙입니다.
 * 스크롤·리사이즈·모바일 키보드(visualViewport)에도 위치를 갱신합니다.
 */
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  gap = 6,
): AnchoredPosition | null {
  const [position, setPosition] = useState<AnchoredPosition | null>(null)

  const update = useCallback(() => {
    const el = anchorRef.current
    if (!el) {
      setPosition(null)
      return
    }
    setPosition(measureAnchoredPosition(el, gap))
  }, [anchorRef, gap])

  useLayoutEffect(() => {
    if (!open) return

    const frame = requestAnimationFrame(() => {
      update()
    })

    const opts: AddEventListenerOptions = { capture: true, passive: true }
    window.addEventListener('scroll', update, opts)
    window.addEventListener('resize', update)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update, opts)
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [open, update])

  if (!open) return null
  return position
}
