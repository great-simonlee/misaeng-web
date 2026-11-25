import { createHmac, timingSafeEqual } from 'node:crypto'

import { getSupabaseServiceClient } from '@lib/supabase/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { activeLicense } from './agentLicense.server'
import { CreditsError, getListingPrices, premiumPrice } from './listingPlans.server'
import { readCreditEvent } from './stripeWebhook'

/**
 * Ellieo credit packs, Stripe Checkout, receipts and refunds (owner 11-25 final).
 *
 *   Config     ellieo_settings 'credits' (Super Admin, ERP): packs, salesTaxRate, topUpLinkIOS / topUpLinkAndroid,
 *              refundDays, rewardDays, seller (receipt). Defaults below until agent_listing_pay.sql is run.
 *   Stripe     the SAME Stripe account as Misaeng (Misaeng LLC, owner 11-25): STRIPE_SECRET_KEY, or
 *              ELLIEO_STRIPE_SECRET_KEY to override. Card statements read "… ELLIEO" (descriptor suffix). Without a key
 *              the credits page says "Payments coming soon" and the API answers PAYMENTS_OFF.
 *   Checkout   one-time Stripe Checkout per pack (price_data inline, so no Stripe products to set up). Every Ellieo
 *              object carries metadata app = 'ellieo_credits'; Misaeng's webhook only acts on Premium subscriptions,
 *              so the two never touch each other's payments.
 *   Webhook    /api/ellieo/stripe/webhook — its own endpoint in the same Stripe account, with its own signing secret
 *              (ELLIEO_STRIPE_WEBHOOK_SECRET): a paid session adds one paid lot (idempotent on the session id); a
 *              refund or dispute made in Stripe takes the lot back.
 *   Refunds    within refundDays (7) and only if none of that pack's credits was used, full only: the member asks from
 *              the receipt page → ERP approves → Stripe refund → the lot is taken back.
 *   App link   the app opens ellieo.com/credits with a short-lived signed token (?t=) so the member doesn't sign in
 *              again on the web; receipts use a signed link (?k=) so they can be opened and printed anywhere.
 */

export type CreditPack = { id: string; priceCents: number; credits: number }
export type CreditsConfig = {
  packs: CreditPack[]
  salesTaxRate: number
  topUpLinkIOS: boolean
  topUpLinkAndroid: boolean
  refundDays: number
  rewardDays: number
  seller: { name: string; address: string; email: string }
}

export const DEFAULT_CREDITS_CONFIG: CreditsConfig = {
  packs: [
    { id: 'pack10', priceCents: 999, credits: 10 },
    { id: 'pack22', priceCents: 1999, credits: 22 },
    { id: 'pack46', priceCents: 3999, credits: 46 },
    { id: 'pack96', priceCents: 7999, credits: 96 },
  ],
  salesTaxRate: 0,
  topUpLinkIOS: true,
  topUpLinkAndroid: true,
  refundDays: 7,
  rewardDays: 90,
  seller: {
    name: 'Misaeng LLC (Ellieo)',
    address: '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
    email: 'info@ellieo.com',
  },
}

function db() {
  return getSupabaseServiceClient()
}

let cached: { at: number; value: CreditsConfig } | null = null

function validConfig(v: unknown): v is CreditsConfig {
  const c = v as CreditsConfig | null
  if (!c || !Array.isArray(c.packs) || c.packs.length === 0 || c.packs.length > 8) return false
  const ids = new Set<string>()
  for (const pack of c.packs) {
    if (!/^[a-z0-9_-]{2,30}$/.test(pack.id) || ids.has(pack.id)) return false
    ids.add(pack.id)
    if (!Number.isInteger(pack.priceCents) || pack.priceCents < 50 || pack.priceCents > 100_000) return false
    if (!Number.isInteger(pack.credits) || pack.credits < 1 || pack.credits > 10_000) return false
  }
  return (
    typeof c.salesTaxRate === 'number' && c.salesTaxRate >= 0 && c.salesTaxRate < 0.25 &&
    typeof c.topUpLinkIOS === 'boolean' && typeof c.topUpLinkAndroid === 'boolean' &&
    Number.isInteger(c.refundDays) && c.refundDays >= 0 && c.refundDays <= 60 &&
    Number.isInteger(c.rewardDays) && c.rewardDays >= 1 && c.rewardDays <= 365 &&
    typeof c.seller?.name === 'string' && c.seller.name.length > 1 && typeof c.seller.address === 'string' &&
    typeof c.seller.email === 'string'
  )
}

