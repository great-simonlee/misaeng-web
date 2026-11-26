import { NextResponse } from 'next/server'

import { purchaseBySession, readTopUpToken, receiptPath } from '@lib/agents/credits.server'

import { errorResponse, loginRequired, creditsOff, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** After Checkout: ?id=<session>&t= → { done, credits, receipt } once the webhook has added the credits. */
export async function GET(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const params = new URL(request.url).searchParams
    const uid = readTopUpToken(params.get('t')) ?? (await signedInUid())
    if (!uid) return loginRequired()
    const purchase = await purchaseBySession(params.get('id') ?? '', uid)
    if (!purchase) return NextResponse.json({ done: false })
    return NextResponse.json({ done: true, credits: purchase.credits, receipt: receiptPath(purchase.id) })
  } catch (error) {
    return errorResponse(error, 'checkout session')
  }
}
