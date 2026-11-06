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
import { fetchThread, sendReply, type SupportConversation, type SupportMessage } from '@lib/support/client'

/** One 문의/건의 thread: the messages and a reply box (not realtime; refreshed on open and every 30 s). */
export function MyInquiryThreadScreen({ id }: { id: string }) {
  const t = useT('me')
  const format = useFormat()
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const toast = useToast()
  const { user, loading } = useAuth()
  const [conversation, setConversation] = useState<SupportConversation | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [failed, setFailed] = useState(false)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace(cityLoginPath(city, href(`/me/inquiries/${id}`)))
  }, [user, loading, router, city, href, id])

  const load = useCallback(async () => {
    try {
      const thread = await fetchThread(id)
      setConversation(thread.conversation)
      setMessages(thread.messages)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [id])

  useEffect(() => {
    if (!user) return
    void load()
    const timer = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(timer)
  }, [user, load])

  async function send() {
    const body = reply.trim()
    if (!body) return
    setBusy(true)
    try {
      await sendReply(id, body)
      setReply('')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, t('support.unavailable')))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user || (!conversation && !failed)) return <LoadingState fullPage />

  return (
    <div className='relative flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]'>
      <div className={cn('mx-auto flex w-full max-w-3xl flex-1 flex-col pb-14 pt-8 sm:pb-16 sm:pt-10', NYC_PAGE_SHELL_CLASS)}>
        <Link href={href('/me/inquiries')} className='text-[13px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]'>
          ← {t('support.back')}
        </Link>
        {!conversation ? (
          <p className='mt-8 text-[14px] text-[var(--muted)]'>{t('support.notFound')}</p>
        ) : (
          <>
            <div className='mt-4 flex flex-wrap items-center gap-2'>
              <span className='rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--muted-foreground)]'>
                {t(`support.${conversation.kind === 'suggestion' ? 'suggestion' : 'question'}`)}
              </span>
              <span className={cn('text-[12px] font-semibold', conversation.status === 'waiting_user' ? 'text-emerald-600' : 'text-[var(--muted)]')}>
                {t(`support.status.${conversation.status}`)}
              </span>
            </div>
            <h1 className='mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>{conversation.title}</h1>

            <ol className='mt-6 space-y-3'>
              {messages.map((message) => {
                const mine = message.sender === 'user'
                return (
                  <li key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%]', mine ? 'items-end text-right' : 'items-start')}>
                      <p className='mb-1 text-[12px] text-[var(--muted)]'>
                        {mine ? '' : `${message.senderName || t('support.staff')} · `}
                        {format.date(new Date(message.createdAt), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <div
                        className={cn(
                          'whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-[15px] leading-relaxed',
                          mine ? 'bg-[var(--brand)] text-white' : 'bg-white text-[var(--foreground)] ring-1 ring-black/[0.06]',
                        )}
                      >
                        {message.body}
                      </div>
                      {message.redactions > 0 && <p className='mt-1 text-[11px] text-[var(--muted)]'>🔒 {t('support.redacted')}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>

            {conversation.status === 'closed' && (
              <p className='mt-6 text-center text-[12px] text-[var(--muted)]'>{t('support.closedNotice')}</p>
            )}

            <div className='mt-6 rounded-[1.25rem] bg-white p-4 ring-1 ring-black/[0.06]'>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={t('support.replyPlaceholder')}
                className='w-full resize-y rounded-xl border border-black/10 px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-[var(--brand)]'
              />
              <div className='mt-3 flex items-center justify-between gap-3'>
                <p className='text-[12px] text-[var(--muted)]'>{t('support.replyHint')}</p>
                <button
                  type='button'
                  disabled={busy || !reply.trim()}
                  onClick={() => void send()}
                  className='h-10 shrink-0 rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-40'
                >
                  {busy ? '…' : t('support.send')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
