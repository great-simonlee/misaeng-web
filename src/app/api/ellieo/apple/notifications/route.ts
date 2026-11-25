import { NextResponse } from 'next/server'

import { handleAppleNotification } from '@lib/ellieo/appleCredits.server'
import { CreditsError } from '@lib/ellieo/creditsCore.server'

import { notEllieo } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ellieo/apple/notifications — App Store Server Notifications V2 for the Ellieo app (App Store Connect →
 * Ellieo → App Information → Production / Sandbox Server URL). Refunds take credits back; the transaction is always read
 * back from Apple, never taken from the body. Non-2xx makes Apple retry.
 */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  const body = (await request.json().catch(() => ({}))) as { signedPayload?: string }
  try {
    return NextResponse.json({ ok: true, ...(await handleAppleNotification(body.signedPayload)) })
  } catch (error) {
    if (error instanceof CreditsError && error.code === 'APPLE_OFF') return NextResponse.json({ error: error.message }, { status: 503 })
    console.error('[ellieo/apple/notifications]', error)
    return NextResponse.json({ error: 'Failed to process the notification.' }, { status: 500 })
  }
}
