import { NextResponse } from 'next/server'

import { renewListing } from '@lib/agents/listings.server'

import { errorResponse, loginRequired, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Renew (live) or repost (expired, within 90 days, photos still kept): live for another 30 days. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.', code: 'NOT_FOUND' }, { status: 404 })
    await renewListing(id, uid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'renew listing')
  }
}
