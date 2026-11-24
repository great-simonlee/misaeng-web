'use client'

import { useEffect } from 'react'

import { track } from './client'
import type { AnalyticsEventName } from './events.generated'

type ViewEvent = Extract<AnalyticsEventName, 'post_viewed' | 'company_viewed' | 'job_viewed' | 'paywall_viewed'>

/**
 * Sends a *_viewed event when the detail page closes (or the tab is hidden), with how long it was open (dwell_ms).
 * Pass id = null until the item is loaded; nothing is sent for a page that never loaded.
 */
export function useTrackView(event: ViewEvent, id: string | null | undefined, props: Record<string, string | number | undefined>) {
  const key = JSON.stringify(props)
  useEffect(() => {
    if (!id) return
    const startedAt = Date.now()
    let sent = false
    const send = () => {
      if (sent) return
      sent = true
      track(event, { ...(JSON.parse(key) as Record<string, string | number | undefined>), dwell_ms: Date.now() - startedAt })
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') send()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      send()
    }
  }, [event, id, key])
}
