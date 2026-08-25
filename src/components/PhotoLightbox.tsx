'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@lib'

export type PhotoLightboxItem = {
  id: string
  imageUrl: string
  caption?: string | null
}

type PhotoLightboxProps = {
  open: boolean
  items: PhotoLightboxItem[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
  /** 상단 작은 라벨 (예: 메뉴) */
  eyebrow?: string
}

/**
 * 전체 화면 사진 확대
 * - 사진 상단 위치·높이 고정 (캡션 길이와 무관)
 * - 텍스트는 사진 바로 아래
 */
export function PhotoLightbox({
  open,
  items,
  index,
  onClose,
  onIndexChange,
  eyebrow,
}: PhotoLightboxProps) {
  const count = items.length
  const safeIndex = count > 0 ? Math.min(Math.max(index, 0), count - 1) : 0
  const current = count > 0 ? items[safeIndex] : null
  const caption = current?.caption?.trim() || ''

  const goPrev = useCallback(() => {
    if (count <= 1) return
    onIndexChange((safeIndex - 1 + count) % count)
  }, [count, safeIndex, onIndexChange])

  const goNext = useCallback(() => {
    if (count <= 1) return
    onIndexChange((safeIndex + 1) % count)
  }, [count, safeIndex, onIndexChange])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, goPrev, goNext])

  if (!open || !current || typeof document === 'undefined') return null

  return createPortal(
    <div
      className='fixed inset-0 z-[10050] flex flex-col bg-black'
      role='dialog'
      aria-modal
      aria-label='사진 크게 보기'
      onClick={onClose}
    >
      <div
        className='relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)]'
        onClick={(e) => e.stopPropagation()}
      >
        <p className='min-w-0 truncate text-[13px] font-medium text-white/70'>
          {eyebrow || '\u00A0'}
        </p>
        <button
          type='button'
          onClick={onClose}
          className='inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white touch-manipulation transition hover:bg-white/20'
          aria-label='닫기'
        >
          <CloseIcon className='size-5' />
        </button>
      </div>

      <div
        className='relative min-h-0 flex-1 overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        {/*
          사진 스테이지: 높이·상단 위치 고정
          → 캡션이 짧아도/길어도 사진은 같은 자리에 유지
        */}
        <div className='mx-auto flex w-full max-w-3xl flex-col items-center px-3 pt-[min(14vh,6rem)] sm:px-10 sm:pt-[min(16vh,7rem)]'>
          <div className='relative h-[min(42dvh,420px)] w-full shrink-0'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.imageUrl}
              alt={caption || ''}
              className='absolute inset-0 m-auto max-h-full max-w-full object-contain select-none'
              draggable={false}
            />

            {count > 1 ? (
              <>
                <NavButton
                  ariaLabel='이전 사진'
                  onClick={goPrev}
                  className='left-1 sm:left-2'
                >
                  <ChevronIcon className='size-5 rotate-180' />
                </NavButton>
                <NavButton
                  ariaLabel='다음 사진'
                  onClick={goNext}
                  className='right-1 sm:right-2'
                >
                  <ChevronIcon className='size-5' />
                </NavButton>
              </>
            ) : null}
          </div>

          {caption ? (
            <p className='mt-4 max-w-lg px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[15px] leading-relaxed text-white sm:mt-5 sm:text-[16px]'>
              {caption}
            </p>
          ) : (
            <div
              className='pb-[max(1.5rem,env(safe-area-inset-bottom))]'
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function NavButton({
  children,
  onClick,
  ariaLabel,
  className,
}: {
  children: ReactNode
  onClick: () => void
  ariaLabel: string
  className?: string
}) {
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white touch-manipulation backdrop-blur-sm transition hover:bg-white/25',
        className,
      )}
    >
      {children}
    </button>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' d='M6 6l12 12M18 6 6 18' />
    </svg>
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
