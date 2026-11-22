import type Stripe from 'stripe'

import { invalidatePremium, isActiveEntitlement } from './access.server'
import { listEntitlements, rest, type PremiumEntitlement } from './entitlements.server'
import { getStripe, isPremiumPrice, syncSubscription } from './stripe.server'

/**
 * Web (Stripe) refunds from the ERP. Policy (owner, 11-22): always FULL charges — never partial or prorated — and
 * Premium ends immediately (the subscription is canceled now, not at period end).
 * - 'policy': within 7 days of the first paid charge (any plan, once per account), or within 7 days of an annual
 *   renewal charge. Every paid charge of the subscription in that window is refunded (e.g. a plan switch right after
 *   the first charge), so the member never keeps paying for something that just ended.
 * - 'billing_error' / 'service_issue': any time, with a note — the latest charge, in full.
 * App Store / Play purchases are refunded by Apple / Google (their notifications end Premium).
 */

export type RefundReason = 'policy' | 'billing_error' | 'service_issue'
export const REFUND_REASONS: RefundReason[] = ['policy', 'billing_error', 'service_issue']
const POLICY_DAYS = 7
const DAY = 86_400

export class RefundError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}

type PaidCharge = { invoiceId: string; chargeId: string; amount: number; currency: string; paidAt: number; refunded: boolean }

