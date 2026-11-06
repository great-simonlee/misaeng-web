'use client'

import { useEffect } from 'react'

import { useT } from '@lib/i18n/client'

export const MISAENG_APP_STORE_URL = 'https://apps.apple.com/us/app/id6826454902'
export const MISAENG_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.misaeng.nyc'

/**
 * Listing → 앱으로 문의하기: live housing chat is app only (design §13.2), so the web points to the stores,
 * with KakaoTalk and email as fallbacks.
 */
export function AppInquiryModal({ open, onClose, mailHref, onKakao }: { open: boolean; onClose: () => void; mailHref: string | null; onKakao: () => void }) {
  const t = useT('housing')

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className='fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6' role='dialog' aria-modal='true' onClick={onClose}>
      <div
        className='w-full max-w-md rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem]'
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className='text-[1.2rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>{t('detail.appInquiryTitle')}</h2>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('detail.appInquiryBody')}</p>
        <div className='mt-5 flex flex-col gap-2.5'>
          <a
            href={MISAENG_APP_STORE_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-5 text-[15px] font-semibold text-white transition hover:bg-black'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5 fill-current' aria-hidden>
              <path d='M16.37 1.43c0 1.14-.42 2.2-1.25 3.04-.9.9-1.98 1.42-3.15 1.33-.15-1.1.42-2.27 1.22-3.07.9-.9 2.17-1.44 3.18-1.3zM20.5 17.2c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.38 3.5-4.1 3.51-1.53.02-1.93-1-4-.98-2.08.01-2.51 1-4.04.98-1.72-.02-3.04-1.77-4.03-3.33C.05 16.98-.25 11.85 1.6 9.06c1.3-1.98 3.36-3.14 5.3-3.14 1.97 0 3.21 1.08 4.84 1.08 1.58 0 2.54-1.08 4.82-1.08 1.72 0 3.55.94 4.85 2.56-4.26 2.33-3.57 8.42-.91 9.72z' />
            </svg>
            {t('detail.appStore')}
          </a>
          <a
            href={MISAENG_PLAY_STORE_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-5 text-[15px] font-semibold text-[var(--foreground)] transition hover:bg-[#fafbfc]'
          >
            <svg viewBox='0 0 24 24' className='h-5 w-5' aria-hidden>
              <path fill='#34A853' d='M3.6 1.8 13.8 12 3.6 22.2c-.4-.2-.6-.7-.6-1.2V3c0-.5.2-1 .6-1.2z' />
              <path fill='#FBBC04' d='m17.2 15.4-3.4-3.4 3.4-3.4 3.9 2.2c1.1.6 1.1 1.8 0 2.4z' />
              <path fill='#4285F4' d='M17.2 15.4 13.8 12 3.6 22.2c.4.2.9.2 1.4-.1z' />
              <path fill='#EA4335' d='M17.2 8.6 5 1.9c-.5-.3-1-.3-1.4-.1L13.8 12z' />
            </svg>
            {t('detail.googlePlay')}
          </a>
        </div>
        <p className='mt-5 text-[12px] text-[var(--muted)]'>{t('detail.orKakao')}</p>
        <div className='mt-2 flex gap-2'>
          <button
            type='button'
            onClick={onKakao}
            className='inline-flex min-h-[42px] flex-1 items-center justify-center rounded-full border border-[#E8D84A] bg-[#FEE500] px-4 text-[13px] font-semibold text-[#191919] transition hover:brightness-95'
          >
            {t('detail.kakaoInquiry')}
          </button>
          {mailHref && (
            <a
              href={mailHref}
              className='inline-flex min-h-[42px] flex-1 items-center justify-center rounded-full border border-black/[0.08] bg-[#fafbfc] px-4 text-[13px] font-semibold text-[var(--foreground)] transition hover:bg-white'
            >
              {t('detail.emailInquiryShort')}
            </a>
          )}
        </div>
        <button type='button' onClick={onClose} className='mt-4 w-full py-2 text-[13px] font-medium text-[var(--muted-foreground)]'>
          {t('detail.close')}
        </button>
      </div>
    </div>
  )
}
