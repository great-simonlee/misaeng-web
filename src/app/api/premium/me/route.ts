import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getPremiumState } from '@lib/premium/access.server'
import { appAccountTokenFor } from '@lib/premium/apple.server'
import { premiumPayload } from '@lib/premium/payload.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/premium/me — this member's Premium state (logged out → premium false, loggedIn false), plus the
 * appAccountToken the iOS app puts on purchases. 503 when the state can't be read (the apps then show no buy button,
 * so someone who already has Premium is never offered a second subscription).
 */
export async function GET() {
  const user = await resolveAuthenticatedUser().catch(() => null)
  const state = await getPremiumState(user)
  if (state.degraded) return NextResponse.json({ error: 'Try again in a moment.' }, { status: 503 })
  const appAccountToken = user ? await appAccountTokenFor(user.uid).catch(() => null) : null
  return NextResponse.json({ ...premiumPayload(state, Boolean(user)), appAccountToken })
}
