import { ANALYTICS_EVENTS, isAnalyticsEventName } from './events.generated'
import { pointsRest, pointsRpc, PointsStoreError } from '@lib/points/rest.server'

/*
 * Behavior events from the apps and the website → analytics_events (supabase/analytics.sql).
 * The client never chooses the account: user_id comes from the signed-in session on the server.
 * Unknown event names and props outside shared/tracking/events.json are dropped.
 */

export const TRACK_MAX_EVENTS = 50
export const TRACK_MAX_BYTES = 64 * 1024

const PLATFORMS = new Set(['web', 'ios', 'android'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ID = /^[A-Za-z0-9_.:-]{8,80}$/
const PAST_MS = 7 * 24 * 3600_000
const FUTURE_MS = 5 * 60_000

type Spec = Record<string, string>
type Touch = { source?: string; medium?: string; campaign?: string; content?: string; ref?: string }

export type TrackRow = {
  event_id: string
  ts: string
  event: string
  user_id: string | null
  anonymous_id: string
  session_id: string | null
  brand: 'misaeng'
  platform: string
  app_version: string | null
  locale: string | null
  screen: string | null
  props: Record<string, unknown>
}

const str = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

/** Keeps only the props the dictionary defines, with the right type (an event missing a required prop is dropped). */
function cleanProps(spec: Spec, raw: unknown): Record<string, unknown> | null {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const out: Record<string, unknown> = {}
  for (const [key, rule] of Object.entries(spec)) {
    const optional = rule.endsWith('?')
    const type = optional ? rule.slice(0, -1) : rule
    const value = input[key]
    let ok: unknown = undefined
    if (type === 'number') {
      const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
      if (Number.isFinite(n)) ok = Math.round(n * 1000) / 1000
    } else if (type === 'boolean') {
      if (typeof value === 'boolean') ok = value
    } else if (type === 'string') {
      const s = typeof value === 'number' ? String(value) : str(value, key === 'query' ? 200 : 300)
      if (s) ok = s
    } else {
      // fixed set 'a|b|c'
      if (typeof value === 'string' && type.split('|').includes(value)) ok = value
    }
    if (ok === undefined) {
      if (!optional) return null
      continue
    }
    out[key] = ok
  }
  return out
}

function cleanTouch(raw: unknown): Touch | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const touch: Touch = {}
  for (const key of ['source', 'medium', 'campaign', 'content'] as const) {
    const v = str(r[key], 100)
    if (v) touch[key] = v
  }
  return Object.keys(touch).length ? touch : null
}

/** Validates one client event. Returns null when it must be dropped. */
export function toRow(raw: unknown, userId: string | null, now = Date.now()): (TrackRow & { touch: Touch | null }) | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (!isAnalyticsEventName(e.event)) return null
  if (typeof e.event_id !== 'string' || !UUID.test(e.event_id)) return null
  const anonymous = typeof e.anonymous_id === 'string' && ID.test(e.anonymous_id) ? e.anonymous_id : null
  if (!anonymous) return null
  const platform = typeof e.platform === 'string' && PLATFORMS.has(e.platform) ? e.platform : null
  if (!platform) return null
  const props = cleanProps(ANALYTICS_EVENTS[e.event] as Spec, e.props)
  if (!props) return null
  const parsed = typeof e.ts === 'string' ? Date.parse(e.ts) : NaN
  const ts = Number.isFinite(parsed) ? Math.min(Math.max(parsed, now - PAST_MS), now + FUTURE_MS) : now
  const utm = cleanTouch(e.utm)
  const ref = str(e.ref, 100)
  const touch = utm || ref ? { ...(utm ?? {}), ...(ref ? { ref } : {}) } : null
  if (touch) props.touch = touch
  return {
    event_id: e.event_id.toLowerCase(),
    ts: new Date(ts).toISOString(),
    event: e.event,
    user_id: userId,
    anonymous_id: anonymous,
    session_id: str(e.session_id, 80),
    brand: 'misaeng',
    platform,
    app_version: str(e.app_version, 40),
    locale: str(e.locale, 10),
    screen: str(e.screen, 120),
    props,
    touch,
  }
}

// Small in-process limiter (one pm2 process): ~1,000 events per 10 minutes per account / device / IP.
const WINDOW_MS = 10 * 60_000
const LIMIT = 1000
const buckets = new Map<string, { start: number; count: number }>()

export function allowEvents(key: string, count: number, now = Date.now()) {
  const b = buckets.get(key)
  if (!b || now - b.start > WINDOW_MS) {
    if (buckets.size > 20_000) buckets.clear()
    buckets.set(key, { start: now, count })
    return count <= LIMIT
  }
  b.count += count
  return b.count <= LIMIT
}

const linked = new Set<string>()

/** Saves the rows (a resent event is ignored) and ties this device / browser to the account. */
export async function storeEvents(rows: (TrackRow & { touch: Touch | null })[]) {
  if (!rows.length) return
  await pointsRest('analytics_events?on_conflict=event_id,ts', {
    method: 'POST',
    body: JSON.stringify(
      rows.map((r) => {
        const row: Partial<typeof r> = { ...r }
        delete row.touch
        return row
      }),
    ),
    prefer: 'resolution=ignore-duplicates,return=minimal',
  })
  const userId = rows[0].user_id
  if (!userId) return
  const byAnon = new Map<string, Touch | null>()
  for (const row of rows) {
    if (!byAnon.has(row.anonymous_id) || (row.touch && !byAnon.get(row.anonymous_id))) byAnon.set(row.anonymous_id, row.touch)
  }
  for (const [anon, touch] of byAnon) {
    const key = `${anon}:${userId}`
    if (linked.has(key) && !touch) continue
    try {
      await pointsRpc('analytics_link_identity', {
        p_anonymous_id: anon,
        p_user_id: userId,
        p_touch: touch ? { ...touch, at: new Date().toISOString() } : null,
      })
      if (linked.size > 50_000) linked.clear()
      linked.add(key)
    } catch (error) {
      if (!(error instanceof PointsStoreError && error.setupRequired)) console.error('[analytics] link identity', error)
    }
  }
}
