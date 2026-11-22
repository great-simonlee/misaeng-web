import { NextResponse } from 'next/server'

import { CodeError, revokeCode, revokeRedemption } from '@lib/premium/codes.server'
import { internalActor, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/premium/codes/revoke (ERP)
 * { codeId } — an unused code can no longer be redeemed · { redemptionId } — that member's code Premium ends now.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = ((await request.json().catch(() => null)) || {}) as { codeId?: unknown; redemptionId?: unknown }
  try {
    if (body.codeId) return NextResponse.json({ code: await revokeCode(String(body.codeId)) })
    if (body.redemptionId) {
      return NextResponse.json({ redemption: await revokeRedemption(String(body.redemptionId), internalActor(request, body as Record<string, unknown>)) })
    }
    return NextResponse.json({ error: 'codeId or redemptionId is required.' }, { status: 400 })
  } catch (error) {
    if (error instanceof CodeError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error('[internal/premium/codes/revoke]', error)
    return NextResponse.json({ error: 'Revoking failed.' }, { status: 500 })
  }
}
