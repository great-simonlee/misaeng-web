'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import { listMarketThreads, type MarketThread } from '@lib/marketplace/inquiries.client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { MarketChat } from '@widgets/nyc/MarketChat'

/**
 * 마이페이지 → 중고거래 문의 (web, owner 11-23): every conversation as buyer and seller, the same threads as the app.
 * Desktop: list on the left, conversation on the right. Phones: list, then the conversation full screen.
 * `?post=<id>` (from the seller's listing) shows only that listing's conversations; `?thread=<id>` opens one.
 */
export function MarketInboxScreen() {
  const t = useT('community')
  const href = useCityPath()
  const { user, loading: authLoading } = useRequireAuth(href('/me/market'))
  const params = useSearchParams()
  const postFilter = params.get('post')
  const [box, setBox] = useState<'all' | 'selling' | 'buying'>(postFilter ? 'selling' : 'all')
  const [threads, setThreads] = useState<MarketThread[] | null>(null)
  const [selected, setSelected] = useState<string | null>(params.get('thread'))

  const load = useCallback(async () => {
    try {
      setThreads(await listMarketThreads(box, postFilter ?? undefined))
    } catch {
      setThreads([])
    }
  }, [box, postFilter])

  useEffect(() => {
    if (!user) return
    const first = window.setTimeout(() => void load(), 0)
    const timer = window.setInterval(() => document.visibilityState === 'visible' && void load(), 10000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [user, load])

  function pick(id: string | null) {
    setSelected(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('thread', id)
    else url.searchParams.delete('thread')
    window.history.replaceState(null, '', url)
  }

  if (authLoading || !user) {
    return (
      <BoardPageShell width='wide'>
        <LoadingState fullPage />
      </BoardPageShell>
    )
  }

  return (
    <BoardPageShell width='wide'>
      <div className='pb-16 pt-4 sm:pt-5 lg:pt-6'>
        <h1 className='text-[1.75rem] font-bold leading-[1.1] tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.1rem] lg:text-[2.5rem]'>
          {t('market.inquiries')}
        </h1>

        <div className='mt-5 grid overflow-hidden rounded-[1.375rem] bg-white ring-1 ring-[var(--card-ring)] lg:h-[calc(100dvh-14rem)] lg:min-h-[520px] lg:grid-cols-[360px_minmax(0,1fr)]'>
          {/* List */}
          <div className={cn('min-h-0 flex-col border-black/[0.06] lg:flex lg:border-r', selected ? 'hidden' : 'flex')}>
            <div className='flex gap-1.5 border-b border-black/[0.06] p-3'>
              {(['all', 'selling', 'buying'] as const).map((id) => (
                <button
                  key={id}
                  type='button'
                  onClick={() => setBox(id)}
                  className={cn(
                    'h-9 rounded-full px-3.5 text-[13px] font-semibold transition',
                    box === id ? 'bg-[var(--foreground)] text-white' : 'bg-[#f4f5f7] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  )}
                >
                  {t(id === 'all' ? 'market.all' : `market.${id}`)}
                </button>
              ))}
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto'>
              {threads == null ? (
                <LoadingState className='py-16' label='' />
              ) : threads.length === 0 ? (
                <p className='px-5 py-16 text-center text-[14px] text-[var(--muted)]'>{t('market.noInquiries')}</p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type='button'
                    onClick={() => pick(thread.id)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-black/[0.04] px-4 py-3.5 text-left transition hover:bg-[#fafbfc]',
                      selected === thread.id && 'bg-[#FFF6F1]',
                    )}
                  >
                    <span className='size-12 shrink-0 overflow-hidden rounded-xl bg-[#f1f2f4]'>
                      {thread.listing?.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- listing photo
                        <img src={thread.listing.photo} alt='' className='size-full object-cover' />
                      ) : null}
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='flex items-center gap-1.5'>
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[10.5px] font-bold', thread.role === 'seller' ? 'bg-[#FFF1E8] text-[var(--brand)]' : 'bg-[#E8F1FF] text-[#2563EB]')}>
                          {t(thread.role === 'seller' ? 'market.roleSeller' : 'market.roleBuyer')}
                        </span>
                        <span className='truncate text-[14px] font-bold text-[var(--foreground)]'>{thread.otherNickname || t('market.unknownUser')}</span>
                      </span>
                      <span className='mt-0.5 block truncate text-[12px] text-[var(--muted)]'>{thread.listing?.title}</span>
                      <span className='mt-0.5 block truncate text-[13px] text-[var(--muted-foreground)]'>
                        {thread.lastFromMe ? t('market.fromMe', { text: thread.lastMessage ?? '' }) : thread.lastMessage}
                      </span>
                    </span>
                    {thread.unread > 0 ? (
                      <span className='flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] px-1.5 text-[11px] font-bold text-white'>
                        {thread.unread}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className={cn('min-h-0 lg:flex', selected ? 'flex h-[calc(100dvh-10rem)] lg:h-auto' : 'hidden')}>
            {selected ? (
              <MarketChat key={selected} inquiryId={selected} onBack={() => (pick(null), void load())} className='h-full w-full' />
            ) : (
              <p className='m-auto text-[14px] text-[var(--muted)]'>{t('market.pickThread')}</p>
            )}
          </div>
        </div>
      </div>
    </BoardPageShell>
  )
}
