'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { EllieoDots } from '@components/EllieoDots'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { MARKET_CATEGORIES } from '@lib/community/marketplace'
import { fetchMarketPage } from '@lib/community/marketplace.client'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import { BagIcon, PlusIcon } from '@widgets/ellieo/icons'

import { MarketCard } from './MarketCard'

/** List tabs, same order as the app: moving sale, free, then the categories */
const TABS = ['all', 'moving', 'free', ...MARKET_CATEGORIES.filter((id) => id !== 'moving')] as const

/**
 * Ellieo web marketplace (중고거래), same data and rules as the app's Market tab:
 * GET /api/community?board=marketplace&city&category&active=1 (sold items drop out), 20 per page.
 */
export function EllieoMarketListScreen() {
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<(typeof TABS)[number]>('all')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'more' | 'error'>('loading')
  const requestId = useRef(0)

  const load = useCallback(
    async (next: string | null) => {
      const id = ++requestId.current
      setState(next ? 'more' : 'loading')
      try {
        const page = await fetchMarketPage(city, tab, next)
        if (id !== requestId.current) return
        setPosts((prev) => (next ? [...prev, ...page.posts] : page.posts))
        setCursor(page.nextCursor)
        setState('ready')
      } catch {
        if (id === requestId.current) setState('error')
      }
    },
    [city, tab],
  )

  useEffect(() => {
    void load(null)
  }, [load])

  const sellHref = href('/marketplace/new')
  const sellTarget = authLoading || user ? sellHref : cityLoginPath(city, sellHref)

  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-28 pt-3 lg:max-w-[52rem] lg:pt-8'>
        <header className='max-lg:sr-only'>
          <h1 className='text-[2rem] font-bold tracking-[-0.03em] text-[var(--foreground)]'>{t('ellieoMarket.title')}</h1>
          <p className='mt-1 text-[15px] text-[var(--muted-foreground)]'>{t('ellieoMarket.intro')}</p>
        </header>

        <nav aria-label={t('ellieoMarket.title')} className='-mx-4 lg:mt-5'>
          <ul className='flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {TABS.map((id) => (
              <li key={id} className='shrink-0'>
                <button
                  type='button'
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition',
                    tab === id
                      ? 'bg-[var(--foreground)] text-white'
                      : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]',
                  )}
                >
                  {id === 'all' ? t('ellieoMarket.all') : t(`ellieoMarket.categories.${id}`)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {state === 'loading' ? (
          <div className='flex justify-center py-20'>
            <EllieoDots />
          </div>
        ) : posts.length === 0 ? (
          <div className='mt-6 flex flex-col items-center rounded-[1.75rem] bg-[var(--surface)] px-6 py-12 text-center'>
            <EllieoIconBadge icon={BagIcon} />
            <p className='mt-4 text-[17px] font-bold text-[var(--foreground)]'>{t('ellieoMarket.emptyTitle')}</p>
            <p className='mt-1 text-[14px] text-[var(--muted-foreground)]'>{t('ellieoMarket.emptyBody')}</p>
            <Link
              href={sellTarget}
              className='mt-5 inline-flex h-11 items-center gap-1.5 rounded-full bg-[var(--brand)] px-5 text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
            >
              <PlusIcon className='size-[18px]' strokeWidth={2.4} />
              {t('ellieoMarket.sell')}
            </Link>
          </div>
        ) : (
          <>
            <ul className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3'>
              {posts.map((post) => (
                <li key={post.id}>
                  <MarketCard post={post} href={href(`/marketplace/${encodeURIComponent(post.id)}`)} />
                </li>
              ))}
            </ul>
            {cursor ? (
              <div className='mt-6 flex justify-center'>
                <button
                  type='button'
                  onClick={() => void load(cursor)}
                  disabled={state === 'more'}
                  className='inline-flex h-11 min-w-[9rem] items-center justify-center rounded-full bg-[var(--surface)] px-5 text-[15px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--border)]'
                >
                  {state === 'more' ? <EllieoDots /> : t('ellieoMarket.loadMore')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Sell button: bottom-right, above the tab bar */}
      <Link
        href={sellTarget}
        className='fixed bottom-[calc(var(--bottom-nav-h)+0.75rem)] right-4 z-[9000] inline-flex h-12 items-center gap-1.5 rounded-full bg-[var(--brand)] pl-4 pr-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(31,94,255,0.7)] transition hover:bg-[var(--brand-hover)] active:scale-95 lg:bottom-24 lg:right-8'
      >
        <PlusIcon className='size-[18px]' strokeWidth={2.4} />
        {t('ellieoMarket.sell')}
      </Link>
    </div>
  )
}
