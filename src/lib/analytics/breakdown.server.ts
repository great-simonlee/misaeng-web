import { pointsRest, pointsRpc } from '@lib/points/rest.server'

import { addDays, BRAND, nyToday, refreshToday } from './reports.server'

/*
 * Wide reads for the ERP Analytics screens (/api/internal/analytics/breakdown and /series).
 * - breakdown: one New York date range → KPIs vs the previous range of the same length (from metrics_daily), the daily
 *   series, and every raw-event section from analytics_breakdown() (supabase/analytics_more.sql).
 * - series: one metric per day from metrics_daily.
 */

export const PLATFORMS = ['all', 'ios', 'android', 'web'] as const
export type Platform = (typeof PLATFORMS)[number]

/** People counted over a window: the value on the last day of the range. */
const LEVEL = ['wau', 'mau', 'active_wau', 'engaged_wau', 'active_mau'] as const
/** Things that happen: summed over the range. */
const COUNT = ['signups', 'verifications', 'inquiries', 'new_posts', 'reviews', 'purchases', 'push_opens', 'coffee_chats'] as const
/** Share of a signup day cohort that came back: averaged over the days that have a value. */
const RATE = ['d1_retention', 'd7_retention', 'd30_retention'] as const
export const SERIES_METRICS = ['dau', ...LEVEL, ...COUNT, ...RATE] as const

type MetricRow = { day: string; platform: string; metric: string; value: number | string }

function kpis(rows: MetricRow[], from: string, to: string, platform: Platform) {
  const inRange = rows.filter((r) => r.day >= from && r.day <= to)
  const pick = (metric: string, p = platform) => inRange.filter((r) => r.metric === metric && r.platform === p)
  const out: Record<string, number | null> = {}
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1
  out.dau = pick('dau').reduce((s, r) => s + Number(r.value), 0) / days
  for (const m of LEVEL) out[m] = Number(pick(m).find((r) => r.day === to)?.value ?? pick(m).at(-1)?.value ?? 0)
  for (const m of COUNT) out[m] = pick(m).reduce((s, r) => s + Number(r.value), 0)
  for (const m of RATE) {
    const values = pick(m, 'all').map((r) => Number(r.value))
    out[m] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  }
  out.stickiness = out.mau ? (out.dau ?? 0) / out.mau : null
  out.dau = Math.round((out.dau ?? 0) * 10) / 10
  return out
}

const cache = new Map<string, { at: number; data: unknown }>()

export async function breakdown(from: string, to: string, platform: Platform) {
  const key = `${from}|${to}|${platform}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.data
  await refreshToday()
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1
  const prevTo = addDays(from, -1)
  const prevFrom = addDays(prevTo, -(days - 1))
  const platforms = platform === 'all' ? 'all' : `all,${platform}`
  const [rows, sections] = await Promise.all([
    pointsRest<MetricRow[]>(
      `metrics_daily?brand=eq.${BRAND}&day=gte.${prevFrom}&day=lte.${to}&platform=in.(${platforms})&select=day,platform,metric,value&order=day.asc&limit=50000`,
    ),
    pointsRpc<Record<string, unknown>>('analytics_breakdown', { p_from: from, p_to: to, p_brand: BRAND, p_platform: platform }),
  ])
  // daily series for the charts (at least 14 points so a "Today" view still has a trend)
  const seriesFrom = days < 14 ? addDays(to, -13) : from
  const series: Record<string, number | string>[] = []
  if (seriesFrom < prevFrom) {
    // older days are not in `rows`: fetch them separately (rare: only for ranges < 7 days)
    rows.push(
      ...(await pointsRest<MetricRow[]>(
        `metrics_daily?brand=eq.${BRAND}&day=gte.${seriesFrom}&day=lt.${prevFrom}&platform=in.(${platforms})&select=day,platform,metric,value&limit=20000`,
      )),
    )
  }
  for (let day = seriesFrom; day <= to; day = addDays(day, 1)) {
    const point: Record<string, number | string> = { day }
    for (const m of SERIES_METRICS) point[m] = 0
    for (const r of rows) {
      if (r.day !== day) continue
      if (r.platform === platform || ((RATE as readonly string[]).includes(r.metric) && r.platform === 'all')) point[r.metric] = Number(r.value)
    }
    series.push(point)
  }
  const data = {
    from,
    to,
    days,
    platform,
    asOf: nyToday(),
    prevFrom,
    prevTo,
    kpis: kpis(rows, from, to, platform),
    prev: kpis(rows, prevFrom, prevTo, platform),
    series,
    ...sections,
  }
  cache.set(key, { at: Date.now(), data })
  if (cache.size > 50) cache.delete(cache.keys().next().value as string)
  return data
}

export async function series(metric: string, days: number, platform: Platform) {
  const to = nyToday()
  const from = addDays(to, -(days - 1))
  const p = (RATE as readonly string[]).includes(metric) ? 'all' : platform
  const rows = await pointsRest<{ day: string; value: number | string }[]>(
    `metrics_daily?brand=eq.${BRAND}&metric=eq.${metric}&platform=eq.${p}&day=gte.${from}&select=day,value&order=day.asc&limit=1000`,
  )
  const byDay = new Map(rows.map((r) => [r.day, Number(r.value)]))
  const points: { day: string; value: number }[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) points.push({ day, value: byDay.get(day) ?? 0 })
  return { metric, platform: p, from, to, points }
}

/** ?from&to (YYYY-MM-DD, New York) or ?days=1|7|28|90 (ending today). Max 92 days. */
export function parseRange(params: URLSearchParams) {
  const today = nyToday()
  const isDay = (v: string | null): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v))
  const fromParam = params.get('from')
  const toParam = params.get('to')
  let to = isDay(toParam) && toParam <= today ? toParam : today
  let from: string
  if (isDay(fromParam)) from = fromParam
  else {
    const days = Math.min(Math.max(Number.parseInt(params.get('days') ?? '', 10) || 7, 1), 92)
    from = addDays(to, -(days - 1))
  }
  if (from > to) [from, to] = [to, from]
  if (from < addDays(to, -91)) from = addDays(to, -91)
  return { from, to }
}

export function parsePlatform(value: string | null): Platform {
  return (PLATFORMS as readonly string[]).includes(value ?? '') ? (value as Platform) : 'all'
}
