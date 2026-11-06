'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import {
  listAllConversations,
  listInquiries,
  startInquiry,
  supportKindKey,
  supportThreadTitle,
  useSupportConfig,
  type SupportConversation,
} from '@lib/support/client'

/** Ellieo's board also lists listing inquiries (housing threads); Misaeng's housing chat lives in the app. */
const LIST_HOUSING_THREADS = BRAND_CONFIG.theme === 'ellieo'

/** My → 문의/건의하기: board-style threads with the team (same data as the app). */
export function MyInquiriesScreen() {
  const t = useT('me')
  const format = useFormat()
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const { user, loading } = useAuth()
  const config = useSupportConfig()
  const toast = useToast()
  const [items, setItems] = useState<SupportConversation[] | null>(null)
  const [kind, setKind] = useState<'question' | 'suggestion'>('question')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace(cityLoginPath(city, href('/me/inquiries')))
  }, [user, loading, router, city, href])

  const load = useCallback(async () => {
    try {
      setItems(await (LIST_HOUSING_THREADS ? listAllConversations() : listInquiries()))
    } catch {
      setItems((current) => current ?? [])
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  async function submit() {
    if (!title.trim() || !message.trim()) return
    setBusy(true)
    try {
      const conversation = await startInquiry(kind, title.trim(), message.trim())
      toast.success(t('support.submitted'))
      router.push(href(`/me/inquiries/${conversation.id}`))
    } catch (error) {
      toast.error(getErrorMessage(error, t('support.unavailable')))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user || !config) return <LoadingState fullPage />

  return (
    <div className='relative flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]'>
      <div className={cn('mx-auto flex w-full max-w-3xl flex-1 flex-col pb-14 pt-8 sm:pb-16 sm:pt-10', NYC_PAGE_SHELL_CLASS)}>
        <p className='text-[11px] font-medium tracking-[0.18em] text-[var(--muted)]'>ACCOUNT</p>
        <h1 className='mt-1.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] lg:text-[1.75rem]'>
          {t('support.title')}
        </h1>
        <p className='mt-1.5 text-[14px] text-[var(--muted-foreground)]'>{t('support.intro')}</p>

        {!config.inquiries ? (
          <p className='mt-8 rounded-2xl bg-white p-6 text-[14px] text-[var(--muted-foreground)] ring-1 ring-black/[0.05]'>
            {t('support.unavailable')}
          </p>
        ) : (
          <>
            {composing ? (
              <div className='mt-6 rounded-[1.25rem] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.05] sm:p-6'>
                <div className='flex gap-2'>
                  {(['question', 'suggestion'] as const).map((value) => (
                    <button
                      key={value}
                      type='button'
                      onClick={() => setKind(value)}
                      className={cn(
                        'h-9 rounded-full px-4 text-sm font-semibold transition',
                        kind === value ? 'bg-[var(--brand)] text-white' : 'bg-[#f3f4f6] text-[var(--muted-foreground)] hover:bg-[#eceef1]',
                      )}
                    >
                      {t(`support.${value}`)}
                    </button>
                  ))}
                </div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder={t('support.subject')}
                  className='mt-4 h-12 w-full rounded-xl border border-black/10 px-4 text-[15px] outline-none focus:border-[var(--brand)]'
                />
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={2000}
                  rows={7}
                  placeholder={t('support.message')}
                  className='mt-3 w-full resize-y rounded-xl border border-black/10 px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-[var(--brand)]'
                />
                <p className='mt-2 text-[12px] text-[var(--muted)]'>{t('support.replyHint')}</p>
                <div className='mt-4 flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => setComposing(false)}
                    className='h-11 rounded-full px-5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-black/[0.04]'
                  >
                    {t('support.back')}
                  </button>
                  <button
                    type='button'
                    disabled={busy || !title.trim() || !message.trim()}
                    onClick={() => void submit()}
                    className='h-11 rounded-full bg-[var(--brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-40'
                  >
                    {busy ? '…' : t('support.submit')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setComposing(true)}
                className='mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand)] text-[15px] font-semibold text-white shadow-[0_8px_20px_rgb(var(--brand-rgb)/0.22)] transition hover:bg-[var(--brand-hover)] sm:w-auto sm:px-8'
              >
                {t('support.new')}
              </button>
            )}

            <div className='mt-6'>
              {items === null ? (
                <LoadingState />
              ) : items.length === 0 ? (
                <p className='rounded-2xl bg-white py-14 text-center text-[14px] text-[var(--muted)] ring-1 ring-black/[0.05]'>
                  {t('support.empty')}
                </p>
              ) : (
                <ul className='divide-y divide-black/[0.05] overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.05]'>
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link href={href(`/me/inquiries/${item.id}`)} className='flex gap-4 px-5 py-4 transition hover:bg-[#fafbfc]'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='shrink-0 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]'>
                              {t(`support.${supportKindKey(item.kind)}`)}
                            </span>
                            <span className='truncate text-[15px] font-semibold text-[var(--foreground)]'>{supportThreadTitle(item)}</span>
                          </div>
                          <p className='mt-1 line-clamp-2 text-[14px] text-[var(--muted-foreground)]'>{item.lastMessagePreview}</p>
                          <p className={cn('mt-1.5 text-[12px] font-semibold', item.status === 'waiting_user' ? 'text-emerald-600' : 'text-[var(--muted)]')}>
                            {t(`support.status.${item.status}`)}
                          </p>
                        </div>
                        <div className='flex shrink-0 flex-col items-end gap-2'>
                          <span className='text-[12px] text-[var(--muted)]'>{format.relative(new Date(item.lastMessageAt))}</span>
                          {item.unread > 0 && (
                            <span className='min-w-[22px] rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-center text-[12px] font-bold text-white'>
                              {item.unread}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