export async function getCreditsConfig(): Promise<CreditsConfig> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value
  const { data } = await db().from('ellieo_settings').select('value').eq('key', 'credits').maybeSingle<{ value: CreditsConfig }>()
  const value = validConfig(data?.value) ? data!.value : DEFAULT_CREDITS_CONFIG
  cached = { at: Date.now(), value }
  return value
}

export async function saveCreditsConfig(value: unknown, by: string) {
  if (!validConfig(value)) {
    throw new CreditsError('Credit settings are not valid (pack ids, $0.50–$1,000 prices, whole credits, tax rate under 25%).', 'INVALID_PRICES')
  }
  const { error } = await db()
    .from('ellieo_settings')
    .upsert({ key: 'credits', value, updated_at: new Date().toISOString(), updated_by: by } as never, { onConflict: 'key' })
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  cached = null
  return getCreditsConfig()
}

// MARK: - Packs with "what you can do with it"

/** e.g. 46 credits → "1 Premium listing + a 7-day listing" (from the current prices). */
export async function packHints() {
  const [config, prices] = await Promise.all([getCreditsConfig(), getListingPrices()])
  const premium = premiumPrice(prices)
  const regular = Object.entries(prices.regular)
    .map(([days, price]) => ({ days: Number(days), price }))
    .filter((r) => r.price > 0)
    .sort((a, b) => b.price - a.price)
  return config.packs.map((pack) => {
    let left = pack.credits
    const premiums = premium > 0 ? Math.floor(left / premium) : 0
    left -= premiums * premium
    const listings: number[] = []
    for (const r of regular) {
      while (left >= r.price && listings.length < 3) {
        listings.push(r.days)
        left -= r.price
      }
    }
    const bonus = Math.max(0, pack.credits - Math.round(pack.priceCents / 100))
    return { ...pack, bonus, premiumListings: premiums, regularListings: listings }
  })
}

export function describeHint(h: { premiumListings: number; regularListings: number[] }) {
  const parts: string[] = []
  if (h.premiumListings > 0) parts.push(`${h.premiumListings} Premium listing${h.premiumListings === 1 ? '' : 's'}`)
  for (const days of h.regularListings) parts.push(`a ${days}-day listing`)
  return parts.join(' + ')
}

// MARK: - Signed links (app → web, receipts)

function linkSecret() {
  return (process.env.ELLIEO_CREDITS_LINK_SECRET || process.env.INTERNAL_PUSH_SECRET || '').trim()
}

function sign(value: string) {
  return createHmac('sha256', linkSecret()).update(value).digest('base64url')
}

function safeEqual(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/** 30-minute token so the app's member is signed in on the credits page. */
export function topUpToken(uid: string) {
  const payload = Buffer.from(JSON.stringify({ u: uid, e: Date.now() + 30 * 60_000 })).toString('base64url')
  return `${payload}.${sign(`topup.${payload}`)}`
}

export function readTopUpToken(token: string | null | undefined): string | null {
  if (!token || !linkSecret()) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig || !safeEqual(sig, sign(`topup.${payload}`))) return null
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; e: number }
    return e > Date.now() && typeof u === 'string' ? u : null
  } catch {
    return null
  }
}

export function receiptKey(purchaseId: string) {
  return sign(`receipt.${purchaseId}`).slice(0, 32)
}

export function checkReceiptKey(purchaseId: string, key: string | null | undefined) {
  return Boolean(key && linkSecret() && safeEqual(key, receiptKey(purchaseId)))
}

