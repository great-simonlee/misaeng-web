import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { sendRenewalNotice, sendTrialEndingNotice } from '@lib/premium/notices.server'
import { handleChargeRefunded } from '@lib/premium/refunds.server'
import { getStripe, syncSubscription } from '@lib/premium/stripe.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/webhook — Stripe events (signature checked with STRIPE_WEBHOOK_SECRET). Premium is granted only
 * here: every subscription change is re-read from Stripe and mirrored into premium_entitlements.
 * Events: checkout.session.completed, customer.subscription.created / updated / deleted, invoice.paid,
 * invoice.payment_failed; charge.refunded (a full refund ends Premium now); reminders:
 * customer.subscription.trial_will_end (3 days before the trial ends) and invoice.upcoming (annual renewal, 7 days
 * before — set in Stripe Dashboard → Billing → Subscriptions).
 */
export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })

  const signature = request.headers.get('stripe-signature') || ''
  const body = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  async function syncById(id: string | null | undefined, uid?: string | null, email?: string | null) {
    if (!id) return
    const sub = await stripe!.subscriptions.retrieve(id)
    await syncSubscription(sub, uid, email)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        await syncById(subId, session.client_reference_id || session.metadata?.user_uid, session.customer_details?.email)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
          parent?: { subscription_details?: { subscription?: string } | null } | null
        }
        const subId =
          (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id) ||
          invoice.parent?.subscription_details?.subscription
        await syncById(subId)
        break
      }
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break
      case 'customer.subscription.trial_will_end':
        await sendTrialEndingNotice(event.data.object as Stripe.Subscription)
        break
      case 'invoice.upcoming':
        await sendRenewalNotice(event.data.object as Stripe.Invoice)
        break
      default:
        break
    }
  } catch (error) {
    console.error('[stripe webhook]', event.type, error)
    return NextResponse.json({ error: 'Failed to process the event.' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
