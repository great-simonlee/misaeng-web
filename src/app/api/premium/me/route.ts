import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestBearerToken } from '../../agent-auth/lib/ellieoServer'
import { getPremiumState } from '@lib/premium/access.server'
import { appAccountTokenFor } from '@lib/premium/apple.server'
import { androidBillingEnabled, googleAccountIdFor, rememberGoogleAccount } from '@lib/premium/google.server'
import { premiumPayload } from '@lib/premium/payload.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/premium/me — this member's Premium state (logged out → premium false, loggedIn false), plus the
 * appAccountToken the iOS app puts on purchases, and for Android whether Google Play purchases are open
 * (androidBilling) plus the obfuscated account id the app puts on them (googleAccountId). 503 when the state can't be read (the apps then show no buy button,
 * so someone who already has Premium is never offered a second subscription).
 */
export async function GET() {
  const user = await resolveAuthenticatedUser().catch(() => null)
  // The app sent a token that no longer works (expired): 401 so it refreshes and asks again — answering "not
  // Premium" here would show buy buttons to someone who already pays.
  if (!user && (await getRequestBearerToken().catch(() => null))) {
    return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  }
  const state = await getPremiumState(user)
  if (state.degraded) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  const [appAccountToken, androidBilling] = await Promise.all([
    user ? appAccountTokenFor(user.uid).catch(() => null) : null,
    androidBillingEnabled(),
  ])
  // Link the googleAccountId below to this account, so a Play purchase it makes can be matched without the app.
  // Not awaited: the response never waits on (or fails because of) this write.
  if (user) void rememberGoogleAccount(user.uid).catch(() => undefined)
  return NextResponse.json({
    ...premiumPayload(state, Boolean(user)),
    appAccountToken,
    // Android: show the Google Play paywall (off until the team opens it) and the id to put on purchases
    androidBilling,
    googleAccountId: user ? googleAccountIdFor(user.uid) : null,
  })
}
