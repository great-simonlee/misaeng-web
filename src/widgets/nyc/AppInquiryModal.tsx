'use client'

import { AppHandoffSheet } from '@components/AppHandoff'
import { useT } from '@lib/i18n/client'

/**
 * Listing → 앱으로 문의하기: live housing chat is app only (design §13.2). The shared app hand-off sheet
 * (open this listing in the app, store buttons, a QR code on desktop) with KakaoTalk and email as small fallbacks.
 */
export function AppInquiryModal({
  open,
  onClose,
  listingId,
  mailHref,
  onKakao,
}: {
  open: boolean
  onClose: () => void
  listingId: string
  mailHref: string | null
  onKakao: () => void
}) {
  const t = useT('housing')
  return (
    <AppHandoffSheet
      open={open}
      onClose={onClose}
      appPath={`housing/${listingId}`}
      action='inquiry'
      footer={
        <div className='mt-5 flex items-center justify-center gap-3 text-[12px] text-[var(--muted)]'>
          <span>{t('detail.orKakao')}</span>
          <button type='button' onClick={onKakao} className='font-semibold text-[var(--muted-foreground)] underline underline-offset-2'>
            {t('detail.kakaoInquiry')}
          </button>
          {mailHref ? (
            <a href={mailHref} className='font-semibold text-[var(--muted-foreground)] underline underline-offset-2'>
              {t('detail.emailInquiryShort')}
            </a>
          ) : null}
        </div>
      }
    />
  )
}