export function receiptPath(purchaseId: string) {
  return `/nyc/credits/receipts/${purchaseId}?k=${receiptKey(purchaseId)}`
}

// MARK: - Stripe (REST, no SDK)

/** Misaeng's Stripe account (Misaeng LLC) unless Ellieo is given its own key. */
export function stripeKey() {
  return process.env.ELLIEO_STRIPE_SECRET_KEY?.trim() || process.env.STRIPE_SECRET_KEY?.trim() || ''
}

export function paymentsEnabled() {
  return Boolean(stripeKey())
}

function form(params: Record<string, string | number | undefined | null>) {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') body.append(k, String(v))
  return body
}

async function stripe<T>(path: string, init: { method?: string; body?: URLSearchParams; idempotencyKey?: string } = {}): Promise<T> {
  const key = stripeKey()
  if (!key) throw new CreditsError('Payments are coming soon.', 'PAYMENTS_OFF', 503)
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
    },
    body: init.body,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!res.ok) throw new CreditsError(`Stripe: ${data.error?.message ?? res.status}`, 'STRIPE_ERROR', 502)
  return data
}

/** Stripe Checkout for one pack; returns the Stripe page URL. */
export async function createCheckout(input: { uid: string; packId: string; origin: string; locale: string }) {
  if (!paymentsEnabled()) throw new CreditsError('Payments are coming soon.', 'PAYMENTS_OFF', 503)
  const config = await getCreditsConfig()
  const pack = config.packs.find((p) => p.id === input.packId)
  if (!pack) throw new CreditsError('Choose a credit pack.', 'INVALID')
  const profile = await getSupabaseProfile(input.uid).catch(() => null)
  const license = await activeLicense(input.uid).catch(() => null)
  const name = [profile?.firstName, profile?.lastName].map((p) => p?.trim()).filter(Boolean).join(' ')
  const taxCents = Math.round(pack.priceCents * (config.salesTaxRate || 0))
  const base = `${input.origin}/${input.locale === 'vi' ? 'vi/' : ''}nyc/credits`
  const params: Record<string, string | number | null | undefined> = {
    mode: 'payment',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': pack.priceCents,
    'line_items[0][price_data][product_data][name]': `Ellieo credits · ${pack.credits}`,
    'line_items[0][price_data][product_data][description]': '1 credit = $1 on Ellieo. Paid credits never expire.',
    success_url: `${base}?paid=1&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}?canceled=1`,
    client_reference_id: input.uid,
    customer_email: profile?.email ?? undefined,
    'metadata[app]': 'ellieo_credits',
    'metadata[user_uid]': input.uid,
    'metadata[pack_id]': pack.id,
    'metadata[credits]': pack.credits,
    'metadata[pack_cents]': pack.priceCents,
    'metadata[tax_cents]': taxCents,
    'metadata[buyer_name]': name || undefined,
    'metadata[brokerage]': license?.brokerage ?? undefined,
    'payment_intent_data[metadata][app]': 'ellieo_credits',
    'payment_intent_data[metadata][user_uid]': input.uid,
    'payment_intent_data[description]': `Ellieo credits · ${pack.credits}`,
    // Same account as Misaeng: the card statement says it was Ellieo.
    'payment_intent_data[statement_descriptor_suffix]': 'ELLIEO',
    // Stripe emails its receipt to this address.
    'payment_intent_data[receipt_email]': profile?.email ?? undefined,
    'automatic_tax[enabled]': 'false',
  }
  if (taxCents > 0) {
    params['line_items[1][quantity]'] = 1
    params['line_items[1][price_data][currency]'] = 'usd'
    params['line_items[1][price_data][unit_amount]'] = taxCents
    params['line_items[1][price_data][product_data][name]'] = `Sales tax (${(config.salesTaxRate * 100).toFixed(3).replace(/\.?0+$/, '')}%)`
  }
  const session = await stripe<{ id: string; url: string }>('checkout/sessions', { body: form(params) })
  return { url: session.url, sessionId: session.id }
}

