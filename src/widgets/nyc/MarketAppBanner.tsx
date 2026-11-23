'use client'

import { AppHandoffButton, useIsPhone } from '@components/AppHandoff'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { MisaengStoreButtons } from '@widgets/nyc/MisaengStoreButtons'

/**
 * 중고거래 목록 위: 사고팔기는 앱에서 (owner 11-23). 휴대폰은 "앱에서 열기"(misaeng://market) + 스토어 버튼을 크게,
 * 데스크톱은 lg부터 오른쪽 레일에 앱 카드가 있으니 그보다 좁을 때만 같은 카드를 보여 준다. Misaeng only.
 */
export function MarketAppBanner() {
  const t = useT('community')
  const tCommon = useT('common')
  const phone = useIsPhone()
  if (BRAND_CONFIG.id !== 'misaeng') return null
  return (
    <div
      className={`mt-4 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(140deg,#FFE3D3_0%,#FFF1E6_55%,#FFF9F2_100%)] p-5 ring-1 ring-[#F6E4DA] ${phone ? '' : 'lg:hidden'}`}
    >
      <div className='flex items-start gap-3.5'>
        <span className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--brand)] shadow-[0_6px_16px_-10px_rgba(246,67,16,0.6)]'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='size-5' aria-hidden>
            <path d='M6 7h12l-1 13H7L6 7z' />
            <path d='M9 7a3 3 0 0 1 6 0' />
          </svg>
        </span>
        <div className='min-w-0'>
          <p className='break-keep text-[16px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('marketApp.title')}</p>
          <p className='mt-1 break-keep text-[13.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('marketApp.body')}</p>
        </div>
      </div>
      {phone ? (
        <div className='mt-4 flex flex-col gap-2.5'>
          <a
            href='misaeng://market'
            className='flex h-12 items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition active:scale-[0.98]'
          >
            {t('marketApp.cta')}
          </a>
          <MisaengStoreButtons
            appStoreLabel={tCommon('appHandoff.appStore')}
            googlePlayLabel={tCommon('appHandoff.googlePlay')}
            className='justify-center'
          />
        </div>
      ) : (
        <AppHandoffButton
          appPath='market'
          action='open'
          variant='primary'
          className='mt-4'
          label={tCommon('appHandoff.buttons.getApp')}
        />
      )}
    </div>
  )
}
