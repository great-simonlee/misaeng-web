import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Stripe webhook pieces with no other imports (so they can be tested on their own: scripts/ellieo-stripe-webhook.test.ts).
 * Ellieo talks to Stripe over its REST API (no SDK dependency); this checks the `Stripe-Signature` header the way the
 * SDK does (HMAC-SHA256 of "<t>.<raw body>" with the endpoint secret, 5-minute tolerance) and reads the events we use.
 */

export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()) {
  if (!header || !secret) return false
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const i = part.indexOf('=')
      return [part.slice(0, i).trim(), part.slice(i + 1).trim()]
    }),
  ) as Record<string, string>
  const t = Number(parts.t)
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > toleranceSec) return false
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  const given = header
    .split(',')
    .filter((part) => part.trim().startsWith('v1='))
    .map((part) => part.trim().slice(3))
  return given.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
}

export function signStripePayload(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')}`
}

export type CreditEvent =
  | {
      kind: 'paid'
      sessionId: string
      paymentIntent: string | null
      uid: string
      packId: string
      credits: number
      amountCents: number
      taxCents: number
      currency: string
      email: string | null
      name: string | null
    }
  | { kind: 'refunded'; paymentIntent: string; full: boolean }
  | { kind: 'disputed'; paymentIntent: string }
  | { kind: 'ignore'; reason: string }

type Obj = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

/** Reads one event; only Ellieo credit purchases (metadata.app = 'ellieo_credits') count. */
export function readCreditEvent(event: { type?: string; data?: { object?: Obj } }): CreditEvent {
  const object = (event.data?.object ?? {}) as Obj
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const meta = (object.metadata ?? {}) as Obj
    if (meta.app !== 'ellieo_credits') return { kind: 'ignore', reason: 'not an Ellieo credit purchase' }
    if (object.payment_status !== 'paid') return { kind: 'ignore', reason: 'not paid yet' }
    const credits = Number(meta.credits)
    const uid = str(meta.user_uid)
    const packId = str(meta.pack_id)
    if (!uid || !packId || !Number.isInteger(credits) || credits <= 0) return { kind: 'ignore', reason: 'missing metadata' }
    const details = (object.customer_details ?? {}) as Obj
    const total = (object.total_details ?? {}) as Obj
    return {
      kind: 'paid',
      sessionId: String(object.id),
      paymentIntent: str(object.payment_intent),
      uid,
      packId,
      credits,
      amountCents: Number(meta.pack_cents ?? object.amount_subtotal ?? 0) || 0,
      taxCents: Number(meta.tax_cents ?? total.amount_tax ?? 0) || 0,
      currency: str(object.currency) ?? 'usd',
      email: str(details.email),
      name: str(details.name),
    }
  }
  if (event.type === 'charge.refunded') {
    const intent = str(object.payment_intent)
    if (!intent) return { kind: 'ignore', reason: 'no payment intent' }
    return { kind: 'refunded', paymentIntent: intent, full: object.refunded === true }
  }
  if (event.type === 'charge.dispute.created') {
    const intent = str(object.payment_intent)
    if (!intent) return { kind: 'ignore', reason: 'no payment intent' }
    return { kind: 'disputed', paymentIntent: intent }
  }
  return { kind: 'ignore', reason: `event ${event.type}` }
}
