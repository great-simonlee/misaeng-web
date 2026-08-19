import Link from 'next/link'

import { NYC_CATEGORIES } from '@lib/constants/nyc'

export function BoardHighlightCards() {
  return (
    <div className='flex flex-wrap gap-2 py-0.5'>
      {NYC_CATEGORIES.map((board) => {
        if (board.available && board.href) {
          return (
            <Link
              key={board.id}
              href={board.href}
              className='inline-flex h-8 items-center rounded-full bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] ring-1 ring-[var(--border)] touch-manipulation transition hover:bg-[var(--foreground)] hover:text-white hover:ring-[var(--foreground)] active:scale-[0.98] sm:h-9 sm:px-3.5 sm:text-[13px]'
            >
              {board.title}
            </Link>
          )
        }

        return (
          <span
            key={board.id}
            className='inline-flex h-8 cursor-default items-center gap-1 rounded-full bg-[#f4f5f7] px-3 text-xs font-medium text-[#c5c8ce] ring-1 ring-[#eceef1] sm:h-9 sm:px-3.5 sm:text-[13px]'
            aria-disabled
          >
            {board.title}
            <span className='text-[8px] font-medium leading-none tracking-tight text-[#d0d3d8] sm:text-[9px]'>
              Coming Soon
            </span>
          </span>
        )
      })}
    </div>
  )
}
