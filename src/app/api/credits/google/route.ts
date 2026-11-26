import { NextResponse } from 'next/server'

import { claimGooglePurchase } from '@lib/agents/googleCredits.server'
import { creditBalance } from '@lib/agents/listingPlans.server'

import { errorResponse, jsonBody, loginRequired, creditsOff, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Android: a Play Billing credit-pack purchase → credits. { productId, purchaseToken } → { purchaseId, created, balance }.
 * The app consumes the purchase only after a 2xx (or a 409 OTHER_ACCOUNT / REFUNDED / an INVALID product); anything
 * else (pending, 5xx, offline) keeps it for the next launch.
 */
export async function POST(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const body = await jsonBody(request)
    const result = await claimGooglePurchase({
      uid,
      productId: String(body.productId ?? ''),
      purchaseToken: String(body.purchaseToken ?? ''),
    })
    return NextResponse.json({ ...result, balance: await creditBalance(uid) })
  } catch (error) {
    return errorResponse(error, 'Google Play credits')
  }
}
