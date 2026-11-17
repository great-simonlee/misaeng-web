import { NextResponse } from 'next/server'

import { getRequestLocale } from '@lib/i18n/server'
import { PointsStoreError } from '@lib/points/rest.server'
import { listPublishedVisaNews } from '@lib/visaNews/visaNews.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/visa-news?limit=3&cursor=&locale=ko → { items: [{ id, source, publishedAt, title, summary, url }], nextCursor }
 * Published official announcements (USCIS · Federal Register), newest first. title/summary in Korean when translated.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const locale = params.get('locale') === 'en' ? 'en' : params.get('locale') === 'ko' ? 'ko' : await getRequestLocale(request)
  const limit = Number(params.get('limit')) || 20
  try {
    const page = await listPublishedVisaNews(limit, params.get('cursor'), locale)
    return NextResponse.json(page, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  } catch (error) {
    // Table not created yet → an empty list, so the apps just hide the ticker
    if (error instanceof PointsStoreError && error.setupRequired) return NextResponse.json({ items: [], nextCursor: null })
    console.error('Visa news list error:', error)
    return NextResponse.json({ error: 'Failed to load visa news.' }, { status: 500 })
  }
}
