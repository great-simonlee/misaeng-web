'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { MISAENG_APP_STORE_URL, MISAENG_PLAY_STORE_URL } from '@widgets/nyc/MisaengStoreButtons'

/**
 * City home hero, right side on wide screens: what the app adds and a QR of misaeng.com/app, which sends an
 * iPhone to the App Store and an Android phone to Google Play. Misaeng only.
 */
export function HeroAppCard() {
  const t = useT('hub')
  const tCommon = useT('common')
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(`${window.location.origin}/app`, { margin: 1, width: 280, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => alive && setQr(url))
      .catch(() => null)
    return () => {
      alive = false
    }
  }, [])

  if (BRAND_CONFIG.id !== 'misaeng') return null
  return (
    <div className='relative w-full max-w-[25rem] rounded-[1.5rem] bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.10)] ring-1 ring-[var(--card-ring)] backdrop-blur'>
      <div className='flex items-center gap-3'>
        <Image src={BRAND_CONFIG.assets.square} alt='' width={40} height={40} className='size-10 rounded-xl ring-1 ring-black/5' />
        <div className='min-w-0'>
          <p className='text-[14px] font-semibold text-[var(--foreground)]'>{t('appPrompt.title')}</p>
          <p className='text-[12px] text-[var(--muted)]'>{t('appPrompt.subtitle')}</p>
        </div>
      </div>
      <ul className='mt-3.5 space-y-1.5'>
        {(['alerts', 'full'] as const).map((key) => (
          <li key={key} className='flex gap-2 text-[12.5px] leading-snug text-[var(--muted-foreground)]'>
            <span className='mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-subtle)] text-[var(--brand)]'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='size-2' aria-hidden>
                <path strokeLinecap='round' strokeLinejoin='round' d='m5 12 5 5L20 7' />
              </svg>
            </span>
            {t(`appPrompt.perks.${key}`)}
          </li>
        ))}
      </ul>
      {/* QR (this page on a phone) next to the store buttons: one row */}
      <div className='mt-4 flex items-center gap-3'>
        <div className='size-[76px] shrink-0 overflow-hidden rounded-xl bg-white p-1 ring-1 ring-black/[0.08]' title={tCommon('appHandoff.qrBody')}>
          {qr ? <img src={qr} alt={tCommon('appHandoff.qrAlt')} className='size-full' /> : null}
        </div>
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <p className='text-[11.5px] font-medium text-[var(--muted)]'>{tCommon('appHandoff.qrTitle')}</p>
          <div className='grid grid-cols-2 gap-1.5'>
            <a
              href={MISAENG_APP_STORE_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-9 items-center justify-center rounded-lg bg-[var(--foreground)] text-[12px] font-semibold text-white transition hover:bg-black'
            >
              App Store
            </a>
            <a
              href={MISAENG_PLAY_STORE_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-9 items-center justify-center rounded-lg bg-white text-[12px] font-semibold text-[var(--foreground)] ring-1 ring-black/10 transition hover:bg-[#fafbfc]'
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
