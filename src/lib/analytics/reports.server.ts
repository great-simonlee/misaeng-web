import { NextResponse } from 'next/server'

import { enc, pointsRest, pointsRpc, PointsStoreError } from '@lib/points/rest.server'
import { SUPER_ADMIN_EMAIL } from '@lib/support/staffPush.server'

/*
 * Reads for the ERP (web ERP and the Misaeng ERP app) — /api/internal/analytics/*. Numbers come from the nightly
 * tables (supabase/analytics.sql); "today" is rolled up on demand at most every 10 minutes.
 */

export const BRAND = 'misaeng'
const KEYS = ['dau', 'wau', 'mau', 'active_wau', 'engaged_wau', 'active_mau', 'signups', 'verifications', 'inquiries',
  'new_posts', 'reviews', 'purchases', 'push_opens', 'coffee_chats', 'd1_retention', 'd7_retention', 'd30_retention'] as const

type MetricRow = { day: string; platform: string; metric: string; value: number | string }

export const nyToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

let liveAt = 0
let liveRun: Promise<void> | null = null

/** Recomputes today's (partial) row so the ERP shows today's numbers; at most every 10 minutes. */
export async function refreshToday() {
  if (Date.now() - liveAt < 10 * 60_000) return
  liveRun ??= pointsRpc('analytics_rollup', { p_day: nyToday() })
    .then(() => {
      liveAt = Date.now()
    })
    .catch((error) => console.error('[analytics] live rollup', error))
    .finally(() => {
      liveRun = null
    })
  await liveRun
}

export async function summary(days: number) {
  await refreshToday()
  const today = nyToday()
  const from = addDays(today, -(days + 7))
  const rows = await pointsRest<MetricRow[]>(
    `metrics_daily?brand=eq.${BRAND}&day=gte.${from}&select=day,platform,metric,value&order=day.asc&limit=20000`,
  )
  const pick = (day: string, platform = 'all') => {
    const out: Record<string, number> = {}
    for (const key of KEYS) out[key] = 0
    for (const r of rows) if (r.day === day && r.platform === platform) out[r.metric] = Number(r.value)
    return out
  }
  const series: { day: string; dau: number; wau: number; active_wau: number; engaged_wau: number; signups: number; inquiries: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i)
    const m = pick(day)
    series.push({ day, dau: m.dau, wau: m.wau, active_wau: m.active_wau, engaged_wau: m.engaged_wau, signups: m.signups, inquiries: m.inquiries })
  }
  const platforms: Record<string, { dau: number; wau: number; mau: number }> = {}
  for (const p of ['web', 'ios', 'android']) {
    const m = pick(today, p)
    platforms[p] = { dau: m.dau, wau: m.wau, mau: m.mau }
  }
  const yesterday = addDays(today, -1)
  return {
    asOf: today,
    today: pick(today),
    prev: pick(addDays(today, -7)),
    yesterday: pick(yesterday),
    yesterdayPrev: pick(addDays(yesterday, -7)),
    series,
    platforms,
    hasData: rows.length > 0,
  }
}

export async function funnel(kind: 'signup' | 'housing', from: string, to: string) {
  const steps = await pointsRpc<{ step: string; users: number }[]>('analytics_funnel', { p_kind: kind, p_from: from, p_to: to, p_brand: BRAND })
  if (kind === 'housing') {
    // Tours and contracts live in the ERP deals; the ERP adds them to this list.
    const inquiries = await pointsRest<{ user_uid: string }[]>(
      `support_conversations?kind=eq.housing&brand=eq.${BRAND}&created_at=gte.${enc(`${from}T00:00:00-05:00`)}&created_at=lt.${enc(`${addDays(to, 1)}T00:00:00-05:00`)}&select=user_uid&limit=20000`,
    ).catch(() => [])
    steps.push({ step: 'housing_chats', users: new Set(inquiries.map((r) => r.user_uid)).size })
  }
  return { kind, from, to, steps: steps.map((s) => ({ name: s.step, count: Number(s.users) })) }
}

export async function cohorts(weeks: number) {
  const since = addDays(nyToday(), -7 * weeks)
  const rows = await pointsRest<{ cohort_week: string; week_n: number; users: number; retained: number }[]>(
    `cohort_retention?brand=eq.${BRAND}&cohort_week=gte.${since}&select=cohort_week,week_n,users,retained&order=cohort_week.desc,week_n.asc&limit=5000`,
  )
  const byWeek = new Map<string, { cohortWeek: string; users: number; weeks: { n: number; retained: number; rate: number }[] }>()
  for (const r of rows) {
    const row = byWeek.get(r.cohort_week) ?? { cohortWeek: r.cohort_week, users: 0, weeks: [] }
    if (r.week_n === 0) row.users = r.users
    row.weeks.push({ n: r.week_n, retained: r.retained, rate: r.users ? Math.round((r.retained / r.users) * 1000) / 1000 : 0 })
    byWeek.set(r.cohort_week, row)
  }
  return { rows: [...byWeek.values()] }
}

