import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getPremiumState } from '@lib/premium/access.server'
import { CodeError, redeemCode } from '@lib/premium/codes.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/redeem {code} — a Premium code (student council / partner / random). Web only: the apps never
 * show a code field (App Store rule 3.1.1); they just see the Premium. → { ok, until } · 4xx { error: CODE }
 * Codes: INVALID, NOT_FOUND, PAUSED, CLOSED, REDEEM_ENDED, USED_UP, ALREADY_USED, ALREADY_PREMIUM, EXPIRED, TOO_MANY.
 */
export async function POST(request: Request) {
  const user = await resolveAuthenticatedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'LOGIN_REQUIRED' }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { code?: unknown }

  // Staff preview accounts count as Premium only by email; let them test codes like members.
  const state = await getPremiumState({ uid: user.uid, email: null })
  if (state.premium) return NextResponse.json({ error: 'ALREADY_PREMIUM' }, { status: 409 })
  try {
    const result = await redeemCode({ code: body.code, uid: user.uid, email: user.email || null })
    if (!result.ok) {
      const status = result.error === 'TOO_MANY' ? 429 : result.error === 'ALREADY_PREMIUM' ? 409 : 400
      return NextResponse.json({ error: result.error }, { status })
    }
    return NextResponse.json({ ok: true, until: result.endsAt })
  } catch (error) {
    if (error instanceof CodeError) return NextResponse.json({ error: error.code }, { status: error.status })
    console.error('[premium/redeem]', error)
    return NextResponse.json({ error: 'FAILED' }, { status: 500 })
  }
}
