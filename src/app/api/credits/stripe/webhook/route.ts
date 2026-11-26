import { NextResponse } from 'next/server'

import { handleStripeEvent } from '@lib/agents/credits.server'
import { verifyStripeSignature } from '@lib/agents/stripeWebhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe → Misaeng credits. Same Stripe account as Misaeng (Misaeng LLC), but its own webhook endpoint
 * (https://misaeng.com/api/agents/stripe/webhook) with its own signing secret MISAENG_CREDITS_STRIPE_WEBHOOK_SECRET. Events:
 * checkout.session.completed / async_payment_succeeded (adds the pack's paid credits, idempotent),
 * charge.refunded and charge.dispute.created (take the pack's credits back). Others are acknowledged and ignored.
 */
export async function POST(request: Request) {
  const secret = process.env.MISAENG_CREDITS_STRIPE_WEBHOOK_SECRET?.trim() || ''
  if (!secret) return NextResponse.json({ error: 'Payments are not set up.' }, { status: 503 })
  const raw = await request.text()
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }
  try {
    const result = await handleStripeEvent(JSON.parse(raw))
    return NextResponse.json({ received: true, ...result })
  } catch (error) {
    console.error('Misaeng Stripe webhook error:', error)
    // 500 → Stripe retries.
    return NextResponse.json({ error: 'Webhook failed.' }, { status: 500 })
  }
}