export async function content(type: string, days: number, limit: number) {
  if (type === 'search') {
    const rows = await pointsRpc<{ board: string; query: string; searches: number; zero_results: number }[]>(
      'analytics_top_searches', { p_days: days, p_limit: limit, p_brand: BRAND },
    )
    return { type, days, items: rows.map((r) => ({ board: r.board, query: r.query, searches: Number(r.searches), zeroResults: Number(r.zero_results) })) }
  }
  const rows = await pointsRpc<{ target_type: string; target_id: string; views: number; uniq_viewers: number; avg_dwell_ms: number | null; saves: number; inquiries: number }[]>(
    'analytics_top_content', { p_type: type, p_days: days, p_limit: limit, p_brand: BRAND },
  )
  return {
    type,
    days,
    items: rows.map((r) => ({
      targetType: r.target_type,
      targetId: r.target_id,
      views: Number(r.views),
      uniqViewers: Number(r.uniq_viewers),
      avgDwellMs: r.avg_dwell_ms,
      saves: Number(r.saves),
      inquiries: Number(r.inquiries),
    })),
  }
}

/** Who may open a member's timeline: the Super Admin (and anyone listed in ANALYTICS_TIMELINE_ADMINS). */
export function canViewTimeline(email: string | null | undefined) {
  const allowed = new Set(
    [SUPER_ADMIN_EMAIL, ...(process.env.ANALYTICS_TIMELINE_ADMINS ?? '').split(',')].map((e) => e.trim().toLowerCase()).filter(Boolean),
  )
  return Boolean(email && allowed.has(email.trim().toLowerCase()))
}

export async function timeline(uid: string, viewer: string, limit: number, before: string | null) {
  await pointsRest('analytics_timeline_views', {
    method: 'POST',
    body: JSON.stringify({ viewer_email: viewer.toLowerCase(), target_uid: uid }),
    prefer: 'return=minimal',
  })
  const rows = await pointsRpc<{ ts: string; event: string; platform: string; screen: string | null; props: Record<string, unknown>; signed_in: boolean }[]>(
    'analytics_timeline', { p_uid: uid, p_limit: limit, p_before: before },
  )
  return {
    uid,
    events: rows.map((r) => ({ ts: r.ts, event: r.event, platform: r.platform, screen: r.screen, props: r.props, signedIn: r.signed_in })),
  }
}

export type ExcludedAccount = { uid: string; email: string | null; reason: string | null; added_by: string | null; created_at: string }

export const listExcluded = () =>
  pointsRest<ExcludedAccount[]>('analytics_excluded_accounts?select=uid,email,reason,added_by,created_at&order=created_at.desc&limit=1000')

export async function addExcluded(input: { uid?: string; email?: string; reason?: string }, actor: string) {
  let uid = input.uid?.trim() || ''
  const email = input.email?.trim().toLowerCase() || null
  if (!uid && email) {
    const rows = await pointsRest<{ uid: string }[]>(`auth_accounts?email=ilike.${enc(email)}&select=uid&limit=1`)
    uid = rows[0]?.uid ?? ''
  }
  if (!uid) return null
  await pointsRest('analytics_excluded_accounts?on_conflict=uid', {
    method: 'POST',
    body: JSON.stringify({ uid, email, reason: input.reason?.slice(0, 200) || null, added_by: actor }),
    prefer: 'resolution=merge-duplicates,return=minimal',
  })
  return uid
}

export const removeExcluded = (uid: string) =>
  pointsRest(`analytics_excluded_accounts?uid=eq.${enc(uid)}`, { method: 'DELETE', prefer: 'return=minimal' })

export function analyticsError(error: unknown) {
  if (error instanceof PointsStoreError && error.setupRequired) {
    return NextResponse.json({ error: 'Analytics tables are not set up (run supabase/analytics.sql).', code: 'ANALYTICS_NOT_CONFIGURED' }, { status: 503 })
  }
  console.error('[analytics] internal', error)
  return NextResponse.json({ error: (error as Error)?.message || 'Internal error', code: 'ANALYTICS_ERROR' }, { status: 500 })
}

export const clampInt = (value: string | null, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

export const isDay = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
