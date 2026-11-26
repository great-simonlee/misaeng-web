import { NextResponse } from 'next/server'

import { reportListing } from '@lib/agents/listings.server'
import { errorResponse, jsonBody, loginRequired, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/**
 * Report an agent listing: { reason: scam | wrong_info | unavailable | discrimination | fee | other, note? } →
 * { ok, already }. One report per member per listing; staff review them in the ERP (Misaeng → Licensed Agents).
 */
export async function POST(request: Request, { params }: Props) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const body = await jsonBody(request)
    const result = await reportListing({
      id,
      uid,
      reason: String(body.reason ?? ''),
      note: typeof body.note === 'string' ? body.note : null,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return errorResponse(error, 'report listing')
  }
}
