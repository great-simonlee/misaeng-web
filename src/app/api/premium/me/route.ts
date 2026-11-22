import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getPremiumState } from '@lib/premium/access.server'
import { premiumPayload } from '@lib/premium/payload.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/premium/me — this member's Premium state (logged out → premium false, loggedIn false). */
export async function GET() {
  const user = await resolveAuthenticatedUser().catch(() => null)
  const state = await getPremiumState(user)
  return NextResponse.json(premiumPayload(state, Boolean(user)))
}