export type RefundQuote = {
  entitlementId: string
  userUid: string
  email: string | null
  plan: string
  subscriptionId: string
  /** Latest charge (exceptions refund this one). */
  invoiceId: string | null
  chargeId: string | null
  amount: number
  currency: string | null
  paidAt: string | null
  /** What a 7-day policy refund would return: every unrefunded charge in the window. */
  policyCharges: { chargeId: string; amount: number; paidAt: string }[]
  policyAmount: number
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

const subscriptionOf = (invoice: Stripe.Invoice) => {
  const ref = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
  return typeof ref === 'string' ? ref : ref?.id ?? null
}
const chargeOf = (invoice: Stripe.Invoice) => {
  const ref = (invoice as Stripe.Invoice & { charge?: string | Stripe.Charge | null }).charge
  return typeof ref === 'string' ? ref : ref?.id ?? null
}
const paidAtOf = (invoice: Stripe.Invoice) => invoice.status_transitions?.paid_at ?? invoice.created

/**
 * Every paid, non-zero Misaeng Premium invoice of a customer, oldest first (all pages; SDK pinned to
 * 2025-02-24.acacia). Invoices for anything else on the shared Stripe account (legacy Ellieo) never count.
 */
async function paidInvoices(stripe: Stripe, customer: string) {
  const out: Stripe.Invoice[] = []
  for await (const invoice of stripe.invoices.list({ customer, status: 'paid', limit: 100 })) {
    if (invoice.amount_paid <= 0) continue
    const prices = (invoice.lines?.data ?? []).map((line) => (line as Stripe.InvoiceLineItem & { price?: Stripe.Price | null }).price)
    let premium = false
    for (const price of prices) if (!premium && (await isPremiumPrice(price))) premium = true
    if (premium) out.push(invoice)
    if (out.length >= 1000) break
  }
  return out.sort((a, b) => paidAtOf(a) - paidAtOf(b))
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

  const all = await paidInvoices(stripe, row.customer_id)
  const mine = all.filter((invoice) => subscriptionOf(invoice) === row.external_id)
  const charges: PaidCharge[] = []
  for (const invoice of mine) {
    const chargeId = chargeOf(invoice)
    if (!chargeId) continue
    const charge = await stripe.charges.retrieve(chargeId)
    charges.push({
      invoiceId: invoice.id,
      chargeId,
      amount: charge.amount - charge.amount_refunded,
      currency: invoice.currency,
      paidAt: paidAtOf(invoice),
      refunded: charge.refunded || charge.amount_refunded >= charge.amount,
    })
  }
  const latest = charges.at(-1) ?? null
  const nowSec = Date.now() / 1000

  // Policy window: the customer's first paid charge (if it is this subscription's), else this subscription's latest
  // annual renewal.
  const firstInvoice = all[0] ?? null
  const firstStart = firstInvoice && subscriptionOf(firstInvoice) === row.external_id ? paidAtOf(firstInvoice) : null
  // A renewal = a later cycle charge of an annual subscription (the first charge after the trial is also a "cycle"
  // invoice, so it never counts as a renewal).
  const renewal = [...mine].reverse().find((invoice) => invoice.billing_reason === 'subscription_cycle' && invoice.id !== firstInvoice?.id)
  const renewalStart = row.plan === 'annual' && renewal ? paidAtOf(renewal) : null
  const firstStillOpen = firstStart !== null && nowSec - firstStart <= POLICY_DAYS * DAY
  const windowStart = firstStillOpen ? firstStart : renewalStart ?? firstStart
  const firstCharge = windowStart !== null && windowStart === firstStart
  const annualRenewal = windowStart !== null && !firstCharge && windowStart === renewalStart
  const inWindow = windowStart !== null ? charges.filter((c) => c.paidAt >= windowStart && !c.refunded) : []
  const days = windowStart !== null ? (nowSec - windowStart) / DAY : latest ? (nowSec - latest.paidAt) / DAY : null
  const alreadyRefunded = charges.length > 0 && charges.every((c) => c.refunded)
  const used = await policyRefundUsed(row.user_uid)

  let blocker: string | null = null
  if (!charges.length) blocker = 'No paid charge yet (still in the free trial, or nothing was charged).'
  else if (alreadyRefunded) blocker = 'This subscription was already refunded.'
  else if (windowStart === null) blocker = 'Only the first charge or an annual renewal can be refunded.'
  else if (days !== null && days > POLICY_DAYS) blocker = `Paid ${Math.floor(days)} days ago — refunds are only within ${POLICY_DAYS} days.`
  else if (firstCharge && used) blocker = 'This member already used their one refund.'
  else if (!inWindow.length) blocker = 'Nothing left to refund in the 7-day window.'

  return {
    entitlementId: row.id,
    userUid: row.user_uid,
    email: row.email,
    plan: row.plan,
    subscriptionId: row.external_id,
    invoiceId: latest?.invoiceId ?? null,
    chargeId: latest && !latest.refunded ? latest.chargeId : null,
    amount: latest && !latest.refunded ? latest.amount : 0,
    currency: latest?.currency ?? null,
    paidAt: latest ? new Date(latest.paidAt * 1000).toISOString() : null,
    policyCharges: inWindow.map((c) => ({ chargeId: c.chargeId, amount: c.amount, paidAt: new Date(c.paidAt * 1000).toISOString() })),
    policyAmount: inWindow.reduce((sum, c) => sum + c.amount, 0),
    firstCharge,
    annualRenewal,
    daysSincePaid: days === null ? null : Math.round(days * 10) / 10,
    alreadyRefunded,
    policyRefundUsed: used,
    policyEligible: blocker === null,
    policyBlocker: blocker,
  }
}

/** Cancels a Premium subscription right away and mirrors it (Premium off). Safe to repeat. */
async function endSubscriptionNow(stripe: Stripe, subscriptionId: string) {
  let sub = await stripe.subscriptions.retrieve(subscriptionId)
  // Legacy Ellieo subscriptions on the same Stripe account are not ours to cancel.
  if (!(await isPremiumPrice(sub.items?.data?.[0]?.price))) return
  if (sub.status !== 'canceled') sub = await stripe.subscriptions.cancel(subscriptionId, { prorate: false })
  await syncSubscription(sub)
}

async function recordRefund(input: {
  userUid: string
  entitlementId?: string | null
  subscriptionId: string | null
  invoiceId?: string | null
  chargeId: string
  refundId: string | null
  amount: number
  currency: string | null
  reason: RefundReason | 'stripe_dashboard'
  note?: string | null
  actor: string
}) {
  const res = await rest('premium_refunds?on_conflict=charge_id', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify({
      user_uid: input.userUid,
      entitlement_id: input.entitlementId ?? null,
      subscription_id: input.subscriptionId,
      invoice_id: input.invoiceId ?? null,
      charge_id: input.chargeId,
      refund_id: input.refundId,
      amount: input.amount,
      currency: input.currency,
      reason: input.reason,
      note: input.note || null,
      created_by: input.actor,
    }),
  }).catch(() => null)
  if (!res?.ok) console.error('[premium refund] saving the record failed', res?.status, input.chargeId)
}

