import { NextResponse } from 'next/server'

import { getPublishedVisaNews } from '@lib/visaNews/visaNews.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/visa-news/{id} → { item: { id, source, publishedAt, fetchedAt, url, titleKo, summaryKo, bodyKo, titleEn, summaryEn, bodyEn } } */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const newsId = decodeURIComponent(String(id || '')).trim()
  if (!newsId || newsId.length > 200) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  try {
    const item = await getPublishedVisaNews(newsId)
    if (!item) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json({ item }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  } catch (error) {
    console.error('Visa news detail error:', error)
    return NextResponse.json({ error: 'Failed to load visa news.' }, { status: 500 })
  }
}
