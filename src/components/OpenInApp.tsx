'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'

/**
 * Pages shared from the app open the app again (misaeng://… routes, see AppRouter.open(url:) in misaeng-app).
 * - In-app browsers (KakaoTalk, Instagram, Line, Facebook) don't hand universal links to apps, so on a phone we
 *   try the app scheme once automatically; if the app isn't installed the page simply stays.
 * - Every phone visitor also gets a small "Open in app" button.
 * Misaeng only.
 */
const IN_APP_BROWSER = /KAKAOTALK|Instagram|FBAN|FBAV|Line\//i
const MOBILE = /iPhone|iPad|iPod|Android/i
const TRIED_KEY = 'misaeng.openInApp.tried'

const noSubscribe = () => () => {}
const isMobile = () => MOBILE.test(navigator.userAgent)
const notMobileOnServer = () => false

export function OpenInApp({ appPath }: { appPath: string }) {
  const t = useT('common')
  const mobile = useSyncExternalStore(noSubscribe, isMobile, notMobileOnServer)
  const href = `misaeng://${appPath.replace(/^\/+/, '')}`

  useEffect(() => {
    const ua = navigator.userAgent
    if (BRAND_CONFIG.id !== 'misaeng' || !MOBILE.test(ua) || !IN_APP_BROWSER.test(ua)) return
    // once per link per tab, so coming back from the app (or no app) doesn't bounce again
    try {
      const tried = sessionStorage.getItem(TRIED_KEY)
      if (tried === href) return
      sessionStorage.setItem(TRIED_KEY, href)
    } catch {
      // storage blocked: still try once
    }
    window.location.href = href
  }, [href])

  if (BRAND_CONFIG.id !== 'misaeng' || !mobile) return null

  return (
    <a
      href={href}
      className='fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/15'
    >
      {t('share.openInApp')}
    </a>
  )
}
