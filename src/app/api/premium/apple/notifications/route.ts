import { NextResponse } from 'next/server'

import {
  AppleIapError,
  decodeJws,
  isAppleIapConfigured,
  syncAppleSubscription,
} from '@lib/premium/apple.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/apple/notifications — App Store Server Notifications V2 (set this URL in App Store Connect →
 * App Information). The payload only says which subscription changed; its state is re-read from the App Store
 * Server API, and the row keeps its Misaeng owner. Unknown subscriptions (never sent by the app) are ignored.
 */
export async function POST(request: Request) {
  if (!isAppleIapConfigured()) {
    return NextResponse.json({ error: 'App Store purchases are not configured.' }, { status: 503 })
  }
  const body = (await request.json().catch(() => ({}))) as { signedPayload?: string }
  const payload = decodeJws<{ notificationType?: string; data?: { signedTransactionInfo?: string } }>(
    body.signedPayload,
  )
  const tx = decodeJws<{ originalTransactionId?: string; transactionId?: string }>(payload?.data?.signedTransactionInfo)
  const id = tx?.originalTransactionId || tx?.transactionId
  if (!id) return NextResponse.json({ ok: true })
  try {
    await syncAppleSubscription(id, null)
  } catch (error) {
    if (error instanceof AppleIapError && error.status === 404) return NextResponse.json({ ok: true })
    console.error('[premium/apple/notifications]', payload?.notificationType, error)
    // Apple retries on non-2xx
    return NextResponse.json({ error: 'Failed to process the notification.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
