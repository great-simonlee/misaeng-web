'use client'

import { useEffect, type ReactNode } from 'react'

import { CloseIcon } from '@widgets/ellieo/icons'

/**
 * Ellieo sheet: bottom sheet on phones (28px top corners, grab handle), centered card from 640px.
 * Closes on backdrop tap and Escape; locks page scroll while open.
 */
export function EllieoSheet({
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  closeLabel: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className='fixed inset-0 z-[10050] flex items-end justify-center sm:items-center sm:p-6' role='dialog' aria-modal='true' aria-label={title}>
      <button type='button' aria-label={closeLabel} onClick={onClose} className='absolute inset-0 bg-[rgb(20_18_31/0.4)]' />
      <div className='relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_-12px_rgba(20,18,31,0.3)] sm:max-w-[28rem] sm:rounded-[1.75rem] sm:pb-6 sm:pt-5'>
        <div className='mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--border-muted)] sm:hidden' aria-hidden />
        <div className='flex items-start gap-3'>
          <div className='min-w-0 flex-1'>
            <h2 className='text-[20px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>{title}</h2>
            {subtitle ? <p className='mt-1 text-[14px] leading-snug text-[var(--muted-foreground)]'>{subtitle}</p> : null}
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={closeLabel}
            className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--border)]'
          >
            <CloseIcon className='size-[18px]' />
          </button>
        </div>
        <div className='mt-4'>{children}</div>
      </div>
    </div>
  )
}
