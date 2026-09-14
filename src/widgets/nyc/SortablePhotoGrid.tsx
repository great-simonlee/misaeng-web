'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

import { cn } from '@lib'

/** 이 시간만 지나면 바로 드래그 시작 */
const HOLD_MS = 120
/** 짧게 누른 뒤 움직이면 드래그로 전환 */
const MOVE_ACTIVATE_MS = 70
const MOVE_ACTIVATE_PX = 4
/** 이보다 크게 바로 움직이면 페이지 스크롤로 봄 */
const SCROLL_CANCEL_PX = 28

type SortablePhotoGridProps = {
  urls: string[]
  onChange: (next: string[]) => void
  className?: string
  trailing?: ReactNode
}

function moveItem(list: string[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** 짧게 눌러 사진 순서를 바꾸는 그리드. 첫 장이 대표 사진 */
export function SortablePhotoGrid({
  urls,
  onChange,
  className,
  trailing,
}: SortablePhotoGridProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const draggingRef = useRef<number | null>(null)
  const urlsRef = useRef(urls)
  urlsRef.current = urls
  const holdTimer = useRef<number | null>(null)
  const pointerId = useRef<number | null>(null)
  const start = useRef<{
    x: number
    y: number
    index: number
    at: number
  } | null>(null)
  const tileRefs = useRef<Array<HTMLDivElement | null>>([])

  function setDraggingIndex(index: number | null) {
    draggingRef.current = index
    setDragging(index)
  }

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function beginDrag(index: number, id: number) {
    if (draggingRef.current != null) return
    setDraggingIndex(index)
    tileRefs.current[index]?.setPointerCapture?.(id)
    try {
      window.navigator.vibrate?.(10)
    } catch {
      /* ignore */
    }
  }

  function endDrag() {
    clearHold()
    if (pointerId.current != null && draggingRef.current != null) {
      tileRefs.current[draggingRef.current]?.releasePointerCapture?.(
        pointerId.current,
      )
    }
    pointerId.current = null
    start.current = null
    setDraggingIndex(null)
  }

  function handlePointerDown(index: number, e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    pointerId.current = e.pointerId
    start.current = { x: e.clientX, y: e.clientY, index, at: Date.now() }
    clearHold()
    holdTimer.current = window.setTimeout(() => {
      if (pointerId.current == null || !start.current) return
      beginDrag(start.current.index, pointerId.current)
    }, HOLD_MS)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const origin = start.current
    const from = draggingRef.current

    if (from == null) {
      if (!origin) return
      const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)
      const elapsed = Date.now() - origin.at
      if (dist >= SCROLL_CANCEL_PX && elapsed < MOVE_ACTIVATE_MS) {
        clearHold()
        start.current = null
        return
      }
      if (
        pointerId.current != null &&
        (elapsed >= HOLD_MS || (elapsed >= MOVE_ACTIVATE_MS && dist >= MOVE_ACTIVATE_PX))
      ) {
        clearHold()
        beginDrag(origin.index, pointerId.current)
      }
      return
    }

    const el = document.elementFromPoint(e.clientX, e.clientY)
    const tile = el?.closest('[data-photo-index]')
    if (!(tile instanceof HTMLElement)) return
    const to = Number(tile.dataset.photoIndex)
    if (!Number.isInteger(to) || to === from) return
    onChange(moveItem(urlsRef.current, from, to))
    setDraggingIndex(to)
  }

  useEffect(() => {
    if (dragging == null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [dragging])

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 sm:grid-cols-4',
        dragging != null && 'touch-none select-none',
        className,
      )}
    >
      {urls.map((url, index) => {
        const active = dragging === index
        return (
          <div
            key={url}
            ref={(node) => {
              tileRefs.current[index] = node
            }}
            data-photo-index={index}
            onPointerDown={(e) => handlePointerDown(index, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              'relative aspect-square touch-manipulation overflow-hidden rounded-xl bg-[#e8eaee] ring-1 ring-black/[0.06]',
              active && 'z-10 scale-[1.03] shadow-lg ring-[var(--brand)]/40',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=''
              draggable={false}
              className='pointer-events-none h-full w-full object-cover'
            />
            {index === 0 ? (
              <span className='absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white'>
                대표
              </span>
            ) : null}
            <button
              type='button'
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onChange(urls.filter((_, i) => i !== index))}
              className='absolute right-1 top-1 inline-flex h-6 items-center rounded-full bg-black/55 px-2 text-[10px] font-semibold text-white'
            >
              삭제
            </button>
          </div>
        )
      })}
      {trailing}
    </div>
  )
}
