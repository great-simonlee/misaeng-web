'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@lib'
import { useCity, useCityInfo } from '@hooks/useCity'
import { getCityCategories } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'

/** Board tiles on the city home: icon, name, one line about it. Boards not open yet stay as quiet "coming soon" tiles. */
export function BoardHighlightCards() {
  const t = useT('community')
  const city = useCity()
  const cityInfo = useCityInfo()
  // Open boards first; "coming soon" ones trail at the end
  const categories = [...getCityCategories(city)].sort((a, b) => Number(Boolean(b.available)) - Number(Boolean(a.available)))

  return (
    <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4'>
      {categories.map((board) => {
        const style = BOARD_STYLES[board.id] ?? BOARD_STYLES.default
        const content = (
          <>
            <span
              className='flex size-10 items-center justify-center rounded-2xl'
              style={{ backgroundColor: style.tint, color: style.color }}
            >
              {style.icon}
            </span>
            <span className='mt-4 block text-[15px] font-semibold tracking-[-0.01em] text-[var(--foreground)] sm:text-base'>
              {t(`categories.${board.id}.title`)}
            </span>
            <span className='mt-1 line-clamp-2 text-[12.5px] leading-snug text-[var(--muted)] sm:text-[13px]'>
              {board.available ? t(`categories.${board.id}.description`, { city: cityInfo.shortLabel }) : t('categories.comingSoon')}
            </span>
          </>
        )
        if (board.available && board.href) {
          return (
            <Link
              key={board.id}
              href={board.href}
              className='group relative flex flex-col rounded-[1.375rem] bg-white p-4 ring-1 ring-[var(--card-ring)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] active:scale-[0.99] sm:p-5'
            >
              {content}
              <ArrowIcon className='absolute right-4 top-4 size-4 text-[var(--slate-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--foreground)] sm:right-5 sm:top-5' />
            </Link>
          )
        }
        return (
          <div
            key={board.id}
            className={cn('flex cursor-default flex-col rounded-[1.375rem] bg-white/60 p-4 opacity-60 ring-1 ring-[var(--card-ring)] sm:p-5')}
            aria-disabled
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className} aria-hidden>
      <path strokeLinecap='round' strokeLinejoin='round' d='M7 17 17 7M9 7h8v8' />
    </svg>
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' className='size-5' aria-hidden>
      {children}
    </svg>
  )
}

/** Per-board accent (the apps' board colours) */
const BOARD_STYLES: Record<string, { color: string; tint: string; icon: ReactNode }> = {
  housing: {
    color: '#F64310',
    tint: '#fff1ed',
    icon: (
      <Icon>
        <path d='M3 10.5 12 3l9 7.5' />
        <path d='M5 9.5V21h14V9.5' />
        <path d='M10 21v-6h4v6' />
      </Icon>
    ),
  },
  roommate: {
    color: '#6d28d9',
    tint: '#f3efff',
    icon: (
      <Icon>
        <circle cx='9' cy='8' r='3.2' />
        <path d='M3.5 20a5.5 5.5 0 0 1 11 0' />
        <path d='M16 5.2a3 3 0 0 1 0 5.6M18.5 20a5.5 5.5 0 0 0-3-4.9' />
      </Icon>
    ),
  },
  food: {
    color: '#c2410c',
    tint: '#fff4eb',
    icon: (
      <Icon>
        <path d='M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10' />
        <path d='M17 21V3c-2.2 1.2-3.5 3.6-3.5 6.5V13H17' />
      </Icon>
    ),
  },
  status: {
    color: '#0f766e',
    tint: '#ebf8f4',
    icon: (
      <Icon>
        <path d='M10.5 13.5 3 11l1.5-1.5 7 1L16 6c1-1 2.6-1.2 3.3-.5s.5 2.3-.5 3.3l-4.5 4.5 1 7L13.8 22l-2.5-7.5' />
      </Icon>
    ),
  },
  'job-review': {
    color: '#1d4ed8',
    tint: '#eef3ff',
    icon: (
      <Icon>
        <rect x='3' y='7' width='18' height='13' rx='2.5' />
        <path d='M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18' />
      </Icon>
    ),
  },
  anonymous: {
    color: '#334155',
    tint: '#eff2f6',
    icon: (
      <Icon>
        <path d='M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z' />
      </Icon>
    ),
  },
  events: {
    color: '#be185d',
    tint: '#fdf0f6',
    icon: (
      <Icon>
        <rect x='3.5' y='5' width='17' height='15.5' rx='2.5' />
        <path d='M8 3v4M16 3v4M3.5 10h17' />
      </Icon>
    ),
  },
  marketplace: {
    color: '#3b5bdb',
    tint: '#eef2ff',
    icon: (
      <Icon>
        <path d='M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8Z' />
        <path d='M9 8V6.5a3 3 0 0 1 6 0V8' />
      </Icon>
    ),
  },
  default: {
    color: '#334155',
    tint: '#eff2f6',
    icon: (
      <Icon>
        <circle cx='12' cy='12' r='8' />
      </Icon>
    ),
  },
}
