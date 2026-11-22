import { NextResponse } from 'next/server'

import { CodeError, getBatch, updateBatch } from '@lib/premium/codes.server'
import { isInternalAuthorized, UNAUTHORIZED_INTERNAL } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

function codeError(error: unknown) {
  if (error instanceof CodeError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  console.error('[internal/premium/codes/:id]', error)
  return NextResponse.json({ error: 'Premium code request failed.' }, { status: 500 })
}

/** GET (ERP) → { batch, codes: [{ …code, display }], redemptions: [{ …redemption, code }] } */
export async function GET(request: Request, context: Context) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  try {
    return NextResponse.json(await getBatch((await context.params).id))
  } catch (error) {
    return codeError(error)
  }
}

/** PATCH (ERP) { status?: 'active' | 'paused' | 'closed', redeemBy?, note? } → { batch } */
export async function PATCH(request: Request, context: Context) {
  if (!isInternalAuthorized(request)) return UNAUTHORIZED_INTERNAL()
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  try {
    return NextResponse.json({ batch: await updateBatch((await context.params).id, body) })
  } catch (error) {
    return codeError(error)
  }
}
