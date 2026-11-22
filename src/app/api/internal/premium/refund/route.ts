import { NextResponse } from 'next/server'

import { getRefundQuote, refundSubscription, RefundError } from '@lib/premium/refunds.server'
import { internalActor, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refundError(error: unknown) {
  if (error instanceof RefundError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  const message = error instanceof Error ? error.message : 'Refund failed.'
  console.error('[internal/premium/refund]', error)
  return NextResponse.json({ error: `Stripe: ${message}` }, { status: 502 })
}

/** GET /api/internal/premium/refund?entitlementId= (ERP) → { quote } — what would be refunded and whether policy allows it. */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const id = new URL(request.url).searchParams.get('entitlementId') || ''
  if (!id) return NextResponse.json({ error: 'entitlementId is required.' }, { status: 400 })
  try {
    return NextResponse.json({ quote: await getRefundQuote(id) })
  } catch (error) {
    return refundError(error)
  }
}

/**
 * POST /api/internal/premium/refund (ERP) { entitlementId, reason: 'policy' | 'billing_error' | 'service_issue', note? }
 * Full amount of the latest charge only (no partial refunds); Premium ends immediately. → { refundId, amount, currency }
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = ((await request.json().catch(() => null)) || {}) as { entitlementId?: unknown; reason?: unknown; note?: unknown }
  const id = String(body.entitlementId || '').trim()
  if (!id) return NextResponse.json({ error: 'entitlementId is required.' }, { status: 400 })
  try {
    return NextResponse.json(
      await refundSubscription({ entitlementId: id, reason: body.reason, note: body.note, actor: internalActor(request, body as Record<string, unknown>) }),
    )
  } catch (error) {
    return refundError(error)
  }
}