export async function refundSubscription(input: { entitlementId: string; reason: unknown; note?: unknown; actor: string }) {
  const stripe = getStripe()
  if (!stripe) throw new RefundError('NOT_CONFIGURED', 'Stripe is not configured.', 503)
  const reason = REFUND_REASONS.includes(input.reason as RefundReason) ? (input.reason as RefundReason) : null
  if (!reason) throw new RefundError('INVALID', 'Choose a refund reason.')
  const note = String(input.note || '').trim().slice(0, 500)
  if (reason !== 'policy' && !note) throw new RefundError('INVALID', 'Add a note for an exception refund.')

  const quote = await getRefundQuote(input.entitlementId)
  if (quote.alreadyRefunded) {
    // A retry after a timeout: the money already went back — make sure Premium is off too.
    await endSubscriptionNow(stripe, quote.subscriptionId).catch((error) => console.error('[premium refund] end', error))
    invalidatePremium(quote.userUid)
    throw new RefundError('ALREADY_REFUNDED', 'This subscription was already refunded.', 409)
  }
  if (reason === 'policy' && !quote.policyEligible) {
    throw new RefundError('NOT_ELIGIBLE', quote.policyBlocker || 'Not eligible for a refund.', 409)
  }
  const targets =
    reason === 'policy'
      ? quote.policyCharges.map((c) => ({ chargeId: c.chargeId, amount: c.amount }))
      : quote.chargeId
        ? [{ chargeId: quote.chargeId, amount: quote.amount }]
        : []
  if (!targets.length) throw new RefundError('NO_CHARGE', 'There is no paid charge to refund.', 409)

  // No `amount`: Stripe refunds the whole (remaining) charge. Partial refunds are not offered.
  const refundIds: string[] = []
  for (const target of targets) {
    const refund = await stripe.refunds.create(
      {
        charge: target.chargeId,
        reason: reason === 'billing_error' ? 'duplicate' : 'requested_by_customer',
        metadata: { user_uid: quote.userUid, reason, actor: input.actor },
      },
      { idempotencyKey: `premium-refund-${target.chargeId}` },
    )
    refundIds.push(refund.id)
    await recordRefund({
      userUid: quote.userUid,
      entitlementId: quote.entitlementId,
      subscriptionId: quote.subscriptionId,
      chargeId: target.chargeId,
      refundId: refund.id,
      amount: target.amount,
      currency: quote.currency,
      reason,
      note,
      actor: input.actor,
    })
  }

  // The money is back at this point: a failure below must not be reported as "refund failed".
  let warning: string | null = null
  try {
    await endSubscriptionNow(stripe, quote.subscriptionId)
  } catch (error) {
    console.error('[premium refund] canceling after the refund failed', error)
    warning = 'Refunded, but canceling the subscription failed — the charge.refunded webhook will retry; check it in Stripe.'
  }
  invalidatePremium(quote.userUid)
  return {
    refundId: refundIds[0],
    refundIds,
    amount: targets.reduce((sum, t) => sum + t.amount, 0),
    currency: quote.currency,
    status: 'succeeded',
    warning,
  }
}

/** Subscription id of a charge (re-read with the SDK's pinned API version: webhook payloads lack charge.invoice). */
async function subscriptionOfCharge(stripe: Stripe, chargeId: string) {
  const charge = await stripe.charges.retrieve(chargeId)
  const invoiceRef = (charge as Stripe.Charge & { invoice?: string | Stripe.Invoice | null }).invoice
  const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef?.id
  if (!invoiceId) return { charge, subId: null, invoiceId: null }
  const invoice = await stripe.invoices.retrieve(invoiceId)
  return { charge, subId: subscriptionOf(invoice), invoiceId }
}

/**
 * charge.refunded webhook: a FULL refund of a subscription charge (from the ERP or the Stripe Dashboard) ends
 * Premium now and is recorded. Partial refunds made by hand in the Dashboard are logged and leave Premium as it is.
 */
