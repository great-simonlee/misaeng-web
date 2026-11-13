'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { MISAENG_APP_STORE_URL, MISAENG_PLAY_STORE_URL } from '@widgets/nyc/MisaengStoreButtons'

/**
 * City home hero, right side on wide screens: what the app adds and a QR to open this site on a phone
 * (the app opens it when installed, the stores otherwise). Misaeng only.
 */
export function HeroAppCard() {
  const t = useT('hub')
  const tCommon = useT('common')
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(window.location.href, { margin: 1, width: 280, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => alive && setQr(url))
      .catch(() => null)
    return () => {
      alive = false
    }
  }, [])

  if (BRAND_CONFIG.id !== 'misaeng') return null
  return (
    <div className='relative w-full max-w-sm rounded-[1.75rem] bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] ring-1 ring-[var(--card-ring)] backdrop-blur'>
      <div className='flex items-center gap-3'>
        <Image src={BRAND_CONFIG.assets.square} alt='' width={48} height={48} className='size-12 rounded-[14px] ring-1 ring-black/5' />
        <div className='min-w-0'>
          <p className='text-[15px] font-semibold text-[var(--foreground)]'>{t('appPrompt.title')}</p>
          <p className='text-[12.5px] text-[var(--muted)]'>{t('appPrompt.subtitle')}</p>
        </div>
      </div>
      <ul className='mt-5 space-y-2.5'>
        {(['alerts', 'full'] as const).map((key) => (
          <li key={key} className='flex gap-2.5 text-[13.5px] leading-snug text-[var(--muted-foreground)]'>
            <span className='mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-subtle)] text-[var(--brand)]'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='size-2.5' aria-hidden>
                <path strokeLinecap='round' strokeLinejoin='round' d='m5 12 5 5L20 7' />
              </svg>
            </span>
            {t(`appPrompt.perks.${key}`)}
          </li>
        ))}
      </ul>
      <div className='mt-6 flex items-center gap-4 rounded-2xl bg-[var(--canvas)] p-3'>
        <div className='size-[88px] shrink-0 overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-black/5'>
          {qr ? <img src={qr} alt={tCommon('appHandoff.qrAlt')} className='size-full' /> : null}
        </div>
        <div className='min-w-0 text-[12.5px] leading-snug text-[var(--muted-foreground)]'>
          <p className='font-semibold text-[var(--foreground)]'>{tCommon('appHandoff.qrTitle')}</p>
          <p className='mt-1'>{tCommon('appHandoff.qrBody')}</p>
        </div>
      </div>
      <div className='mt-4 grid grid-cols-2 gap-2'>
        <a
          href={MISAENG_APP_STORE_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex h-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-[12.5px] font-semibold text-white transition hover:bg-black'
        >
          App Store
        </a>
        <a
          href={MISAENG_PLAY_STORE_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex h-10 items-center justify-center rounded-xl bg-white text-[12.5px] font-semibold text-[var(--foreground)] ring-1 ring-black/10 transition hover:bg-[#fafbfc]'
        >
          Google Play
        </a>
      </div>
    </div>
  )
}
