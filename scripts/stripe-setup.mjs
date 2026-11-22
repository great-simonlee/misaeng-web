#!/usr/bin/env node
/**
 * Creates (or finds) the Stripe product and prices for Misaeng Premium. Idempotent; works with a test or live key.
 *   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-setup.mjs
 * Product "Misaeng Premium" (statement descriptor MISAENG PREMIUM) + recurring USD prices with lookup keys:
 *   premium_monthly $29.99 / 1 month · premium_season $59.99 / 3 months · premium_annual $179.99 / 1 year
 * Prints ids only. The app reads prices by lookup key (or STRIPE_PRICE_* env if set).
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY?.trim()
if (!key) {
  console.error('Set STRIPE_SECRET_KEY')
  process.exit(1)
}
const stripe = new Stripe(key)
const PRICES = [
  { lookup: 'premium_monthly', amount: 2999, interval: 'month', count: 1, nickname: 'Monthly' },
  { lookup: 'premium_season', amount: 5999, interval: 'month', count: 3, nickname: 'Season pass (3 months)' },
  { lookup: 'premium_annual', amount: 17999, interval: 'year', count: 1, nickname: 'Annual' },
]

// Find the product through an existing price, else by metadata (products.search lags by a minute, so list instead).
const existing = await stripe.prices.list({ lookup_keys: PRICES.map((p) => p.lookup), limit: 10, expand: ['data.product'] })
let product = existing.data.map((p) => p.product).find((p) => p && typeof p === 'object' && !p.deleted)
if (!product) {
  for await (const p of stripe.products.list({ active: true, limit: 100 })) {
    if (p.metadata?.misaeng_product === 'premium') {
      product = p
      break
    }
  }
}
if (!product) {
  product = await stripe.products.create({
    name: 'Misaeng Premium',
    description: 'Visa & sponsorship history and base salary by role on Misaeng.',
    statement_descriptor: 'MISAENG PREMIUM',
    metadata: { misaeng_product: 'premium' },
  })
}
console.log(`product ${product.id} (${key.startsWith('sk_live') ? 'live' : 'test'})`)

for (const p of PRICES) {
  const have = existing.data.find((x) => x.lookup_key === p.lookup && x.active)
  if (have && have.unit_amount === p.amount && have.recurring?.interval === p.interval && have.recurring?.interval_count === p.count) {
    console.log(`${p.lookup} ${have.id} (kept)`)
    continue
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: p.amount,
    recurring: { interval: p.interval, interval_count: p.count },
    nickname: p.nickname,
    lookup_key: p.lookup,
    transfer_lookup_key: true,
  })
  console.log(`${p.lookup} ${price.id} (new)`)
}

// Billing portal: configured once in the Stripe Dashboard (default configuration — cancel at period end, card,
// invoices; plan switching OFF so nothing is ever prorated). Not created here on purpose.

