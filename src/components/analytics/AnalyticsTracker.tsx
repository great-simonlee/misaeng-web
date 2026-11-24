'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { setAnalyticsScreen, track } from '@lib/analytics/client'

/** '/ko/nyc/housing/abc123def456' → screen '/nyc/housing/:id', target 'abc123def456' (ids: long or numeric segments). */
function screenOf(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] && /^(ko|en|vi)$/.test(parts[0])) parts.shift()
  let target: string | undefined
  const screen = parts.map((p) => {
    if (/^\d+$/.test(p) || (p.length >= 12 && /\d/.test(p) && /^[A-Za-z0-9_-]+$/.test(p))) {
      target = decodeURIComponent(p)
      return ':id'
    }
    return p
  })
  return { screen: `/${screen.join('/')}`, target }
}

/**
 * Misaeng web: app_opened once per page load, screen_viewed for every page (sent when you leave it, with how long it
 * stayed open). Mounted in RootDocument for Misaeng only.
 */
export function AnalyticsTracker() {
  const pathname = usePathname()
  const opened = useRef(false)
  const prev = useRef<string | null>(null)

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    const params = new URLSearchParams(window.location.search)
    track('app_opened', { source: params.get('utm_source') || params.get('ref') ? 'link' : 'direct' })
  }, [])

  useEffect(() => {
    if (!pathname) return
    const { screen, target } = screenOf(pathname)
    setAnalyticsScreen(screen)
    const startedAt = Date.now()
    const prevScreen = prev.current
    let sent = false
    const send = () => {
      if (sent) return
      sent = true
      track('screen_viewed', { screen, path: pathname, prev_screen: prevScreen, target_id: target, dwell_ms: Date.now() - startedAt }, screen)
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') send()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      send()
      prev.current = screen
    }
  }, [pathname])

  return null
}
