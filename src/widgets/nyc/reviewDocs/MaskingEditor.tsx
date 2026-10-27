'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { useT } from '@lib/i18n/client'
import type { LoadedImage, MaskBox } from '@lib/verification/reviewDocs.client'

/**
 * Draw black boxes over sensitive parts of an image. Boxes are kept in image pixels; the parent burns them into a
 * flattened JPEG (renderMaskedJpeg) so only the masked render is ever uploaded.
 */
export function MaskingEditor({
  image,
  initialBoxes,
  maskHint,
  onCancel,
  onDone,
}: {
  image: LoadedImage
  initialBoxes: MaskBox[]
  maskHint?: string
  onCancel: () => void
  onDone: (boxes: MaskBox[]) => void
}) {
  const t = useT('me.reviewDocs')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [boxes, setBoxes] = useState<MaskBox[]>(initialBoxes)
  const [draft, setDraft] = useState<MaskBox | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const [displayWidth, setDisplayWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setDisplayWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Fit width, and keep tall screenshots within the viewport height.
  const maxHeight = typeof window === 'undefined' ? 600 : Math.max(280, window.innerHeight * 0.55)
  const scale = displayWidth ? Math.min(displayWidth / image.width, maxHeight / image.height) : 0
  const cssWidth = Math.round(image.width * scale)
  const cssHeight = Math.round(image.height * scale)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !scale) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(cssWidth * ratio)
    canvas.height = Math.round(cssHeight * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0)
    ctx.drawImage(image.source, 0, 0, image.width, image.height)
    ctx.fillStyle = '#000'
    for (const box of boxes) ctx.fillRect(box.x, box.y, box.w, box.h)
    if (draft) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)'
      ctx.fillRect(draft.x, draft.y, draft.w, draft.h)
      ctx.strokeStyle = '#ff6b00'
      ctx.lineWidth = 2 / scale
      ctx.strokeRect(draft.x, draft.y, draft.w, draft.h)
    }
  }, [boxes, draft, image, scale, cssWidth, cssHeight])

  useEffect(() => {
    draw()
  }, [draw])

  function toImagePoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * image.width
    const y = ((event.clientY - rect.top) / rect.height) * image.height
    return { x: Math.min(Math.max(x, 0), image.width), y: Math.min(Math.max(y, 0), image.height) }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    start.current = toImagePoint(event)
    setDraft(null)
    setConfirmEmpty(false)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!start.current) return
    const p = toImagePoint(event)
    const s = start.current
    setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) })
  }

  function onPointerUp() {
    const box = draft
    start.current = null
    setDraft(null)
    // ignore taps (smaller than ~6 screen px)
    if (box && box.w * scale >= 6 && box.h * scale >= 6) setBoxes((prev) => [...prev, box])
  }

  function finish() {
    if (boxes.length === 0 && !confirmEmpty) {
      setConfirmEmpty(true)
      return
    }
    onDone(boxes)
  }

  return (
    <div className='space-y-3'>
      <p className='text-[13px] leading-relaxed text-[var(--muted)]'>{t('mask.hint')}</p>
      {maskHint ? (
        <p className='rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-900'>{maskHint}</p>
      ) : null}
      <div ref={wrapRef} className='flex w-full justify-center rounded-xl bg-[#f4f5f7] p-2'>
        {scale ? (
          <canvas
            ref={canvasRef}
            style={{ width: cssWidth, height: cssHeight, touchAction: 'none' }}
            className='cursor-crosshair select-none rounded-md'
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div style={{ height: 200 }} />
        )}
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <button
          type='button'
          onClick={() => setBoxes((prev) => prev.slice(0, -1))}
          disabled={boxes.length === 0}
          className='rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-black/10 disabled:opacity-40'
        >
          {t('mask.undo')}
        </button>
        <button
          type='button'
          onClick={() => setBoxes([])}
          disabled={boxes.length === 0}
          className='rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-black/10 disabled:opacity-40'
        >
          {t('mask.clear')}
        </button>
        <span className='ml-auto text-[12px] font-medium text-[var(--muted)]'>
          {t('pick.masked', { count: boxes.length })}
        </span>
      </div>
      {confirmEmpty ? (
        <p className='rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700'>{t('mask.noBoxes')}</p>
      ) : null}
      <div className='flex gap-2 pt-1'>
        <button
          type='button'
          onClick={onCancel}
          className='flex-1 rounded-full bg-white py-3 text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-black/10'
        >
          {t('cancel')}
        </button>
        <button
          type='button'
          onClick={finish}
          className='flex-[2] rounded-full bg-[var(--brand)] py-3 text-[14px] font-semibold text-white'
        >
          {confirmEmpty ? t('mask.noBoxesConfirm') : t('mask.done')}
        </button>
      </div>
    </div>
  )
}
