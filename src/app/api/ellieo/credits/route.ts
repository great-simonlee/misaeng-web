import { NextResponse } from 'next/server'

import { creditBalance, creditLedger } from '@lib/ellieo/listingPlans.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** My credits: { balance: { paid, reward, total }, ledger: [{ bucket, amount, title, note, createdAt, expiresAt… }] } */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const [balance, ledger] = await Promise.all([creditBalance(uid), creditLedger(uid, 100)])
    return NextResponse.json({ balance, ledger }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'credits')
  }
}
