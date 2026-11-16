'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import { BOARD_EMOJI, ELLIEO_BOARDS } from '@widgets/ellieo/nav'

/**
 * Emoji board chips under the top bar (home, board lists, housing list). Scrolls sideways on phones.
 * Renders nothing on detail, write, account and legal pages.
 */
export function EllieoBoardChips() {
  const pathname = usePathname()
  const href = useCityPath()
  const t = useT('nav')
  const home = href()
  const boards = ELLIEO_BOARDS.filter((board) => board.available)
  const boardPaths = boards.map((board) => href(board.path))
  const onHome = pathname === home
  const onBoardList = boardPaths.includes(pathname)
  if (!onHome && !onBoardList) return null

  return (
    <nav aria-label={t('ellieo.boardsAria')} className='w-full border-b border-[var(--border)] bg-white'>
      <div className='mx-auto max-w-[40rem] xl:max-w-[63rem]'>
        <ul className='flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {boards.map((board, index) => {
            const target = boardPaths[index]
            const active = pathname === target
            return (
              <li key={board.id} className='shrink-0'>
                <Link
                  href={target}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold whitespace-nowrap transition',
                    active
                      ? 'bg-[var(--foreground)] text-white'
                      : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]',
                  )}
                >
                  <span aria-hidden className='text-[15px] leading-none'>{BOARD_EMOJI[board.id]}</span>
                  {t(`ellieo.short.${board.id}`)}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
