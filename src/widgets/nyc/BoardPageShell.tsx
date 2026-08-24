import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@lib'

type BoardPageShellProps = {
  children: ReactNode
  /** 좁은 커뮤니티 피드 vs 넓은 하우징 그리드 */
  width?: 'narrow' | 'wide'
  className?: string
}

/** 목록·상세 공통 페이지 캔버스 */
export function BoardPageShell({
  children,
  width = 'narrow',
  className,
}: BoardPageShellProps) {
  return (
    <div
      className={cn('relative min-h-screen bg-[#f8f8f9]', className)}
    >
      <div
        className={cn(
          'relative mx-auto w-full',
          width === 'wide'
            ? 'max-w-7xl px-4 sm:px-6 lg:px-8'
            : 'max-w-2xl px-4 sm:px-5',
        )}
      >
        {children}
      </div>
    </div>
  )
}

type BoardSurfaceProps = {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section'
}

/** 흰 표면 카드 (목록 아이템·상세 본문) */
export function BoardSurface({
  children,
  className,
  as: Tag = 'div',
}: BoardSurfaceProps) {
  return (
    <Tag
      className={cn(
        'rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.045)] ring-1 ring-black/[0.03]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

type BoardMetaChipProps = {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'food' | 'market' | 'work'
  className?: string
}

export function BoardMetaChip({
  children,
  tone = 'neutral',
  className,
}: BoardMetaChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight',
        tone === 'neutral' && 'bg-[#f1f2f4] text-[var(--muted-foreground)]',
        tone === 'brand' && 'bg-[var(--brand-light)] text-[var(--brand)]',
        tone === 'food' && 'bg-[#fff4eb] text-[#b45309]',
        tone === 'market' && 'bg-[#eef4ff] text-[#3b5bdb]',
        tone === 'work' && 'bg-[#eefaf4] text-[#0f766e]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function boardToneForId(
  boardId: string,
): BoardMetaChipProps['tone'] {
  if (boardId === 'food') return 'food'
  if (boardId === 'marketplace') return 'market'
  if (boardId === 'cpt-opt') return 'work'
  return 'neutral'
}

type BoardBackLinkProps = {
  href: string
  label: string
  className?: string
}

export function BoardBackLink({ href, label, className }: BoardBackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]',
        className,
      )}
    >
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        className='size-3.5'
        aria-hidden
      >
        <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
      </svg>
      {label}
    </Link>
  )
}
