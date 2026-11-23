'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'


import { useCity } from '@hooks/useCity'
import { getCity } from '@lib/constants/cities'
import { getCityCategories } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'
import { MisaengStoreButtons } from '@widgets/nyc/MisaengStoreButtons'

/** Boards worth suggesting next to (or under) a community list: the live ones, minus this board. */
export function useSisterBoards(boardId: string) {
  const city = useCity()
  const t = useT('community')
  return getCityCategories(city)
    // 하우징 includes 룸메이트·서블렛 (owner 11-23): neither suggests the other, and 룸메이트 isn't listed on its own
    .filter((category) => category.available && category.id !== boardId && category.id !== 'roommate')
    .filter((category) => !(boardId === 'roommate' && category.id === 'housing'))
    .map((category) => ({
      id: category.id,
      href: category.href,
      title: t(`categories.${category.id}.title`),
      description: t(`categories.${category.id}.description`, { city: getCity(city).name }),
    }))
}

const RAIL_CARD = 'rounded-[1.375rem] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-[var(--card-ring)]'

/**
 * Desktop right rail of a Misaeng community list (owner 11-23 web review): write card, other boards, app download.
 * Lives in BoardPageShell's `rail` slot, so it only shows from lg up and never on Ellieo.
 */
export function CommunityBoardRail({
  boardId,
  boardTitle,
  writeHref,
  writeLabel,
  showWrite,
  beforeBoards,
}: {
  boardId: string
  boardTitle: string
  writeHref: string
  writeLabel: string
  showWrite: boolean
  /** e.g. 중고거래 검색 — between the write card and 다른 게시판 */
  beforeBoards?: ReactNode
}) {
  const t = useT('community')
  const boards = useSisterBoards(boardId)

  return (
    <>
      {showWrite ? (
        <section className={cn(RAIL_CARD, 'bg-[linear-gradient(150deg,#FFF1E8_0%,#FFFFFF_70%)]')}>
          <h2 className='text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>
            {t('rail.writeTitle', { board: boardTitle })}
          </h2>
          <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]'>{t('rail.writeBody')}</p>
          <Link
            href={writeHref}
            className='mt-4 flex h-11 items-center justify-center rounded-full bg-[var(--brand)] px-5 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgb(var(--brand-rgb)/0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)]'
          >
            {writeLabel}
          </Link>
        </section>
      ) : null}

      {beforeBoards}

      {boards.length > 0 ? (
        <section className={cn(RAIL_CARD, 'px-2 py-3')}>
          <h2 className='px-3 pb-1.5 pt-1 text-[13px] font-semibold text-[var(--muted)]'>{t('rail.otherBoards')}</h2>
          <ul>
            {boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={board.href}
                  className='group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-[#f5f6f8]'
                >
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-[14px] font-semibold text-[var(--foreground)]'>{board.title}</span>
                    {board.description ? (
                      <span className='mt-0.5 block truncate text-[12px] text-[var(--muted)]'>{board.description}</span>
                    ) : null}
                  </span>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5' aria-hidden>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={RAIL_CARD}>
        <h2 className='text-[15px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{t('rail.appTitle')}</h2>
        <p className='mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]'>{t('rail.appBody')}</p>
        <MisaengStoreButtons
          appStoreLabel={t('rail.appStore')}
          googlePlayLabel={t('rail.googlePlay')}
          className='mt-4 [&_a]:min-h-[44px] [&_a]:text-[14px]'
        />
      </section>
    </>
  )
}

/** Mobile / narrow screens (no rail): sister boards as chips under an empty list. */
export function SisterBoardChips({ boardId, className }: { boardId: string; className?: string }) {
  const t = useT('community')
  const boards = useSisterBoards(boardId)
  if (boards.length === 0) return null
  return (
    <div className={cn('mt-6 text-center', className)}>
      <p className='text-[12.5px] font-semibold text-[var(--muted)]'>{t('rail.emptyOtherBoards')}</p>
      <div className='mt-3 flex flex-wrap justify-center gap-2'>
        {boards.map((board) => (
          <Link
            key={board.id}
            href={board.href}
            className='inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:ring-black/20'
          >
            {board.title}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** A filter card in the right rail (맛집·하우징 찾기), same look as the 중고거래 물건 찾기 card */
export function RailFilterCard({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={RAIL_CARD}>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{title}</h2>
        {count != null ? <span className='text-[12.5px] font-semibold text-[var(--muted)]'>{count}</span> : null}
      </div>
      <div className='mt-1 space-y-4'>{children}</div>
      {action ? <div className='mt-4'>{action}</div> : null}
    </section>
  )
}

export function RailChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className='mt-3 text-[12.5px] font-semibold text-[var(--foreground)]'>{label}</p>
      <div className='mt-2 flex flex-wrap gap-1.5'>{children}</div>
    </div>
  )
}

export function RailChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-8 rounded-full px-3 text-[12.5px] font-semibold transition',
        active ? 'bg-[var(--foreground)] text-white' : 'bg-[#f4f5f7] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
      )}
    >
      {children}
    </button>
  )
}
