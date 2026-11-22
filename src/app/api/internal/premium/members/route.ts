import { NextResponse } from 'next/server'

import { listPremiumMembers, RefundError } from '@lib/premium/refunds.server'
import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/internal/premium/members?source=&q= (ERP) → { members: [{ …entitlement, refunds: [...] }] } (newest 300) */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const url = new URL(request.url)
  try {
    const members = await listPremiumMembers({ source: url.searchParams.get('source'), q: url.searchParams.get('q') })
    return NextResponse.json({ members })
  } catch (error) {
    if (error instanceof RefundError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('[internal/premium/members]', error)
    return NextResponse.json({ error: 'Loading Premium members failed.' }, { status: 500 })
  }
}
