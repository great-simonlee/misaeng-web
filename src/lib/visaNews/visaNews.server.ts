import { pointsRest } from '@lib/points/rest.server'

/**
 * Visa news (supabase/visa_news.sql): official USCIS / Federal Register announcements the ERP fetched, translated and
 * an admin published. Read here with the service role; only `published` rows ever leave the server.
 */
export type VisaNewsRow = {
  id: string
  source: 'uscis' | 'federal_register'
  url: string
  published_at: string
  fetched_at: string
  title_en: string
  summary_en: string | null
  body_en: string | null
  title_ko: string | null
  summary_ko: string | null
  body_ko: string | null
}

const LIST_SELECT = 'id,source,url,published_at,title_en,summary_en,title_ko,summary_ko'
const DETAIL_SELECT = `${LIST_SELECT},fetched_at,body_en,body_ko`

const enc = encodeURIComponent

/** Cursor = "<published_at>|<id>" of the last row on the previous page */
export async function listPublishedVisaNews(limit: number, cursor: string | null, locale: string) {
  const size = Math.max(1, Math.min(limit, 30))
  let filter = 'status=eq.published'
  const [at, id] = (cursor || '').split('|')
  if (at && id && !Number.isNaN(Date.parse(at))) {
    filter += `&or=(published_at.lt.${enc(at)},and(published_at.eq.${enc(at)},id.lt.${enc(id)}))`
  }
  const rows = await pointsRest<VisaNewsRow[]>(
    `visa_news?${filter}&select=${LIST_SELECT}&order=published_at.desc,id.desc&limit=${size + 1}`,
  )
  const page = (rows || []).slice(0, size)
  const last = page[page.length - 1]
  const ko = locale === 'ko'
  return {
    items: page.map((row) => ({
      id: row.id,
      source: row.source,
      publishedAt: new Date(row.published_at).toISOString(),
      title: (ko && row.title_ko) || row.title_en,
      summary: (ko && row.summary_ko) || row.summary_en || '',
      url: row.url,
    })),
    nextCursor: (rows || []).length > size && last ? `${last.published_at}|${last.id}` : null,
  }
}

export async function getPublishedVisaNews(id: string) {
  const rows = await pointsRest<VisaNewsRow[]>(
    `visa_news?id=eq.${enc(id)}&status=eq.published&select=${DETAIL_SELECT}&limit=1`,
  )
  const row = rows?.[0]
  if (!row) return null
  return {
    id: row.id,
    source: row.source,
    publishedAt: new Date(row.published_at).toISOString(),
    fetchedAt: new Date(row.fetched_at).toISOString(),
    url: row.url,
    titleKo: row.title_ko,
    summaryKo: row.summary_ko,
    bodyKo: row.body_ko,
    titleEn: row.title_en,
    summaryEn: row.summary_en,
    bodyEn: row.body_en,
  }
}

/* Visa Bulletin (supabase/visa_bulletin.sql) */

type BulletinRow = {
  month: string
  final_action: Record<string, Record<string, string>>
  dates_for_filing: Record<string, Record<string, string>>
  source_url: string | null
}

/** The latest published month and the one before it (for the ▲▼ changes). */
export async function getPublishedVisaBulletin() {
  const rows = await pointsRest<BulletinRow[]>(
    'visa_bulletin?status=eq.published&select=month,final_action,dates_for_filing,source_url&order=month.desc&limit=2',
  )
  const shape = (row?: BulletinRow) =>
    row
      ? {
          month: row.month.slice(0, 7),
          sourceUrl: row.source_url,
          finalAction: row.final_action || {},
          datesForFiling: row.dates_for_filing || {},
        }
      : null
  return { current: shape(rows?.[0]), previous: shape(rows?.[1]) }
}
