'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

import { useIsPhone } from '@components/AppHandoff'
import { useCity } from '@hooks/useCity'
import { useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { hrefForCommunityPost } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import {
  blockMarketCounterpart,
  MarketInquiryError,
  openMarketThread,
  replyInMarketThread,
  reportMarketThread,
  sendFirstInquiry,
  type MarketMessage,
  type MarketThread,
} from '@lib/marketplace/inquiries.client'
import type { CommunityPost } from '@/types/nyc'

/**
 * 중고거래 대화 on the web (owner 11-23, 1단계): the same threads as the app's market chat. New messages are checked
 * every few seconds while the conversation is open (no live socket); push notifications still go to the app.
 * Safety as in the app: 선입금 warning, report, block, closed once the item is sold.
 */

const POLL_MS = 5000
const MESSAGE_MAX = 1000
const REPORT_REASONS = ['misinformation', 'spam', 'abuse', 'inappropriate', 'privacy', 'other'] as const

const errorKey = (error: unknown) => {
  const code = error instanceof MarketInquiryError ? error.code : 'generic'
  return ['own_listing', 'closed', 'blocked', 'too_many', 'empty'].includes(code) ? code : 'generic'
}

export function MarketChat({
  inquiryId: initialId,
  post,
  onThreadOpened,
  onBack,
  className,
}: {
  /** An existing conversation; without it the first message opens one for `post` */
  inquiryId?: string | null
  /** The listing (first contact) */
  post?: Pick<CommunityPost, 'id' | 'title' | 'price'> | null
  onThreadOpened?: (id: string) => void
  /** Phones in the inbox: back to the list */
  onBack?: () => void
  className?: string
}) {
  const t = useT('community')
  const city = useCity()
  const phone = useIsPhone()
  const { error: toastError, success } = useToast()
  const [inquiryId, setInquiryId] = useState<string | null>(initialId ?? null)
  const [thread, setThread] = useState<MarketThread | null>(null)
  const [messages, setMessages] = useState<MarketMessage[]>([])
  const [loading, setLoading] = useState(Boolean(initialId))
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => setInquiryId(initialId ?? null), [initialId])

  const load = useCallback(async (id: string) => {
    try {
      const data = await openMarketThread(id)
      setThread(data.thread)
      setMessages(data.messages)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Open + poll while the tab is visible
  useEffect(() => {
    if (!inquiryId) return
    setLoading(true)
    void load(inquiryId)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(inquiryId)
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [inquiryId, load])

  // Keep the newest message in view
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      if (inquiryId) {
        await replyInMarketThread(inquiryId, body)
        setDraft('')
        await load(inquiryId)
      } else if (post) {
        const { inquiryId: id } = await sendFirstInquiry(post.id, body)
        setDraft('')
        setInquiryId(id)
        onThreadOpened?.(id)
        success(t('market.sent'))
      }
    } catch (error) {
      toastError(t(`market.errors.${errorKey(error)}`))
    } finally {
      setSending(false)
    }
  }

  async function report(reason: string) {
    if (!inquiryId) return
    setReporting(false)
    try {
      await reportMarketThread(inquiryId, reason)
      success(t('market.reportSent'))
    } catch (error) {
      if (error instanceof MarketInquiryError && error.status === 409) success(t('market.reportDuplicate'))
      else toastError(t('market.errors.generic'))
    }
  }

  async function block() {
    if (!inquiryId || !thread) return
    setMenuOpen(false)
    if (!window.confirm(t('market.blockConfirm', { name: thread.otherNickname || t('market.unknownUser') }))) return
    try {
      await blockMarketCounterpart(inquiryId)
      success(t('market.blocked'))
      onBack?.()
    } catch {
      toastError(t('market.errors.generic'))
    }
  }

  const listing = thread?.listing ?? (post ? { title: post.title, price: post.price ?? null, photo: null, marketStatus: 'selling' as const } : null)
  const postId = thread?.postId ?? post?.id
  const closed = thread?.status === 'closed'
  const price = listing ? (listing.price === 0 ? t('market.free') : listing.price != null ? `$${listing.price.toLocaleString('en-US')}` : '') : ''

  return (
    <div className={cn('flex min-h-0 flex-col bg-white', className)}>
      {/* Header: the other person + the listing */}
      <div className='flex items-center gap-3 border-b border-black/[0.06] px-4 py-3'>
        {onBack ? (
          <button type='button' onClick={onBack} aria-label={t('market.backToChat')} className='-ml-1 flex size-9 items-center justify-center rounded-full hover:bg-black/[0.04] lg:hidden'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-5' aria-hidden>
              <path strokeLinecap='round' strokeLinejoin='round' d='M15 18l-6-6 6-6' />
            </svg>
          </button>
        ) : null}
        <div className='size-11 shrink-0 overflow-hidden rounded-xl bg-[#f1f2f4]'>
          {listing?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- listing photo
            <img src={listing.photo} alt='' className='size-full object-cover' />
          ) : null}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-[14px] font-bold text-[var(--foreground)]'>
            {thread ? thread.otherNickname || t('market.unknownUser') : listing?.title}
          </p>
          <p className='truncate text-[12.5px] text-[var(--muted)]'>
            {thread && listing ? `${listing.title} · ` : ''}
            {price}
          </p>
        </div>
        {postId ? (
          <Link href={hrefForCommunityPost({ id: postId, categoryId: 'marketplace', city }, city)} className='hidden shrink-0 text-[12.5px] font-semibold text-[var(--brand)] sm:block'>
            {t('market.viewListing')}
          </Link>
        ) : null}
        {thread ? (
          <div className='relative'>
            <button type='button' onClick={() => setMenuOpen((open) => !open)} aria-label='⋯' className='flex size-9 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-black/[0.04]'>
              ⋯
            </button>
            {menuOpen ? (
              <div className='absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/[0.06]'>
                <button type='button' onClick={() => (setMenuOpen(false), setReporting(true))} className='block w-full px-4 py-2.5 text-left text-[14px] hover:bg-black/[0.03]'>
                  {t('market.reportChat')}
                </button>
                <button type='button' onClick={() => void block()} className='block w-full px-4 py-2.5 text-left text-[14px] text-red-600 hover:bg-black/[0.03]'>
                  {t('market.blockUser')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 선입금 warning, always on top like the app */}
      <p className='bg-[#FFF4E5] px-4 py-2 text-[12px] font-medium text-[#9A5B00]'>{t('market.safety')}</p>

      {/* Messages */}
      <div ref={listRef} className='min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#f7f8fa] px-4 py-4'>
        {loading ? (
          <div className='flex justify-center py-10'>
            <span className='size-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent' />
          </div>
        ) : failed ? (
          <p className='py-10 text-center text-[13px] text-[var(--muted)]'>{t('market.loadFailed')}</p>
        ) : !inquiryId ? (
          <p className='py-8 text-center text-[13px] text-[var(--muted)]'>{t('market.inquireTitle')}</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn('flex', message.fromMe ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed',
                  message.fromMe ? 'rounded-br-md bg-[var(--brand)] text-white' : 'rounded-bl-md bg-white text-[var(--foreground)] ring-1 ring-black/[0.05]',
                )}
              >
                {message.body}
                <span className={cn('mt-1 block text-[10.5px]', message.fromMe ? 'text-white/75' : 'text-[var(--muted)]')}>
                  {new Date(message.createdAt).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      {closed ? (
        <p className='border-t border-black/[0.06] px-4 py-4 text-center text-[13px] text-[var(--muted)]'>{t('market.closed')}</p>
      ) : (
        <form onSubmit={send} className='border-t border-black/[0.06] p-3'>
          {phone ? <p className='mb-2 text-center text-[11.5px] text-[var(--muted)]'>{t('market.appNudge')}</p> : null}
          <div className='flex items-end gap-2'>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              placeholder={inquiryId ? t('market.replyPlaceholder') : t('market.inquirePlaceholder')}
              className='max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-[#f4f5f7] px-4 py-3 text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--brand)]'
            />
            <button
              type='submit'
              disabled={!draft.trim() || sending}
              className='h-11 shrink-0 rounded-full bg-[var(--brand)] px-5 text-[14px] font-bold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-40'
            >
              {sending ? t('market.sending') : t('market.send')}
            </button>
          </div>
        </form>
      )}

      {/* Report reasons */}
      {reporting ? (
        <div className='fixed inset-0 z-[10060] flex items-end justify-center bg-black/40 sm:items-center' onClick={() => setReporting(false)}>
          <div role='dialog' aria-modal='true' onClick={(e) => e.stopPropagation()} className='w-full max-w-sm rounded-t-3xl bg-white p-5 sm:rounded-3xl'>
            <p className='text-[16px] font-bold text-[var(--foreground)]'>{t('market.reportTitle')}</p>
            <div className='mt-3 flex flex-col gap-1'>
              {REPORT_REASONS.map((reason) => (
                <button key={reason} type='button' onClick={() => void report(reason)} className='rounded-xl px-3 py-2.5 text-left hover:bg-black/[0.03]'>
                  <span className='block text-[14px] font-semibold text-[var(--foreground)]'>{t(`report.reasons.${reason}.label`)}</span>
                  <span className='block text-[12px] text-[var(--muted)]'>{t(`report.reasons.${reason}.description`)}</span>
                </button>
              ))}
            </div>
            <button type='button' onClick={() => setReporting(false)} className='mt-2 h-11 w-full rounded-full bg-[#f4f5f7] text-[14px] font-semibold'>
              {t('report.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * 상세 화면의 "판매자에게 문의하기": login → 학생·직장 인증 (the app's rule) → reuse the buyer's open conversation for
 * this listing, else a first-message chat. Opens as a right-side panel on desktop, full screen on phones.
 * The seller sees a link to the inbox for this listing instead.
 */
export function MarketInquiryLauncher({
  post,
  isAuthor,
  canInquire,
  signedIn,
  loginHref,
  verifyHref,
  inboxHref,
}: {
  post: Pick<CommunityPost, 'id' | 'title' | 'price' | 'marketStatus'>
  isAuthor: boolean
  canInquire: boolean
  signedIn: boolean
  loginHref: string
  verifyHref: string
  inboxHref: string
}) {
  const t = useT('community')
  const [open, setOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const button = 'mt-5 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-bold transition'
  if (isAuthor) {
    return (
      <Link href={inboxHref} className={cn(button, 'bg-[var(--foreground)] text-white hover:bg-black')}>
        {t('market.sellerInbox')}
      </Link>
    )
  }
  if (post.marketStatus === 'sold') return null
  if (!signedIn) {
    return (
      <Link href={loginHref} className={cn(button, 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]')}>
        {t('market.loginToInquire')}
      </Link>
    )
  }
  if (!canInquire) {
    return (
      <Link href={verifyHref} className={cn(button, 'bg-[#f4f5f7] text-[13.5px] text-[var(--foreground)]')}>
        {t('market.verifyToInquire')}
      </Link>
    )
  }

  async function start() {
    setChecking(true)
    try {
      const { listMarketThreads } = await import('@lib/marketplace/inquiries.client')
      const mine = await listMarketThreads('buying', post.id)
      setThreadId(mine.find((thread) => thread.status === 'open')?.id ?? mine[0]?.id ?? null)
    } catch {
      setThreadId(null)
    } finally {
      setChecking(false)
      setOpen(true)
    }
  }

  return (
    <>
      <button type='button' onClick={() => void start()} disabled={checking} className={cn(button, 'bg-[var(--brand)] text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] hover:bg-[var(--brand-hover)] disabled:opacity-60')}>
        {threadId ? t('market.continueChat') : t('market.inquire')}
      </button>
      {open ? (
        <div className='fixed inset-0 z-[10050] flex justify-end bg-black/35' onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className='flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[440px]'>
            <MarketChat inquiryId={threadId} post={post} onThreadOpened={setThreadId} onBack={() => setOpen(false)} className='h-full' />
            <button type='button' onClick={() => setOpen(false)} aria-label='×' className='absolute right-3 top-3 hidden size-9 items-center justify-center rounded-full bg-white text-[18px] shadow sm:flex'>
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
