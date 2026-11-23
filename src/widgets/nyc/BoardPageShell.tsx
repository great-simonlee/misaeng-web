import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@lib'
import { byBrand, MISAENG_DESIGN } from '@lib/brand/design'
import { CommunityBoardRail } from '@widgets/nyc/CommunityBoardRail'

type BoardPageShellProps = {
  children: ReactNode
  /** 좁은 커뮤니티 피드 vs 넓은 하우징 그리드 (medium: 커뮤니티 상세, 미생만) */
  width?: 'narrow' | 'medium' | 'wide'
  /** 데스크톱 오른쪽 레일 (lg 이상, 미생만). 생략하면 narrow/medium 페이지는 기본 레일(다른 게시판 + 앱), null이면 레일 없음 */
  rail?: ReactNode
  /** 기본 레일의 "다른 게시판"에서 뺄 게시판 */
  railBoardId?: string
  className?: string
}

/** 목록·상세 공통 페이지 캔버스 */
export function BoardPageShell({
  children,
  width = 'narrow',
  rail,
  railBoardId,
  className,
}: BoardPageShellProps) {
  const canvas = byBrand('relative min-h-screen bg-[var(--canvas)]', 'relative min-h-screen bg-white')
  // Misaeng: every page body has the navbar's width and edges (owner 11-23). Narrow/medium pages (post details, write
  // screens, notices) read best as a column, so the spare width goes to a right rail (other boards + app) instead of
  // stretching text; wide pages use the full width. `rail={null}` opts out (the column then spans the nav width).
  if (MISAENG_DESIGN) {
    const sideRail =
      rail !== undefined
        ? rail
        : width === 'wide'
          ? null
          : <CommunityBoardRail boardId={railBoardId ?? ''} boardTitle='' writeHref='' writeLabel='' showWrite={false} />
    if (sideRail) {
      return (
        <div className={cn(canvas, className)}>
          <div className={cn(NAV_WIDTH, 'relative lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10')}>
            <div className='min-w-0'>{children}</div>
            <aside className='hidden lg:block'>
              <div className='sticky top-[5.5rem] flex flex-col gap-4 pb-10 pt-6'>{sideRail}</div>
            </aside>
          </div>
        </div>
      )
    }
    return (
      <div className={cn(canvas, className)}>
        <div className={cn(NAV_WIDTH, 'relative')}>{children}</div>
      </div>
    )
  }
  return (
    <div className={cn(canvas, className)}>
      <div
        className={cn(
          'relative mx-auto w-full',
          width === 'wide' ? 'max-w-7xl px-4 sm:px-6 lg:px-8' : 'max-w-2xl px-4 sm:px-5',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** The navbar's content box (NycNavbar): every Misaeng page body uses it so edges line up with the logo */
export const NAV_WIDTH = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'

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
        // Flat white card on the gray canvas: hairline ring, barely-there shadow (the app's cards)
        byBrand('rounded-[1.375rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-[var(--card-ring)]', 'rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.05]'),
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
        tone === 'neutral' && 'bg-[#f1f3f6] text-[var(--muted-foreground)]',
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
  if (boardId === 'status') return 'work'
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
