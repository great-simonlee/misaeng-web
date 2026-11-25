// node --test scripts/ellieo-stripe-webhook.test.mjs — Ellieo credits webhook pieces (signature + event reading).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { readCreditEvent, signStripePayload, verifyStripeSignature } from '../src/lib/ellieo/stripeWebhook.ts'

const secret = 'whsec_test_fixture'
const paid = {
  id: 'evt_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      payment_status: 'paid',
      payment_intent: 'pi_123',
      currency: 'usd',
      amount_subtotal: 3999,
      total_details: { amount_tax: 0 },
      customer_details: { email: 'agent@example.com', name: 'Minh Tran' },
      metadata: { app: 'ellieo_credits', user_uid: 'u1', pack_id: 'pack46', credits: '46', pack_cents: '3999', tax_cents: '0' },
    },
  },
}

test('valid signature passes, tampered body or wrong secret fails', () => {
  const raw = JSON.stringify(paid)
  const header = signStripePayload(raw, secret)
  assert.equal(verifyStripeSignature(raw, header, secret), true)
  assert.equal(verifyStripeSignature(raw + ' ', header, secret), false)
  assert.equal(verifyStripeSignature(raw, header, 'whsec_other'), false)
  assert.equal(verifyStripeSignature(raw, null, secret), false)
})

test('old timestamps are refused (replay)', () => {
  const raw = JSON.stringify(paid)
  const old = Math.floor(Date.now() / 1000) - 3600
  assert.equal(verifyStripeSignature(raw, signStripePayload(raw, secret, old), secret), false)
})

test('a paid Ellieo checkout becomes a credit purchase', () => {
  const event = readCreditEvent(paid)
  assert.equal(event.kind, 'paid')
  if (event.kind !== 'paid') return
  assert.equal(event.uid, 'u1')
  assert.equal(event.packId, 'pack46')
  assert.equal(event.credits, 46)
  assert.equal(event.amountCents, 3999)
  assert.equal(event.sessionId, 'cs_test_123')
  assert.equal(event.paymentIntent, 'pi_123')
})

test('other apps on the same account, unpaid sessions and bad metadata are ignored', () => {
  const misaeng = structuredClone(paid)
  misaeng.data.object.metadata.app = 'misaeng_premium'
  assert.equal(readCreditEvent(misaeng).kind, 'ignore')
  const unpaid = structuredClone(paid)
  unpaid.data.object.payment_status = 'unpaid'
  assert.equal(readCreditEvent(unpaid).kind, 'ignore')
  const bad = structuredClone(paid)
  bad.data.object.metadata.credits = 'x'
  assert.equal(readCreditEvent(bad).kind, 'ignore')
})

test('full refunds and disputes reverse; partial refunds are flagged', () => {
  const full = readCreditEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_123', refunded: true } } })
  assert.deepEqual(full, { kind: 'refunded', paymentIntent: 'pi_123', full: true })
  const partial = readCreditEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_123', refunded: false } } })
  assert.equal(partial.kind === 'refunded' && partial.full, false)
  assert.deepEqual(readCreditEvent({ type: 'charge.dispute.created', data: { object: { payment_intent: 'pi_9' } } }), {
    kind: 'disputed',
    paymentIntent: 'pi_9',
  })
  assert.equal(readCreditEvent({ type: 'invoice.paid', data: { object: {} } }).kind, 'ignore')
})
