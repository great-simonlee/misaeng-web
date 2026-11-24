import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getPremiumState } from '@lib/premium/access.server'
import { GooglePlayError, isGooglePlayConfigured, syncGoogleSubscription } from '@lib/premium/google.server'
import { premiumPayload } from '@lib/premium/payload.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/google {purchaseToken, productId?} — the Android app sends a Play Billing purchase after a
 * purchase or restore; it is confirmed with the Google Play Developer API (and acknowledged) and saved for this
 * account. Returns /api/premium/me.
 */
export async function POST(request: Request) {
  if (!isGooglePlayConfigured()) {
    return NextResponse.json({ error: 'Google Play purchases are not configured.' }, { status: 503 })
  }
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { purchaseToken?: string }
  const token = typeof body.purchaseToken === 'string' ? body.purchaseToken.trim() : ''
  if (!token || token.length > 1000) return NextResponse.json({ error: 'Invalid purchase.' }, { status: 400 })

  try {
    await syncGoogleSubscription(token, user.uid, user.email)
  } catch (error) {
    if (error instanceof GooglePlayError) {
      return NextResponse.json(
        { error: error.message, ...(error.status === 409 ? { code: 'OTHER_ACCOUNT' } : {}) },
        { status: error.status },
      )
    }
    console.error('[premium/google]', error)
    return NextResponse.json({ error: 'Failed to verify the purchase.' }, { status: 500 })
  }
  const state = await getPremiumState(user)
  if (state.degraded) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  return NextResponse.json(premiumPayload(state, true))
}
