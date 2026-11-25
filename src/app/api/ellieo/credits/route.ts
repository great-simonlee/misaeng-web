import { NextResponse } from 'next/server'

import { getCreditsConfig } from '@lib/ellieo/credits.server'
import { creditBalance, creditLedger } from '@lib/ellieo/listingPlans.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * My credits: { balance: { paid, reward, total }, ledger: [...], topUp: { ios, android } }. A member with no rows gets
 * a real zero balance (never sample numbers).
 */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const [balance, ledger, config] = await Promise.all([creditBalance(uid), creditLedger(uid, 100), getCreditsConfig()])
    return NextResponse.json(
      { balance, ledger, topUp: { ios: config.topUpLinkIOS, android: config.topUpLinkAndroid } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return errorResponse(error, 'credits')
  }
}
