'use client'

import { useEffect } from 'react'

import { useT } from '@lib/i18n/client'
import { MisaengStoreButtons } from '@widgets/nyc/MisaengStoreButtons'

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
        <MisaengStoreButtons className='mt-5' appStoreLabel={t('detail.appStore')} googlePlayLabel={t('detail.googlePlay')} />
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
