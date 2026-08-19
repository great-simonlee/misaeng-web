'use client'

import { useEffect, type ReactNode } from 'react'

import { cn } from '@lib'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** 스크롤 영역 밖에 고정되는 하단 액션 영역 */
  footer?: ReactNode
  /** 시트 본문 최대 높이 (기본: 70dvh) */
  maxHeightClassName?: string
  className?: string
}

/** 하단에서 올라오는 공용 바텀시트 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxHeightClassName = 'max-h-[min(70dvh,560px)]',
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-[10001] flex items-end justify-center sm:items-center'
      role='dialog'
      aria-modal='true'
      aria-label={title}
    >
      <button
        type='button'
        aria-label='닫기'
        className='absolute inset-0 bg-black/40 backdrop-blur-[2px] nyc-sheet-backdrop'
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.12)] sm:mx-4 sm:rounded-[1.5rem]',
          'nyc-sheet-panel',
          maxHeightClassName,
          className,
        )}
      >
        <div className='flex shrink-0 flex-col items-center pt-3'>
          <span
            className='h-1 w-10 rounded-full bg-[#e2e5ea]'
            aria-hidden
          />
          <div className='flex w-full items-center justify-between gap-3 px-5 pb-2 pt-3'>
            <h3 className='text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
              {title}
            </h3>
            <button
              type='button'
              onClick={onClose}
              className='text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]'
            >
              닫기
            </button>
          </div>
        </div>
        <div
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2',
            footer
              ? 'pb-3'
              : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className='shrink-0 border-t border-[#ebebeb] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
