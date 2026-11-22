import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getPremiumState } from '@lib/premium/access.server'
import {
  AppleIapError,
  decodeJws,
  isAppleIapConfigured,
  syncAppleSubscription,
} from '@lib/premium/apple.server'
import { premiumPayload } from '@lib/premium/payload.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/apple {signedTransaction} — the iOS app sends a StoreKit 2 transaction after a purchase or
 * restore; it is confirmed with the App Store Server API and saved for this account. Returns /api/premium/me.
 */
export async function POST(request: Request) {
  if (!isAppleIapConfigured()) {
    return NextResponse.json({ error: 'App Store purchases are not configured.' }, { status: 503 })
  }
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { signedTransaction?: string }
  const tx = decodeJws<{ transactionId?: string; originalTransactionId?: string }>(body.signedTransaction)
  const id = tx?.originalTransactionId || tx?.transactionId
  if (!id) return NextResponse.json({ error: 'Invalid transaction.' }, { status: 400 })

  try {
    await syncAppleSubscription(id, user.uid, user.email)
  } catch (error) {
    if (error instanceof AppleIapError) {
      return NextResponse.json(
        { error: error.message, ...(error.status === 409 ? { code: 'OTHER_ACCOUNT' } : {}) },
        { status: error.status },
      )
    }
    console.error('[premium/apple]', error)
    return NextResponse.json({ error: 'Failed to verify the purchase.' }, { status: 500 })
  }
  const state = await getPremiumState(user)
  // Saved, but the state can't be read right now: 503 keeps the transaction for a retry (the save is idempotent).
  if (state.degraded) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  return NextResponse.json(premiumPayload(state, true))
}
