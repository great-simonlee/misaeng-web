import { NextResponse } from 'next/server'

import { createListing, listListings, type ListingInput } from '@lib/agents/listings.server'

import { errorResponse, loginRequired, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The housing board: live listings, plus the viewer's own expired ones (`mineExpired`) for the repost bar. */
export async function GET(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  try {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50) || 50
    return NextResponse.json(await listListings(await signedInUid(), limit))
  } catch (error) {
    return errorResponse(error, 'listings')
  }
}

/** Posts a listing from uploaded photos (see /api/agents/uploads). */
export async function POST(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const body = (await request.json()) as ListingInput
    return NextResponse.json({ listing: await createListing(uid, body) })
  } catch (error) {
    return errorResponse(error, 'post listing')
  }
}
