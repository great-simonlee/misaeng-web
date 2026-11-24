'use client'

import { BRAND } from '@lib/brand'

import type { AnalyticsEventName } from './events.generated'

/*
 * Web analytics (Misaeng only): track('post_viewed', {...}) → queued → POST /api/track every 10 s or 20 events,
 * and with navigator.sendBeacon when the page is hidden. Nothing is sent until the consent state is known: signed-out
 * visitors are tracked (first-party, disclosed in the Privacy Policy); signed-in members only after they accepted
 * the current Privacy Policy (ReconsentGate calls setAnalyticsConsent). Failures are silent; this never blocks the UI.
 */

type Props = Record<string, string | number | boolean | null | undefined>
type QueuedEvent = {
  event_id: string
  event: AnalyticsEventName
  ts: string
  anonymous_id: string
  session_id: string
  platform: 'web'
  app_version: string | null
  locale: string | null
  screen: string | null
  props: Props
  utm?: Record<string, string>
  ref?: string
}

const ENDPOINT = '/api/track'
const AID_COOKIE = 'mz_aid'
const TOUCH_COOKIE = 'mz_touch'
const STORE_KEY = 'mz_analytics_queue'
const SESSION_KEY = 'mz_session'
const FLUSH_MS = 10_000
const BATCH = 20
const MAX_QUEUE = 200
const SESSION_IDLE_MS = 30 * 60_000
const MAX_AGE_MS = 7 * 24 * 3600_000

const enabled = BRAND === 'misaeng'
let consent: 'unknown' | 'on' | 'off' = 'unknown'
let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let currentScreen: string | null = null

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

function readCookie(name: string) {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

function writeCookie(name: string, value: string, days: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/** One id per browser (first-party cookie + localStorage), kept 13 months. */
function anonymousId() {
  let id = safe(() => readCookie(AID_COOKIE), null) || safe(() => localStorage.getItem(AID_COOKIE), null)
  if (!id || !/^[A-Za-z0-9_.:-]{8,80}$/.test(id)) id = uuid()
  safe(() => writeCookie(AID_COOKIE, id!, 395), undefined)
  safe(() => localStorage.setItem(AID_COOKIE, id!), undefined)
  return id
}

/** New session after 30 minutes without any event. */
function sessionId() {
  const now = Date.now()
  const saved = safe(() => JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as { id: string; at: number } | null, null)
  const id = saved && now - saved.at < SESSION_IDLE_MS ? saved.id : uuid()
  safe(() => sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now })), undefined)
  return id
}

/** UTM / ref from the landing URL, remembered for 30 days and sent with every event (and so with sign-up). */
function captureTouch() {
  const params = new URLSearchParams(location.search)
  const utm: Record<string, string> = {}
  for (const key of ['source', 'medium', 'campaign', 'content']) {
    const v = params.get(`utm_${key}`)
    if (v) utm[key] = v.slice(0, 100)
  }
  const ref = params.get('ref')?.slice(0, 100) || undefined
  if (Object.keys(utm).length || ref) safe(() => writeCookie(TOUCH_COOKIE, JSON.stringify({ utm, ref }), 30), undefined)
}

function touch(): { utm?: Record<string, string>; ref?: string } {
  const raw = safe(() => readCookie(TOUCH_COOKIE), null)
  if (!raw) return {}
  const t = safe(() => JSON.parse(raw) as { utm?: Record<string, string>; ref?: string }, {})
  return { ...(t.utm && Object.keys(t.utm).length ? { utm: t.utm } : {}), ...(t.ref ? { ref: t.ref } : {}) }
}

function persist() {
  safe(() => localStorage.setItem(STORE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))), undefined)
}

function restore() {
  const saved = safe(() => JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as QueuedEvent[], [])
  const cutoff = Date.now() - MAX_AGE_MS
  queue = [...saved.filter((e) => Date.parse(e.ts) > cutoff), ...queue].slice(-MAX_QUEUE)
}

function schedule() {
  if (timer || consent !== 'on') return
  timer = setTimeout(() => {
    timer = null
    void flush()
  }, FLUSH_MS)
}

async function flush(beacon = false) {
  if (consent !== 'on' || !queue.length) return
  const batch = queue.slice(0, 50)
  const body = JSON.stringify({ events: batch })
  let sent = false
  if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    sent = safe(() => navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' })), false)
  } else {
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body, credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' } })
      // 4xx other than rate limit = the server will never take these: drop them
      sent = res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)
    } catch {
      sent = false
    }
  }
  if (sent) {
    const ids = new Set(batch.map((e) => e.event_id))
    queue = queue.filter((e) => !ids.has(e.event_id))
  }
  persist()
  if (queue.length) schedule()
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  restore()
  captureTouch()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush(true)
  })
  window.addEventListener('pagehide', () => void flush(true))
}

/** Records one event (dictionary names only — shared/tracking/events.json). */
export function track(event: AnalyticsEventName, props: Props = {}, screen?: string | null) {
  if (!enabled || typeof window === 'undefined' || consent === 'off') return
  start()
  const clean: Props = {}
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null && v !== '') clean[k] = v
  queue.push({
    event_id: uuid(),
    event,
    ts: new Date().toISOString(),
    anonymous_id: anonymousId(),
    session_id: sessionId(),
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    locale: document.documentElement.lang || null,
    screen: screen ?? currentScreen,
    props: clean,
    ...touch(),
  })
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE)
  persist()
  if (queue.length >= BATCH) void flush()
  else schedule()
}

/** Called by ReconsentGate: true = signed out, or signed in with the current Privacy Policy accepted. */
export function setAnalyticsConsent(on: boolean) {
  if (!enabled) return
  const next = on ? 'on' : 'off'
  if (consent === next) return
  consent = next
  if (next === 'off') {
    queue = []
    safe(() => localStorage.removeItem(STORE_KEY), undefined)
    return
  }
  start()
  void flush()
}

export function setAnalyticsScreen(screen: string | null) {
  currentScreen = screen
}

/** Measures how long a detail page stays open; call the returned function when it closes. */
export function startDwell() {
  const started = Date.now()
  return () => Date.now() - started
}
