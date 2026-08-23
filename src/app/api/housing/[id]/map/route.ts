import { NextResponse } from 'next/server'

import { getListingArea, getListingDisplayAddress } from '@lib/housing/listing'
import { getHousingMapCoordinates } from '@lib/housing/publicListing'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import type { HousingListing } from '@/types/nyc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HousingMapRouteProps {
  params: Promise<{ id: string }>
}

function mapSearchQuery(listing: HousingListing) {
  const coords = getHousingMapCoordinates(listing)
  if (coords) return `${coords.latitude},${coords.longitude}`
  const displayed = getListingDisplayAddress(listing).trim()
  const area = getListingArea(listing).trim()
  return [displayed, area, 'New York, NY'].filter(Boolean).join(', ')
}

function googleEmbedSrc(query: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=en&output=embed&iwloc=near`
}

function googleOpenHref(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(request: Request, { params }: HousingMapRouteProps) {
  try {
    const { id } = await params
    const listing = await getStoredHousingListing(id)
    if (!listing || listing.status === 'closed') {
      return new NextResponse('Not found', { status: 404 })
    }

    const query = mapSearchQuery(listing)
    const openExternal = new URL(request.url).searchParams.get('open') === '1'
    if (openExternal) {
      return NextResponse.redirect(googleOpenHref(query), 302)
    }

    const title = escapeHtml(getListingDisplayAddress(listing) || 'Location')
    const src = googleEmbedSrc(query)
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #eef0f3; }
    .frame { position: absolute; inset: 0; overflow: hidden; }
    iframe {
      position: absolute;
      left: 0;
      width: 100%;
      border: 0;
      top: -56px;
      height: calc(100% + 56px);
    }
  </style>
</head>
<body>
  <div class="frame">
    <iframe
      title="${title}"
      src="${src}"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen
    ></iframe>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=120',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    })
  } catch (error) {
    console.error('Housing map error:', error)
    return new NextResponse('Failed to load map.', { status: 500 })
  }
}
