'use client'

import { useEffect, useState } from 'react'

import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { MISAENG_APP_STORE_URL, MISAENG_PLAY_STORE_URL } from '@widgets/nyc/MisaengStoreButtons'

/**
 * City home (/nyc, /boston) on a phone: a bottom sheet that points to the Misaeng app.
 * - iPhone → App Store, Android → Google Play.
 * - "모바일 웹으로 볼게요" hides it for a few days on this browser.
 * Misaeng only.
 */
/** Same artwork as the app's home-screen icon (misaeng-app AppIcon). */
const APP_ICON = '/img/app_icon.png'
const DISMISSED_KEY = 'misaeng.appPrompt.dismissedAt'
const HIDE_DAYS = 3
const SHOW_DELAY_MS = 600

type Platform = 'ios' | 'android'

function phonePlatform(): Platform | null {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return null
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY) || 0)
    return at > 0 && Date.now() - at < HIDE_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {
    // storage blocked: it just shows again next visit
  }
}

export function AppDownloadPrompt() {
  const t = useT('hub')
  const [platform, setPlatform] = useState<Platform | null>(null)

  useEffect(() => {
    if (BRAND_CONFIG.id !== 'misaeng') return
    const phone = phonePlatform()
    if (!phone || recentlyDismissed()) return
    const id = window.setTimeout(() => setPlatform(phone), SHOW_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!platform) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      rememberDismissed()
      setPlatform(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [platform])

  function dismiss() {
    rememberDismissed()
    setPlatform(null)
  }

  if (!platform) return null

  const storeUrl = platform === 'ios' ? MISAENG_APP_STORE_URL : MISAENG_PLAY_STORE_URL
  const perks = ['alerts', 'chat', 'full'] as const

  return (
    <div className='fixed inset-0 z-[80] flex items-end justify-center bg-black/40' role='dialog' aria-modal='true' onClick={dismiss}>
      <div
        className='w-full max-w-md rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='mx-auto mb-5 h-1 w-10 rounded-full bg-black/10' />
        <div className='flex items-center gap-3.5'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={APP_ICON} alt='' className='h-14 w-14 rounded-[14px] shadow-md shadow-[var(--brand)]/25' />
          <div className='min-w-0'>
            <h2 className='text-[1.2rem] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{t('appPrompt.title')}</h2>
            <p className='mt-0.5 text-[13px] text-[var(--muted-foreground)]'>{t('appPrompt.subtitle')}</p>
          </div>
        </div>
        <ul className='mt-5 space-y-2.5'>
          {perks.map((perk) => (
            <li key={perk} className='flex items-start gap-2.5 text-[14px] leading-snug text-[var(--foreground)]'>
              <span className='mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]' aria-hidden />
              {t(`appPrompt.perks.${perk}`)}
            </li>
          ))}
        </ul>
        <a
          href={storeUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-6 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-5 text-[16px] font-bold text-white shadow-lg shadow-[var(--brand)]/20 transition active:scale-[0.99]'
        >
          {t(platform === 'ios' ? 'appPrompt.downloadIos' : 'appPrompt.downloadAndroid')}
        </a>
        <button type='button' onClick={dismiss} className='mt-3 w-full py-2 text-[13px] font-medium text-[var(--muted-foreground)]'>
          {t('appPrompt.continueWeb')}
        </button>
      </div>
    </div>
  )
}
