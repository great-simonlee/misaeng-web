import { NextResponse } from 'next/server'

import { normalizeMarketZip } from '@lib/community/marketplace'

export const runtime = 'nodejs'

/**
 * 중고거래 거래 지역 지도 (app): ZIP 코드 → 그 지역 중심 좌표. 주소가 아니라 ZIP 코드만 쓰므로 공개해도 된다.
 *   GET /api/marketplace/zip/10025 → { zip, latitude, longitude } (못 찾으면 404, 앱은 기기 지오코더로 대신한다)
 * OpenStreetMap Nominatim 의 우편번호 검색 (주소 검색보다 정확). ZIP 좌표는 바뀌지 않으니 서버 메모리와 CDN 에 오래 둔다.
 */
const cache = new Map<string, { latitude: number; longitude: number } | null>()

async function lookup(zip: string) {
  if (cache.has(zip)) return cache.get(zip) ?? null
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&countrycodes=us&format=json&limit=1`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Misaeng/1.0 (+https://misaeng.com)', 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const [hit] = (await response.json()) as { lat?: string; lon?: string }[]
  const latitude = Number(hit?.lat)
  const longitude = Number(hit?.lon)
  const point = hit && Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
  if (cache.size > 5000) cache.clear()
  cache.set(zip, point)
  return point
}

export async function GET(_request: Request, { params }: { params: Promise<{ zip: string }> }) {
  const zip = normalizeMarketZip((await params).zip)
  if (!zip) return NextResponse.json({ error: 'Invalid ZIP code.' }, { status: 400 })
  const point = await lookup(zip).catch(() => null)
  if (!point) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ zip, ...point }, { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000' } })
}
