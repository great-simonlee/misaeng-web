'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { useT } from '@lib/i18n/client'
import { startListingInquiry } from '@lib/support/client'

/**
 * Ellieo listing → "Ask about this listing": the first message of a board thread (kind=housing, listing snapshot
 * stored by the server). The reply shows up under My page → Inquiries & suggestions; no app, no KakaoTalk.
 * The caller only opens this for a logged-in user (login first otherwise).
 */
export function ListingInquiryModal({
  open,
  onClose,
  listingId,
  listingTitle,
}: {
  open: boolean
  onClose: () => void
  listingId: string
  listingTitle: string
}) {
  const t = useT('housing')
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [moveIn, setMoveIn] = useState('')
  const [busy, setBusy] = useState(false)
  const [prefilled, setPrefilled] = useState<string | null>(null)

  // Fill the default message each time the sheet opens for a listing (state reset during render, not in an effect)
  const key = open ? listingId : null
  if (key !== prefilled) {
    setPrefilled(key)
    if (key) setMessage(t('detail.listingInquiry.defaultMessage', { address: listingTitle }))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function submit() {
    const body = message.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const conversation = await startListingInquiry({
        listingId,
        message: body,
        city,
        profile: {
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(/^\d{4}-\d{2}-\d{2}$/.test(moveIn) ? { moveIn } : {}),
        },
      })
      toast.success(t('detail.listingInquiry.sent'))
      onClose()
      router.push(href(`/me/inquiries/${conversation.id}`))
    } catch (error) {
      toast.error(getErrorMessage(error, t('detail.listingInquiry.failed')))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  const field =
    'w-full rounded-xl border border-black/10 px-4 text-[15px] outline-none transition focus:border-[var(--brand)]'
  return (
    <div
      className='fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6'
      role='dialog'
      aria-modal='true'
      aria-labelledby='listing-inquiry-title'
      onClick={onClose}
    >
      <div
        className='max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem]'
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id='listing-inquiry-title' className='text-[1.2rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          {t('detail.listingInquiry.title')}
        </h2>
        <p className='mt-1 truncate text-[13px] font-medium text-[var(--muted-foreground)]'>{listingTitle}</p>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('detail.listingInquiry.body')}</p>

        <label className='mt-5 block text-[13px] font-semibold text-[var(--foreground)]' htmlFor='listing-inquiry-message'>
          {t('detail.listingInquiry.message')}
        </label>
        <textarea
          id='listing-inquiry-message'
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={2000}
          rows={5}
          className={`${field} mt-1.5 resize-y py-3 leading-relaxed`}
        />
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          <label className='block text-[13px] font-semibold text-[var(--foreground)]'>
            {t('detail.listingInquiry.phone')}
            <input
              type='tel'
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={40}
              autoComplete='tel'
              className={`${field} mt-1.5 h-11 font-normal`}
            />
          </label>
          <label className='block text-[13px] font-semibold text-[var(--foreground)]'>
            {t('detail.listingInquiry.moveIn')}
            <input
              type='date'
              value={moveIn}
              onChange={(event) => setMoveIn(event.target.value)}
              className={`${field} mt-1.5 h-11 font-normal`}
            />
          </label>
        </div>

        <div className='mt-5 flex gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='h-12 flex-1 rounded-full text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-black/[0.04]'
          >
            {t('detail.listingInquiry.cancel')}
          </button>
          <button
            type='button'
            disabled={busy || !message.trim()}
            onClick={() => void submit()}
            className='h-12 flex-[2] rounded-full bg-[var(--brand)] text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-40'
          >
            {busy ? '…' : t('detail.listingInquiry.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
