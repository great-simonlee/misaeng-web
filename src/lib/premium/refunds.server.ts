import type Stripe from 'stripe'

import { invalidatePremium } from './access.server'
import { rest, type PremiumEntitlement } from './entitlements.server'
import { getStripe, syncSubscription } from './stripe.server'

/**
 * Web (Stripe) refunds from the ERP. Policy (owner, 11-22): always the FULL amount of one charge — never partial or
 * prorated — and Premium ends immediately (the subscription is canceled now, not at period end).
 * - 'policy': within 7 days of the first paid charge (any plan, once per account), or within 7 days of an annual
 *   renewal charge.
 * - 'billing_error' / 'service_issue': any time, with a note (double charge, payment error, long outage).
 * App Store / Play purchases are refunded by Apple / Google (their notifications end Premium).
 */

export type RefundReason = 'policy' | 'billing_error' | 'service_issue'
export const REFUND_REASONS: RefundReason[] = ['policy', 'billing_error', 'service_issue']
const POLICY_DAYS = 7

export class RefundError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}

export type RefundQuote = {
  entitlementId: string
  userUid: string
  email: string | null
  plan: string
  subscriptionId: string
  invoiceId: string | null
  chargeId: string | null
  amount: number
  currency: string | null
  paidAt: string | null
  /** First paid charge on this Stripe customer (after the free trial). */
  firstCharge: boolean
  annualRenewal: boolean
  daysSincePaid: number | null
  alreadyRefunded: boolean
  policyRefundUsed: boolean
  policyEligible: boolean
  /** Why a policy refund is not possible (English, for the ERP). */
  policyBlocker: string | null
}

async function entitlement(id: string): Promise<PremiumEntitlement> {
  const res = await rest(`premium_entitlements?select=*&id=eq.${encodeURIComponent(id)}&limit=1`)
  if (!res.ok) throw new RefundError('DB_ERROR', `Loading the subscription failed (HTTP ${res.status}).`, 500)
  const row = ((await res.json()) as PremiumEntitlement[])[0]
  if (!row) throw new RefundError('NOT_FOUND', 'Subscription not found.', 404)
  return row
}

async function policyRefundUsed(uid: string) {
  const res = await rest(`premium_refunds?select=id&user_uid=eq.${encodeURIComponent(uid)}&reason=eq.policy&limit=1`)
  if (!res.ok) {
    throw new RefundError('NOT_CONFIGURED', 'premium_refunds is not set up (run supabase/premium_codes.sql).', 503)
  }
  return ((await res.json()) as unknown[]).length > 0
}

function chargeIdOf(invoice: Stripe.Invoice): string | null {
  const charge = (invoice as Stripe.Invoice & { charge?: string | Stripe.Charge | null }).charge
  return typeof charge === 'string' ? charge : charge?.id ?? null
}

