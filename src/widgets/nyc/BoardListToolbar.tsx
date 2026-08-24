'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@lib'

type BoardListToolbarProps = {
  breadcrumbLabel: string
  /** 보드 한 줄 소개 */
  intro?: string
  writeHref: string
  writeLabel: string
  onFilterClick?: () => void
  filterCount?: number
  showFilter?: boolean
  showWrite?: boolean
  className?: string
  /** 툴바 아래 추가 영역 (칩 등) */
  children?: ReactNode
}

export function BoardListToolbar({
  breadcrumbLabel,
  intro,
  writeHref,
  writeLabel,
  onFilterClick,
  filterCount = 0,
  showFilter = true,
  showWrite = true,
  className,
  children,
}: BoardListToolbarProps) {
  return (
    <header className={cn('pt-5 sm:pt-8 lg:pt-10', className)}>
      <div className='flex items-center justify-between gap-3'>
        <h1 className='min-w-0 flex-1 truncate text-[1.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.75rem] lg:text-[2rem]'>
          {breadcrumbLabel}
        </h1>

        {(showFilter || showWrite) && (
          <div className='flex shrink-0 items-center gap-2'>
            {showFilter && onFilterClick ? (
              <button
                type='button'
                onClick={onFilterClick}
                aria-label={
                  filterCount > 0 ? `필터 ${filterCount}개 적용됨` : '필터'
                }
                className={cn(
                  'relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[13px] font-medium touch-manipulation transition sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3.5',
                  filterCount > 0
                    ? 'border-[var(--brand)]/30 text-[var(--brand)]'
                    : 'border-black/[0.08] text-[var(--foreground)] hover:border-black/15',
                )}
              >
                <FiltersIcon className='size-3.5 shrink-0' />
                <span className='hidden sm:inline'>필터</span>
                {filterCount > 0 && (
                  <span className='absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold leading-none text-white sm:static sm:ml-0.5 sm:h-auto sm:min-w-4.5 sm:px-1.5 sm:py-0.5'>
                    {filterCount}
                  </span>
                )}
              </button>
            ) : null}

            {showWrite ? (
              <Link
                href={writeHref}
                className='inline-flex h-9 max-w-[10rem] items-center gap-1.5 rounded-full bg-[var(--brand)] px-3.5 text-[13px] font-semibold leading-none text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] hover:shadow-[0_6px_18px_rgba(246,67,16,0.34)] active:scale-[0.98] sm:max-w-none sm:px-4'
              >
                <WriteIcon className='size-3.5 shrink-0' />
                <span className='truncate'>{writeLabel}</span>
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {intro ? (
        <p className='mt-3 max-w-2xl text-[13px] leading-[1.45] text-[var(--muted)] sm:mt-3.5 sm:text-[14px] sm:leading-relaxed lg:text-[15px]'>
          {intro}
        </p>
      ) : null}

      {children ? (
        <div className='mt-3 sm:mt-3.5'>{children}</div>
      ) : null}
    </header>
  )
}

/** 하우징·커뮤니티 공통 빠른 필터 칩 */
export function BoardQuickChip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <button
      type='button'
      role='option'
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium leading-none touch-manipulation transition sm:h-9 sm:px-3.5 sm:text-[13px]',
        active
          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)] shadow-sm'
          : 'border-black/[0.08] bg-white text-[var(--foreground)] hover:border-black/15',
      )}
    >
      {icon ? <span className='opacity-70'>{icon}</span> : null}
      {label}
    </button>
  )
}

function FiltersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        d='M4 7h10M18 7h2M4 12h2M10 12h10M4 17h8M16 17h4'
      />
      <circle cx='16' cy='7' r='2' />
      <circle cx='8' cy='12' r='2' />
      <circle cx='14' cy='17' r='2' />
    </svg>
  )
}

function WriteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'
      />
    </svg>
  )
}