/** Handles one verified webhook event. Idempotent. */
export async function handleStripeEvent(event: { type?: string; data?: { object?: Record<string, unknown> } }) {
  const read = readCreditEvent(event)
  if (read.kind === 'ignore') return { ignored: read.reason }
  if (read.kind === 'paid') {
    let brand: string | null = null
    let last4: string | null = null
    let receiptUrl: string | null = null
    if (read.paymentIntent) {
      const pi = await stripe<{ latest_charge?: { receipt_url?: string; payment_method_details?: { card?: { brand?: string; last4?: string } } } }>(
        `payment_intents/${read.paymentIntent}?expand[]=latest_charge`,
      ).catch(() => null)
      brand = pi?.latest_charge?.payment_method_details?.card?.brand ?? null
      last4 = pi?.latest_charge?.payment_method_details?.card?.last4 ?? null
      receiptUrl = pi?.latest_charge?.receipt_url ?? null
    }
    const meta = ((event.data?.object ?? {}) as { metadata?: Record<string, string> }).metadata ?? {}
    const { data, error } = await db().rpc('ellieo_credit_purchase_complete', {
      p_user: read.uid,
      p_session: read.sessionId,
      p_intent: read.paymentIntent,
      p_pack: read.packId,
      p_credits: read.credits,
      p_amount_cents: read.amountCents,
      p_tax_cents: read.taxCents,
      p_currency: read.currency,
      p_card_brand: brand,
      p_last4: last4,
      p_buyer_name: meta.buyer_name || read.name,
      p_buyer_email: read.email,
      p_brokerage: meta.brokerage || null,
      p_receipt_url: receiptUrl,
    } as never)
    if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
    return { purchase: data }
  }
  const { data: purchase } = await db()
    .from('ellieo_credit_purchases')
    .select('id')
    .eq('stripe_payment_intent', read.paymentIntent)
    .maybeSingle<{ id: string }>()
  if (!purchase) return { ignored: 'no matching purchase' }
  if (read.kind === 'refunded' && !read.full) return { ignored: 'partial refund (not offered)' }
  const { data, error } = await db().rpc('ellieo_credit_purchase_reverse', {
    p_purchase: purchase.id,
    p_status: read.kind === 'refunded' ? 'refunded' : 'disputed',
    p_note: read.kind === 'refunded' ? 'Refunded in Stripe' : 'Card dispute',
    p_by: 'stripe',
  } as never)
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  return { reversed: data }
}

// MARK: - Purchases, receipts, refunds

export type PurchaseRow = {
  id: string
  user_id: string
  stripe_session_id: string
  stripe_payment_intent: string | null
  pack_id: string
  credits: number
  amount_cents: number
  tax_cents: number
  currency: string
  status: 'paid' | 'refund_requested' | 'refunded' | 'disputed' | 'reversed'
  card_brand: string | null
  card_last4: string | null
  buyer_name: string | null
  buyer_email: string | null
  brokerage: string | null
  receipt_url: string | null
  refund_reason: string | null
  refund_requested_at: string | null
  refund_decided_by: string | null
  refund_decided_at: string | null
  refund_note: string | null
  created_at: string
}

export async function getPurchase(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await db().from('ellieo_credit_purchases').select('*').eq('id', id).maybeSingle<PurchaseRow>()
  return data ?? null
}

export async function purchaseBySession(sessionId: string, uid: string) {
  const { data } = await db()
    .from('ellieo_credit_purchases')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('user_id', uid)
    .maybeSingle<PurchaseRow>()
  return data ?? null
}

export async function isRefundable(purchaseId: string) {
  const config = await getCreditsConfig()
  const { data } = await db().rpc('ellieo_credit_purchase_refundable', { p_purchase: purchaseId, p_days: config.refundDays } as never)
  return data === true
}

export async function requestRefund(purchaseId: string, uid: string, reason: string) {
  const config = await getCreditsConfig()
  const { error } = await db().rpc('ellieo_credit_refund_request', {
    p_user: uid,
    p_purchase: purchaseId,
    p_reason: reason.trim().slice(0, 300) || 'Requested from the receipt',
    p_days: config.refundDays,
  } as never)
  if (error) {
    if (/NOT_REFUNDABLE/.test(error.message)) {
      throw new CreditsError(`This purchase can no longer be refunded (more than ${config.refundDays} days, or some credits were used).`, 'NOT_REFUNDABLE', 409)
    }
    throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  }
}