export async function getRefundQuote(entitlementId: string): Promise<RefundQuote> {
  const stripe = getStripe()
  if (!stripe) throw new RefundError('NOT_CONFIGURED', 'Stripe is not configured.', 503)
  const row = await entitlement(entitlementId)
  if (row.source !== 'stripe') {
    throw new RefundError(
      'NOT_STRIPE',
      row.source === 'apple'
        ? 'App Store purchases are refunded by Apple (reportaproblem.apple.com).'
        : row.source === 'google'
          ? 'Google Play purchases are refunded in the Play Console.'
          : 'Only web (Stripe) payments can be refunded here.',
      409,
    )
  }
  if (!row.customer_id) throw new RefundError('NO_CUSTOMER', 'This subscription has no Stripe customer.', 409)

  const invoices = await stripe.invoices.list({ customer: row.customer_id, status: 'paid', limit: 100 })
  const paid = invoices.data
    .filter((inv) => inv.amount_paid > 0)
    .sort((a, b) => (b.status_transitions?.paid_at ?? b.created) - (a.status_transitions?.paid_at ?? a.created))
  const latest =
    paid.find((inv) => {
      const sub = (inv as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
      return (typeof sub === 'string' ? sub : sub?.id) === row.external_id
    }) ?? null
  const chargeId = latest ? chargeIdOf(latest) : null
  const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null
  const paidAtSec = latest ? (latest.status_transitions?.paid_at ?? latest.created) : null
  const days = paidAtSec ? (Date.now() / 1000 - paidAtSec) / 86_400 : null
  const firstCharge = Boolean(latest && paid.length === 1)
  const annualRenewal = Boolean(latest && row.plan === 'annual' && !firstCharge && latest.billing_reason === 'subscription_cycle')
  const alreadyRefunded = Boolean(charge && charge.amount_refunded > 0)
  const used = await policyRefundUsed(row.user_uid)

  let blocker: string | null = null
  if (!latest || !chargeId) blocker = 'No paid charge yet (still in the free trial, or nothing was charged).'
  else if (alreadyRefunded) blocker = 'This charge was already refunded.'
  else if (days !== null && days > POLICY_DAYS) blocker = `Paid ${Math.floor(days)} days ago — refunds are only within ${POLICY_DAYS} days.`
  else if (!firstCharge && !annualRenewal) blocker = 'Only the first charge or an annual renewal can be refunded.'
  else if (firstCharge && used) blocker = 'This member already used their one refund.'

  return {
    entitlementId: row.id,
    userUid: row.user_uid,
    email: row.email,
    plan: row.plan,
    subscriptionId: row.external_id,
    invoiceId: latest?.id ?? null,
    chargeId,
    amount: latest?.amount_paid ?? 0,
    currency: latest?.currency ?? null,
    paidAt: paidAtSec ? new Date(paidAtSec * 1000).toISOString() : null,
    firstCharge,
    annualRenewal,
    daysSincePaid: days === null ? null : Math.round(days * 10) / 10,
    alreadyRefunded,
    policyRefundUsed: used,
    policyEligible: blocker === null,
    policyBlocker: blocker,
  }
}

/** Cancels a Stripe subscription right away and mirrors it (Premium off). Safe if already canceled. */
async function endSubscriptionNow(stripe: Stripe, subscriptionId: string) {
  let sub = await stripe.subscriptions.retrieve(subscriptionId)
  if (sub.status !== 'canceled') sub = await stripe.subscriptions.cancel(subscriptionId, { prorate: false })
  await syncSubscription(sub)
}

export async function refundSubscription(input: { entitlementId: string; reason: unknown; note?: unknown; actor: string }) {
  const stripe = getStripe()
  if (!stripe) throw new RefundError('NOT_CONFIGURED', 'Stripe is not configured.', 503)
  const reason = REFUND_REASONS.includes(input.reason as RefundReason) ? (input.reason as RefundReason) : null
  if (!reason) throw new RefundError('INVALID', 'Choose a refund reason.')
  const note = String(input.note || '').trim().slice(0, 500)
  if (reason !== 'policy' && !note) throw new RefundError('INVALID', 'Add a note for an exception refund.')

  const quote = await getRefundQuote(input.entitlementId)
  if (!quote.chargeId || quote.amount <= 0) throw new RefundError('NO_CHARGE', 'There is no paid charge to refund.', 409)
  if (quote.alreadyRefunded) throw new RefundError('ALREADY_REFUNDED', 'This charge was already refunded.', 409)
  if (reason === 'policy' && !quote.policyEligible) {
    throw new RefundError('NOT_ELIGIBLE', quote.policyBlocker || 'Not eligible for a refund.', 409)
  }

  // No `amount`: Stripe refunds the whole charge. Partial refunds are not offered.
  const refund = await stripe.refunds.create(
    {
      charge: quote.chargeId,
      reason: reason === 'billing_error' ? 'duplicate' : 'requested_by_customer',
      metadata: { user_uid: quote.userUid, reason, actor: input.actor },
    },
    { idempotencyKey: `premium-refund-${quote.chargeId}` },
  )
  const saved = await rest('premium_refunds?on_conflict=charge_id', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify({
      user_uid: quote.userUid,
      entitlement_id: quote.entitlementId,
      subscription_id: quote.subscriptionId,
      invoice_id: quote.invoiceId,
      charge_id: quote.chargeId,
      refund_id: refund.id,
      amount: quote.amount,
      currency: quote.currency,
      reason,
      note: note || null,
      created_by: input.actor,
    }),
  })
  if (!saved.ok) console.error('[premium refund] saving the record failed', saved.status, quote.chargeId)
  await endSubscriptionNow(stripe, quote.subscriptionId)
  invalidatePremium(quote.userUid)
  return { refundId: refund.id, amount: quote.amount, currency: quote.currency, status: refund.status }
}

/**
 * charge.refunded webhook: a FULL refund of a subscription charge (from the ERP or the Stripe Dashboard) ends
 * Premium now. Partial refunds made by hand in the Dashboard are logged and leave Premium as it is.
 */
export async function handleChargeRefunded(charge: Stripe.Charge) {
  const stripe = getStripe()
  if (!stripe) return
  if (!charge.refunded) {
    console.warn('[premium refund] partial refund in Stripe — Premium unchanged', charge.id)
    return
  }
  // Webhook payloads use the account's API version (newer, no charge.invoice); re-read with the SDK's pinned version.
  const full = await stripe.charges.retrieve(charge.id)
  const invoiceRef = (full as Stripe.Charge & { invoice?: string | Stripe.Invoice | null }).invoice
  const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef?.id
  if (!invoiceId) return
  const invoice = await stripe.invoices.retrieve(invoiceId)
  const subRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  if (subId) await endSubscriptionNow(stripe, subId)
}

/** ERP list: newest Premium rows (any source), optional source / email filter. */
export async function listPremiumMembers(filter: { source?: string | null; q?: string | null }) {
  const params = [
    'select=id,user_uid,email,source,plan,status,current_period_end,cancel_at_period_end,external_id,customer_id,product_id,environment,created_at,updated_at',
    'order=updated_at.desc',
    'limit=300',
  ]
  if (filter.source && ['stripe', 'apple', 'google', 'code', 'gift'].includes(filter.source)) {
    params.push(`source=eq.${filter.source}`)
  }
  const q = String(filter.q || '').trim().replace(/[,()*]/g, '')
  if (q) params.push(`or=(email.ilike.*${encodeURIComponent(q)}*,user_uid.eq.${encodeURIComponent(q)})`)
  const res = await rest(`premium_entitlements?${params.join('&')}`)
  if (!res.ok) throw new RefundError('DB_ERROR', `Loading Premium members failed (HTTP ${res.status}).`, 500)
  const rows = (await res.json()) as PremiumEntitlement[]
  const refunds = rows.length
    ? await rest(
        `premium_refunds?select=entitlement_id,amount,currency,reason,created_at,created_by&entitlement_id=in.(${rows.map((r) => r.id).join(',')})`,
      )
        .then((r) => (r.ok ? (r.json() as Promise<{ entitlement_id: string }[]>) : []))
        .catch(() => [])
    : []
  return rows.map((row) => ({
    ...row,
    refunds: refunds.filter((r) => r.entitlement_id === row.id),
  }))
}
