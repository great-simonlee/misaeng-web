import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import {
  GooglePlayError,
  isGooglePlayConfigured,
  packageName,
  revokeGooglePurchase,
  syncGoogleSubscription,
} from '@lib/premium/google.server'
import { revokeGoogleCreditPurchase } from '@lib/agents/googleCredits.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/premium/google/notifications?token=<GOOGLE_RTDN_TOKEN> — Google Play Real-time developer notifications
 * (Pub/Sub push subscription). The message only says which purchase changed; its state is re-read from the Play
 * Developer API and the row keeps its Misaeng owner. Refunds (voided purchases) turn Premium off, or take back Misaeng credits (one-time products). Unknown purchases
 * (never reported by the app) are ignored. 2xx acknowledges the message; anything else makes Pub/Sub retry.
 */
type PushBody = { message?: { data?: string; messageId?: string } }
type Rtdn = {
  packageName?: string
  subscriptionNotification?: { notificationType?: number; purchaseToken?: string; subscriptionId?: string }
  voidedPurchaseNotification?: { purchaseToken?: string; productType?: number }
  testNotification?: object
}

function authorized(request: Request) {
  const expected = process.env.GOOGLE_RTDN_TOKEN?.trim()
  const given = new URL(request.url).searchParams.get('token') ?? ''
  if (!expected || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export async function POST(request: Request) {
  if (!isGooglePlayConfigured()) {
    return NextResponse.json({ error: 'Google Play purchases are not configured.' }, { status: 503 })
  }
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as PushBody
  let event: Rtdn = {}
  try {
    event = JSON.parse(Buffer.from(body.message?.data ?? '', 'base64').toString('utf8')) as Rtdn
  } catch {
    return NextResponse.json({ ok: true })
  }
  if (event.packageName && event.packageName !== packageName()) return NextResponse.json({ ok: true })

  try {
    const voided = event.voidedPurchaseNotification?.purchaseToken
    if (voided) {
      // productType 2 = one-time product (Misaeng credit packs); 1 = subscription (Premium). Unknown tokens are ignored.
      if (event.voidedPurchaseNotification?.productType === 2) await revokeGoogleCreditPurchase(voided)
      else await revokeGooglePurchase(voided)
      return NextResponse.json({ ok: true })
    }
    const token = event.subscriptionNotification?.purchaseToken
    if (token) await syncGoogleSubscription(token, null)
  } catch (error) {
    if (error instanceof GooglePlayError && error.status === 404) return NextResponse.json({ ok: true })
    console.error('[premium/google/notifications]', event.subscriptionNotification?.notificationType, error)
    return NextResponse.json({ error: 'Failed to process the notification.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