/** ERP: approve (Stripe refund, then the lot is taken back) or deny a refund request. */
export async function decideRefund(input: { purchaseId: string; approve: boolean; note?: string | null; by: string }) {
  const purchase = await getPurchase(input.purchaseId)
  if (!purchase) throw new CreditsError('Purchase not found.', 'NOT_FOUND', 404)
  if (!input.approve) {
    await db().rpc('ellieo_credit_refund_deny', { p_purchase: purchase.id, p_note: input.note ?? '', p_by: input.by } as never)
    return { status: 'paid' }
  }
  if (!(await isRefundable(purchase.id))) {
    throw new CreditsError('Not refundable any more (some credits were used, or it is past the refund window).', 'NOT_REFUNDABLE', 409)
  }
  if (!purchase.stripe_payment_intent) throw new CreditsError('No Stripe payment to refund.', 'INVALID')
  await stripe('refunds', {
    body: form({ payment_intent: purchase.stripe_payment_intent, reason: 'requested_by_customer', 'metadata[app]': 'ellieo_credits' }),
    idempotencyKey: `ellieo-refund-${purchase.id}`,
  })
  const { error } = await db().rpc('ellieo_credit_purchase_reverse', {
    p_purchase: purchase.id,
    p_status: 'refunded',
    p_note: input.note || 'Refund approved',
    p_by: input.by,
  } as never)
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  return { status: 'refunded' }
}

export async function listPurchases(filter: { status?: string; uid?: string }, limit = 200) {
  let query = db().from('ellieo_credit_purchases').select('*').order('created_at', { ascending: false }).limit(limit)
  if (filter.status) query = query.eq('status', filter.status)
  if (filter.uid) query = query.eq('user_id', filter.uid)
  const { data, error } = await query.returns<PurchaseRow[]>()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new CreditsError('Paid listings are not set up yet (run agent_listing_pay.sql).', 'SETUP_REQUIRED', 503)
    }
    throw new CreditsError(error.message, 'LOAD_FAILED', 500)
  }
  return data ?? []
}

/** Member search for the ERP: uid, email (auth), or name / Ellieo ID (people directory). */
export async function searchMembers(q: string) {
  const query = q.trim()
  if (!query) return []
  const out = new Map<string, { uid: string; name: string | null; nickname: string | null; email: string | null }>()
  if (/^[0-9a-f-]{36}$/i.test(query)) out.set(query, { uid: query, name: null, nickname: null, email: null })
  if (query.includes('@')) {
    const { adminFindUserByEmail } = await import('@lib/auth/supabaseAuth.server')
    const user = await adminFindUserByEmail(query.toLowerCase()).catch(() => null)
    if (user) out.set(user.id, { uid: user.id, name: null, nickname: null, email: user.email ?? null })
  } else {
    const like = `%${query.replace(/[%_,()]/g, ' ').trim()}%`
    const { data } = await db()
      .from('ellieo_people')
      .select('uid, name, nickname')
      .or(`name.ilike.${like},nickname.ilike.${like}`)
      .limit(20)
      .returns<{ uid: string; name: string; nickname: string }[]>()
    for (const row of data ?? []) out.set(row.uid, { uid: row.uid, name: row.name, nickname: row.nickname, email: null })
  }
  // Fill in what we know from the profiles.
  await Promise.all(
    [...out.values()].map(async (member) => {
      const profile = await getSupabaseProfile(member.uid).catch(() => null)
      if (!profile) return
      const name = [profile.firstName, profile.lastName].map((p) => p?.trim()).filter(Boolean).join(' ')
      member.name ??= name || null
      member.nickname ??= profile.nickname ?? null
      member.email ??= profile.email ?? null
    }),
  )
  return [...out.values()]
}
