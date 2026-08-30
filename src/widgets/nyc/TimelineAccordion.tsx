'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@lib'

export type TimelineAccordionItem = {
  id: string
  stepNumber: number
  title: string
  isLatest?: boolean
  /** 접힌 상태 한 줄 미리보기 */
  preview?: string | null
  hasReview?: boolean
  body: ReactNode
}

type TimelineAccordionProps = {
  items: TimelineAccordionItem[]
  /** 처음 열린 스텝 (보통 최신). null이면 모두 접힘 */
  defaultOpenId?: string | null
  accentColor: string
  softColor: string
  className?: string
}

/** 타임라인 스텝 아코디언 — 한 번에 하나만 열림 */
export function TimelineAccordion({
  items,
  defaultOpenId = null,
  accentColor,
  softColor,
  className,
}: TimelineAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId)

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <ol className={cn('space-y-2', className)}>
      {items.map((item) => {
        const open = openId === item.id
        return (
          <li key={item.id}>
            <div
              className={cn(
                'overflow-hidden rounded-2xl bg-white ring-1 transition-[box-shadow,ring-color] duration-200',
                open || item.isLatest
                  ? 'ring-[var(--brand)]/25'
                  : 'ring-black/[0.06]',
              )}
            >
              <button
                type='button'
                aria-expanded={open}
                onClick={() => toggle(item.id)}
                className='flex w-full items-start gap-3 px-4 py-3.5 text-left touch-manipulation transition-colors hover:bg-[#fafbfc] sm:px-5 sm:py-4'
              >
                <span
                  className='inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold'
                  style={{
                    backgroundColor: softColor,
                    color: accentColor,
                  }}
                >
                  {item.stepNumber}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                      {item.title}
                    </p>
                    {item.isLatest ? (
                      <span className='inline-flex rounded-full bg-[#fff8f5] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
                        최신
                      </span>
                    ) : null}
                    {item.hasReview ? (
                      <span className='inline-flex rounded-full bg-[#f4f5f7] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)] ring-1 ring-black/8'>
                        후기
                      </span>
                    ) : null}
                  </div>
                  {!open && item.preview ? (
                    <p className='mt-1 line-clamp-1 text-[13px] leading-snug text-[var(--muted)]'>
                      {item.preview}
                    </p>
                  ) : null}
                </div>
                <ChevronIcon
                  className={cn(
                    'mt-1 size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ease-out',
                    open && 'rotate-180',
                  )}
                />
              </button>

              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out',
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className='min-h-0 overflow-hidden'>
                  <div
                    className={cn(
                      'border-t border-black/[0.04] px-4 pb-4 pt-1 sm:px-5 sm:pb-5',
                      'transition-opacity duration-200 ease-out',
                      open ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    <div className='pl-10'>{item.body}</div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='M6 9l6 6 6-6' />
    </svg>
  )
}
