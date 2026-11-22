/**
 * Visa sponsor history per company (ellieo-erp supabase/visa_sponsors.sql, loaded each quarter by
 * ellieo-erp scripts/visa-dol from the U.S. Department of Labor OFLC disclosure files).
 * Returns null when the tables are not there yet (then the API answers 404 and the apps hide the card).
 */

export type VisaSponsorYear = { fy: number; h1b: number; greenCard: number }
export type VisaSponsorRole = {
  kind: 'h1b' | 'greenCard'
  region: string
  title: string
  count: number
  p25: number
  median: number
  p75: number
}
export type VisaSponsorSource = { name: string; url: string; coverage: string; dataThrough: string }
export type VisaSponsorData = { years: VisaSponsorYear[]; roles: VisaSponsorRole[]; source: VisaSponsorSource }

const CACHE_MS = 10 * 60_000
const cache = new Map<string, { at: number; value: VisaSponsorData | null }>()

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

async function rows<T>(path: string): Promise<T[] | null> {
  const c = config()
  if (!c) return null
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}` },
    cache: 'no-store',
  })
  if (!res.ok) return null // table missing (not set up yet) or Supabase down
  return (await res.json()) as T[]
}

export async function getVisaSponsorData(companyId: string): Promise<VisaSponsorData | null> {
  const hit = cache.get(companyId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value
  const id = encodeURIComponent(companyId)
  const [meta, years, roles] = await Promise.all([
    rows<{ coverage: string; data_through: string; source_name: string; source_url: string }>(
      'visa_data_meta?select=coverage,data_through,source_name,source_url&id=eq.1',
    ),
    rows<{ fy: number; h1b: number; green_card: number }>(
      `visa_company_years?select=fy,h1b,green_card&company_id=eq.${id}&order=fy.asc`,
    ),
    rows<VisaSponsorRole>(
      `visa_company_roles?select=kind,region,title,count,p25,median,p75&company_id=eq.${id}&order=count.desc`,
    ),
  ])
  const m = meta?.[0]
  const value: VisaSponsorData | null =
    m && years && roles
      ? {
          years: years.map((y) => ({ fy: Number(y.fy), h1b: y.h1b, greenCard: y.green_card })),
          roles: roles.map((r) => ({ ...r, p25: Number(r.p25), median: Number(r.median), p75: Number(r.p75) })),
          source: { name: m.source_name, url: m.source_url, coverage: m.coverage, dataThrough: m.data_through },
        }
      : null
  cache.set(companyId, { at: Date.now(), value })
  return value
}
