'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { EllieoDots } from '@components/EllieoDots'
import { useToast } from '@hooks/useToast'
import { cn } from '@lib'
import {
  askMarketSeller,
  fetchMarketThread,
  MarketRequestError,
  replyMarketThread,
  MARKET_REPORT_REASONS,
  reportMarketThread,
  type MarketReportReason,
  type MarketMessage,
  type MarketThreadSummary,
} from '@lib/community/marketplace.client'
import { useFormat, useT } from '@lib/i18n/client'
import { EllieoSheet } from '@widgets/ellieo/EllieoSheet'

const MESSAGE_MAX = 1000

/** First question to the seller: POST /api/marketplace/inquiries */
export function MarketAskBox({ postId, onSent }: { postId: string; onSent: () => void }) {
  const t = useT('community')
  const toast = useToast()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await askMarketSeller(postId, text)
      setBody('')
      toast.success(t('ellieoMarket.ask.sent'))
      onSent()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Composer
      value={body}
      onChange={setBody}
      onSend={send}
      sending={sending}
      placeholder={t('ellieoMarket.ask.placeholder')}
      label={t('ellieoMarket.ask.send')}
    />
  )
}

/** One buyer–seller conversation: messages + reply box (GET/POST /api/marketplace/inquiries/{id}) */
export function MarketThread({ threadId }: { threadId: string }) {
  const t = useT('community')
  const format = useFormat()
  const toast = useToast()
  const [thread, setThread] = useState<MarketThreadSummary | null>(null)
  const [messages, setMessages] = useState<MarketMessage[] | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetchMarketThread(threadId)
      .then((data) => {
        setThread(data.thread)
        setMessages(data.messages)
      })
      .catch(() => setMessages([]))
  }, [threadId])

  useEffect(() => {
    load()
    // Light polling while the conversation is open (no realtime on the web yet)
    const timer = window.setInterval(load, 20_000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await replyMarketThread(threadId, text)
      setBody('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
    } finally {
      setSending(false)
    }
  }

  const [reportOpen, setReportOpen] = useState(false)

  if (messages === null) {
    return (
      <div className='flex justify-center py-6'>
        <EllieoDots />
      </div>
    )
  }

  const closed = thread?.status === 'closed'
  return (
    <div>
      <div ref={listRef} className='flex max-h-[22rem] flex-col gap-2 overflow-y-auto rounded-[1.25rem] bg-[var(--surface)] p-3'>
        {messages.map((message) => (
          <div key={message.id} className={cn('flex flex-col', message.fromMe ? 'items-end' : 'items-start')}>
            <p
              className={cn(
                'max-w-[85%] whitespace-pre-wrap break-words rounded-[1.125rem] px-3.5 py-2 text-[14.5px] leading-snug',
                message.fromMe ? 'rounded-br-md bg-[var(--brand)] text-white' : 'rounded-bl-md bg-white text-[var(--foreground)]',
              )}
            >
              {message.body}
            </p>
            <span className='mt-0.5 px-1 text-[11px] text-[var(--muted)]'>{format.relative(message.createdAt)}</span>
          </div>
        ))}
      </div>
      {closed ? (
        <p className='mt-2 text-[13.5px] text-[var(--muted-foreground)]'>{t('ellieoMarket.ask.closed')}</p>
      ) : (
        <Composer
          value={body}
          onChange={setBody}
          onSend={send}
          sending={sending}
          placeholder={t('ellieoMarket.ask.replyPlaceholder')}
          label={t('ellieoMarket.ask.send')}
        />
      )}
      <div className='mt-1 flex justify-end'>
        <button type='button' onClick={() => setReportOpen(true)} className='text-[12.5px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]'>
          {t('ellieoMarket.ask.report')}
        </button>
      </div>
      <ReportSheet threadId={threadId} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  )
}

/** Report a conversation: bottom sheet on phones, centered card from 640px (EllieoSheet) */
function ReportSheet({ threadId, open, onClose }: { threadId: string; open: boolean; onClose: () => void }) {
  const t = useT('community')
  const toast = useToast()
  const [reason, setReason] = useState<MarketReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)

  const close = () => {
    if (sending) return
    setReason(null)
    setDetail('')
    onClose()
  }

  const submit = async () => {
    if (!reason || sending) return
    setSending(true)
    try {
      await reportMarketThread(threadId, reason, detail)
      toast.success(t('ellieoMarket.ask.reported'))
    } catch (err) {
      // Already reported (409 duplicate): same answer as a first report
      if (err instanceof MarketRequestError && err.code === 'duplicate') toast.success(t('ellieoMarket.ask.reported'))
      else toast.error(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
    } finally {
      setSending(false)
      setReason(null)
      setDetail('')
      onClose()
    }
  }

  return (
    <EllieoSheet
      open={open}
      onClose={close}
      title={t('ellieoMarket.ask.reportTitle')}
      subtitle={t('ellieoMarket.ask.reportSubtitle')}
      closeLabel={t('ellieoMarket.ask.reportCancel')}
    >
      <div role='radiogroup' aria-label={t('ellieoMarket.ask.reportTitle')} className='mt-4 flex flex-col gap-2'>
        {MARKET_REPORT_REASONS.map((id) => (
          <button
            key={id}
            type='button'
            role='radio'
            aria-checked={reason === id}
            onClick={() => setReason(id)}
            className={cn(
              'flex h-12 items-center justify-between rounded-[1rem] px-4 text-left text-[15px] font-semibold transition',
              reason === id
                ? 'bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-2 ring-[var(--brand)]'
                : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]',
            )}
          >
            {t(`ellieoMarket.ask.reportReasons.${id}`)}
            <span
              aria-hidden
              className={cn(
                'size-5 rounded-full border-2',
                reason === id ? 'border-[6px] border-[var(--brand)] bg-white' : 'border-[var(--border-muted)] bg-white',
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={detail}
        onChange={(event) => setDetail(event.target.value.slice(0, 500))}
        placeholder={t('ellieoMarket.ask.reportDetail')}
        rows={3}
        className='mt-3 w-full resize-none rounded-[1rem] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--brand)]'
      />
      <div className='mt-4 grid grid-cols-2 gap-2'>
        <button
          type='button'
          onClick={close}
          className='h-12 rounded-full bg-[var(--surface)] text-[15px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--border)]'
        >
          {t('ellieoMarket.ask.reportCancel')}
        </button>
        <button
          type='button'
          onClick={() => void submit()}
          disabled={!reason || sending}
          className='h-12 rounded-full bg-[var(--brand)] text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-45'
        >
          {sending ? '…' : t('ellieoMarket.ask.reportSubmit')}
        </button>
      </div>
    </EllieoSheet>
  )
}

function Composer({
  value,
  onChange,
  onSend,
  sending,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  sending: boolean
  placeholder: string
  label: string
}) {
  return (
    <div className='mt-3 flex items-end gap-2'>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MESSAGE_MAX))}
        placeholder={placeholder}
        rows={2}
        className='min-h-12 flex-1 resize-none rounded-[1.25rem] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--brand)]'
      />
      <button
        type='button'
        onClick={onSend}
        disabled={sending || !value.trim()}
        className='h-12 shrink-0 rounded-full bg-[var(--brand)] px-5 text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-45'
      >
        {sending ? '…' : label}
      </button>
    </div>
  )
}
