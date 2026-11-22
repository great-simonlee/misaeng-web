import { NextResponse } from 'next/server'

import { CodeError, createBatch, listBatches, type CreateBatchInput } from '@lib/premium/codes.server'
import { internalActor, isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function codeError(error: unknown) {
  if (error instanceof CodeError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  console.error('[internal/premium/codes]', error)
  return NextResponse.json({ error: 'Premium code request failed.' }, { status: 500 })
}

/** GET /api/internal/premium/codes (ERP) → { batches: [{ …batch, used, codeCount, activeMembers }] } */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json({ batches: await listBatches() })
  } catch (error) {
    return codeError(error)
  }
}

/**
 * POST /api/internal/premium/codes (ERP) — new batch.
 * { kind: 'group' | 'single', name, organization?, duration: 'months' | 'fixed', months?, endsAt?, redeemBy?,
 *   maxMembers? (group), code? (group, empty = random), count? (single, ≤ 1000), note? } → { batch }
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = ((await request.json().catch(() => null)) || {}) as Partial<CreateBatchInput> & Record<string, unknown>
  try {
    const batch = await createBatch({ ...(body as CreateBatchInput), actor: internalActor(request, body) })
    return NextResponse.json({ batch })
  } catch (error) {
    return codeError(error)
  }
}
