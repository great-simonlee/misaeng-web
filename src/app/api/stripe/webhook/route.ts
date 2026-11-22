import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { sendRenewalNotice, sendTrialEndingNotice } from '@lib/premium/notices.server'
import { endDuplicateSubscription, handleChargeDisputed, handleChargeRefunded } from '@lib/premium/refunds.server'
import { getStripe, syncSubscription } from '@lib/premium/stripe.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/webhook — Stripe events (signature checked with STRIPE_WEBHOOK_SECRET). Premium is granted only
 * here, and every subscription change is RE-READ from Stripe (never the event snapshot: Stripe retries old events for
 * days and delivers them out of order, so a snapshot could turn a refunded subscription back on).
 * Events: checkout.session.completed, customer.subscription.created / updated / deleted, invoice.paid,
 * invoice.payment_failed; charge.refunded (a full refund ends Premium now); charge.dispute.created (a chargeback ends
 * it too); reminders: customer.subscription.trial_will_end (3 days before the trial ends) and invoice.upcoming (annual
 * renewal, 7 days before — set in Stripe Dashboard → Billing → Subscriptions).
 * Only Misaeng Premium prices are acted on (the account also carries legacy Ellieo payments).
 */

// Reminder events already handled (one server process): a redelivered event never sends the email twice.
const handledNotices = new Set<string>()

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
    if (!id) return null
    const sub = await stripe!.subscriptions.retrieve(id)
    await syncSubscription(sub, uid, email)
    return sub
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        const uid = session.client_reference_id || session.metadata?.user_uid
        const sub = await syncById(subId, uid, session.customer_details?.email)
        // Two tabs / a double payment: keep the older subscription, cancel + refund this new one.
        if (sub && uid) await endDuplicateSubscription(sub, uid)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncById((event.data.object as Stripe.Subscription).id)
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
      case 'charge.dispute.created':
        await handleChargeDisputed(event.data.object as Stripe.Dispute)
        break
      case 'customer.subscription.trial_will_end':
      case 'invoice.upcoming': {
        if (handledNotices.has(event.id)) break
        if (event.type === 'invoice.upcoming') await sendRenewalNotice(event.data.object as Stripe.Invoice)
        else await sendTrialEndingNotice((event.data.object as Stripe.Subscription).id)
        handledNotices.add(event.id)
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error('[stripe webhook]', event.type, error)
    return NextResponse.json({ error: 'Failed to process the event.' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
