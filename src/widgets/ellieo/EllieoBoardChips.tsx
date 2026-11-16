'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

/** Root list pages of the bottom-tab destinations: Housing · Market · Visa · Jobs (one tab, with its sub-tabs) */
const TAB_PAGES = {
  housing: ['/housing'],
  market: ['/marketplace'],
  visa: ['/status', '/cpt-opt', '/visa', '/green-card'],
  jobs: ['/job-review'],
  companies: ['/companies'],
  postings: ['/companies/postings'],
} as const

export type EllieoTabPage = keyof typeof TAB_PAGES

/**
 * Which bottom-tab page this is (null elsewhere). Those pages have no top bar on phones/tablets and skip the
 * board chip row, which would only repeat the tab bar (user 11-16).
 */
export function useEllieoTabPage(): EllieoTabPage | null {
  const pathname = usePathname()
  const href = useCityPath()
  for (const [key, paths] of Object.entries(TAB_PAGES) as [EllieoTabPage, readonly string[]][]) {
    if (paths.some((path) => pathname === href(path))) return key
  }
  return null
}

/**
 * Board chips (line icon + label) under the top bar, only on the board lists outside the tab bar (Roommates, Food,
 * Ask & Talk, …) to switch between them. Scrolls sideways on phones. Not on Home (it has board shortcuts in its
 * Community section), the bottom-tab pages (Housing · Visa · Jobs), detail, write, account or legal pages (user 11-16).
 */
export function EllieoBoardChips() {
  const pathname = usePathname()
  const href = useCityPath()
  const t = useT('nav')
  const tabPage = useEllieoTabPage()
  const boards = ELLIEO_BOARDS.filter((board) => board.available)
  const boardPaths = boards.map((board) => href(board.path))
  const onBoardList = boardPaths.includes(pathname)
  if (tabPage || !onBoardList) return null

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
                  <board.icon className='size-4 shrink-0' />
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

/** The "Visa · Jobs" tab's sub-tabs (user 11-16): one sideways-scrolling row at the top of those four pages */
const CAREER_TABS = [
  { key: 'visa', path: '/status' },
  { key: 'jobs', path: '/job-review' },
  { key: 'companies', path: '/companies' },
  { key: 'postings', path: '/companies/postings' },
] as const

export function EllieoCareerTabs() {
  const href = useCityPath()
  const t = useT('nav')
  const tabPage = useEllieoTabPage()
  const activeRef = useRef<HTMLAnchorElement>(null)
  // Keep the current sub-tab in view when the row scrolls sideways (long Vietnamese labels)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tabPage])
  if (!tabPage || !CAREER_TABS.some((tab) => tab.key === tabPage)) return null

  return (
    <nav aria-label={t('ellieo.careerTabs.aria')} className='w-full bg-white pt-3 lg:pt-4'>
      <div className='mx-auto max-w-[40rem] xl:max-w-[63rem]'>
        <ul className='flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {CAREER_TABS.map((tab) => {
            const active = tab.key === tabPage
            return (
              <li key={tab.key} className='shrink-0'>
                <Link
                  ref={active ? activeRef : undefined}
                  href={href(tab.path)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-4 text-[14px] font-bold whitespace-nowrap transition',
                    active
                      ? 'bg-[var(--brand)] text-white'
                      : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]',
                  )}
                >
                  {t(`ellieo.careerTabs.${tab.key}`)}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
