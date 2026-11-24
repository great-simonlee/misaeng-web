import { NextResponse } from 'next/server'

import { createListing, listListings, type ListingInput } from '@lib/ellieo/listings.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The housing board: live listings, plus the viewer's own expired ones (`mineExpired`) for the repost bar. */
export async function GET(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50) || 50
    return NextResponse.json(await listListings(await signedInUid(), limit))
  } catch (error) {
    return errorResponse(error, 'listings')
  }
}

/** Posts a listing from uploaded photos (see /api/ellieo/uploads). */
export async function POST(request: Request) {
  const blocked = notEllieo()
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
