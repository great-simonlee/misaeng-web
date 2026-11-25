import { NextResponse } from 'next/server'

import { claimAppleTransaction } from '@lib/ellieo/appleCredits.server'
import { creditBalance } from '@lib/ellieo/listingPlans.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * iOS: a StoreKit credit-pack purchase → credits. { transactionId, signedTransaction? } → { purchaseId, created, balance }.
 * The app finishes the transaction only after a 2xx (or a 409 that says it was another account's / refunded).
 */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const body = await jsonBody(request)
    const result = await claimAppleTransaction({
      uid,
      transactionId: String(body.transactionId ?? ''),
      signedTransaction: typeof body.signedTransaction === 'string' ? body.signedTransaction : null,
    })
    return NextResponse.json({ ...result, balance: await creditBalance(uid) })
  } catch (error) {
    return errorResponse(error, 'App Store credits')
  }
}
