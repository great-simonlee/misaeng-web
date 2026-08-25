import { NextResponse } from 'next/server'

import { buildStaticMapUrl } from '@lib/community/places.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return NextResponse.json({ error: '잘못된 좌표예요.' }, { status: 400 })
    }

    const map = buildStaticMapUrl(lat, lng)
    if (map.type === 'osm') {
      return NextResponse.redirect(map.url, 302)
    }

    const upstream = await fetch(map.url, { cache: 'force-cache' })
    if (!upstream.ok) {
      const fallback = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=640x360&maptype=mapnik&markers=${lat},${lng},red-pushpin`
      return NextResponse.redirect(fallback, 302)
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    const buffer = await upstream.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('Static map error:', error)
    return NextResponse.json(
      { error: '지도를 불러오지 못했어요.' },
      { status: 500 },
    )
  }
}