export async function handleChargeRefunded(event: Stripe.Charge) {
  const stripe = getStripe()
  if (!stripe) return
  const { charge, subId, invoiceId } = await subscriptionOfCharge(stripe, event.id)
  if (!subId) return
  if (!charge.refunded) {
    console.warn('[premium refund] partial refund in Stripe — Premium unchanged', charge.id)
    return
  }
  const sub = await stripe.subscriptions.retrieve(subId)
  if (!(await isPremiumPrice(sub.items?.data?.[0]?.price))) return
  const uid = sub.metadata?.user_uid
  if (uid) {
    await recordRefund({
      userUid: uid,
      subscriptionId: subId,
      invoiceId,
      chargeId: charge.id,
      refundId: charge.refunds?.data?.[0]?.id ?? null,
      amount: charge.amount_refunded,
      currency: charge.currency,
      reason: 'stripe_dashboard',
      actor: 'stripe',
    })
  }
  await endSubscriptionNow(stripe, subId)
}

/** charge.dispute.created (chargeback): the bank takes the money back, so Premium ends now as well. */
export async function handleChargeDisputed(dispute: Stripe.Dispute) {
  const stripe = getStripe()
  if (!stripe) return
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  if (!chargeId) return
  const { subId } = await subscriptionOfCharge(stripe, chargeId)
  if (subId) await endSubscriptionNow(stripe, subId)
}

/**
 * Backstop for two checkouts finished side by side (two tabs, a double click): if the member already has another live
 * Premium subscription, this NEW one is canceled at once and anything it charged is refunded in full.
 */
export async function endDuplicateSubscription(sub: Stripe.Subscription, uid: string) {
  const stripe = getStripe()
  if (!stripe || !['trialing', 'active', 'past_due'].includes(sub.status)) return
  const rows = await listEntitlements(uid)
  const other = rows.find((row) => row.external_id !== sub.id && isActiveEntitlement(row))
  if (!other) return
  console.warn('[premium] duplicate subscription — canceling the new one', sub.id, 'kept', other.external_id)
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  for (const invoice of await paidInvoices(stripe, customer)) {
    const chargeId = chargeOf(invoice)
    if (subscriptionOf(invoice) !== sub.id || !chargeId) continue
    await stripe.refunds
      .create(
        { charge: chargeId, reason: 'duplicate', metadata: { user_uid: uid, reason: 'duplicate_checkout' } },
        { idempotencyKey: `premium-refund-${chargeId}` },
      )
      .catch((error) => console.error('[premium] refunding a duplicate failed', chargeId, error))
  }
  await endSubscriptionNow(stripe, sub.id)
  invalidatePremium(uid)
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
  // Only characters an email / uid can have; PostgREST filter syntax and LIKE wildcards are dropped.
  const q = String(filter.q || '').trim().replace(/[^A-Za-z0-9@.+\-]/g, '').slice(0, 120)
  if (q) params.push(`or=(email.ilike.*${encodeURIComponent(q)}*,user_uid.eq.${encodeURIComponent(q)})`)
  const res = await rest(`premium_entitlements?${params.join('&')}`)
  if (!res.ok) throw new RefundError('DB_ERROR', `Loading Premium members failed (HTTP ${res.status}).`, 500)
  const rows = (await res.json()) as PremiumEntitlement[]
  const subIds = rows.filter((r) => r.source === 'stripe').map((r) => r.external_id)
  const filters = [`entitlement_id.in.(${rows.map((r) => r.id).join(',')})`]
  if (subIds.length) filters.push(`subscription_id.in.(${subIds.map(encodeURIComponent).join(',')})`)
  const refunds = rows.length
    ? await rest(
        `premium_refunds?select=entitlement_id,subscription_id,amount,currency,reason,created_at,created_by&or=(${filters.join(',')})`,
      )
        .then((r) => (r.ok ? (r.json() as Promise<{ entitlement_id: string | null; subscription_id: string | null }[]>) : []))
        .catch(() => [])
    : []
  return rows.map((row) => ({
    ...row,
    refunds: refunds.filter((r) => r.entitlement_id === row.id || (row.source === 'stripe' && r.subscription_id === row.external_id)),
  }))
}
