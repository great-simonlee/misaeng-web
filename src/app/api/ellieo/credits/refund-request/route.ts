import { NextResponse } from 'next/server'

import { checkReceiptKey, getPurchase, requestRefund } from '@lib/ellieo/credits.server'

import { errorResponse, jsonBody, creditsOff, notEllieo } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** From the receipt page: { id, k, reason } → { ok }. Eligible only within 7 days and if no credit of it was used. */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const body = await jsonBody(request)
    const id = String(body.id ?? '')
    if (!checkReceiptKey(id, typeof body.k === 'string' ? body.k : null)) {
      return NextResponse.json({ error: 'This receipt link is not valid.', code: 'INVALID' }, { status: 403 })
    }
    const purchase = await getPurchase(id)
    if (!purchase) return NextResponse.json({ error: 'Purchase not found.', code: 'NOT_FOUND' }, { status: 404 })
    await requestRefund(id, purchase.user_id, String(body.reason ?? ''))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'refund request')
  }
}
