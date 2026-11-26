import { createHmac, timingSafeEqual } from 'node:crypto'

import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { parseLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'

import { activeLicense } from './agentLicense.server'
import { CREDITS_PER_DOLLAR, CreditsError, db, rpc } from './creditsCore.server'
import { isInHouse } from './inHouse.server'
import { getListingPrices, premiumPrice } from './listingPlans.server'
import { discounted, purchaseOffers } from './promotions.server'
import { readCreditEvent } from './stripeWebhook'

/**
 * Misaeng credit packs, Stripe Checkout, receipts and refunds (owner 11-25 final: $1 = 10 credits, credits only from
 * payment; App Store purchases: appleCredits.server.ts).
 *
 *   Config     misaeng_settings 'credits' (Super Admin, ERP): packs (with their App Store product ids), salesTaxRate,
 *              topUpLinkIOS / topUpLinkAndroid (the web top-up link in the apps), refundDays, seller (receipt).
 *   In-house   in-house members (inHouse.server.ts) can't buy: checkout is refused.
 *   Offers     pack discounts and purchase bonuses (promotions.server.ts), automatic or with a code; the bonus credits
 *              are part of the same paid lot (same unit value).
 *   Stripe     Misaeng's Stripe account (Misaeng LLC): STRIPE_SECRET_KEY. Card statements read "… CREDITS"
 *              (descriptor suffix). Without a key
 *              the credits page says "Payments coming soon" and the API answers PAYMENTS_OFF.
 *   Checkout   one-time Stripe Checkout per pack (price_data inline, so no Stripe products to set up). Every Misaeng
 *              object carries metadata app = 'misaeng_credits'; Misaeng's webhook only acts on Premium subscriptions,
 *              so the two never touch each other's payments.
 *   Webhook    /api/credits/stripe/webhook — its own endpoint in the same Stripe account, with its own signing secret
 *              (MISAENG_CREDITS_STRIPE_WEBHOOK_SECRET): a paid session adds one paid lot (idempotent on the session id); a
 *              refund or dispute made in Stripe takes the lot back.
 *   Refunds    within refundDays (7) and only if none of that pack's credits was used, full only: the member asks from
 *              the receipt page → ERP approves → Stripe refund → the lot is taken back.
 *   App link   the app opens misaeng.com/credits with a short-lived signed token (?t=) so the member doesn't sign in
 *              again on the web; receipts use a signed link (?k=) so they can be opened and printed anywhere.
 */

export type CreditPack = { id: string; priceCents: number; credits: number; appleProductId?: string }
export type CreditsConfig = {
  packs: CreditPack[]
  salesTaxRate: number
  topUpLinkIOS: boolean
  topUpLinkAndroid: boolean
  refundDays: number
  seller: { name: string; address: string; email: string }
}

export const DEFAULT_CREDITS_CONFIG: CreditsConfig = {
  packs: [
    { id: 'pack100', priceCents: 999, credits: 100, appleProductId: 'com.misaeng.nyc.credits.100' },
    { id: 'pack220', priceCents: 1999, credits: 220, appleProductId: 'com.misaeng.nyc.credits.220' },
    { id: 'pack460', priceCents: 3999, credits: 460, appleProductId: 'com.misaeng.nyc.credits.460' },
    { id: 'pack960', priceCents: 7999, credits: 960, appleProductId: 'com.misaeng.nyc.credits.960' },
  ],
  salesTaxRate: 0,
  // The apps buy through the App Store now; the web link stays off there unless the ERP turns it on.
  topUpLinkIOS: false,
  topUpLinkAndroid: true,
  refundDays: 7,
  seller: {
    name: 'Misaeng LLC',
    address: '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
    email: 'info@misaeng.com',
  },
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
    if (!Number.isInteger(pack.credits) || pack.credits < 1 || pack.credits > 100_000) return false
    if (pack.appleProductId !== undefined && !/^[a-z0-9._-]{3,100}$/i.test(pack.appleProductId)) return false
  }
  return (
    typeof c.salesTaxRate === 'number' && c.salesTaxRate >= 0 && c.salesTaxRate < 0.25 &&
    typeof c.topUpLinkIOS === 'boolean' && typeof c.topUpLinkAndroid === 'boolean' &&
    Number.isInteger(c.refundDays) && c.refundDays >= 0 && c.refundDays <= 60 &&
    typeof c.seller?.name === 'string' && c.seller.name.length > 1 && typeof c.seller.address === 'string' &&
    typeof c.seller.email === 'string'
  )
}

export async function getCreditsConfig(): Promise<CreditsConfig> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value
  const { data } = await db().from('misaeng_settings').select('value').eq('key', 'credits').maybeSingle<{ value: CreditsConfig }>()
  // Before credits_paid_only.sql the row still has the $1 = 1 credit packs: use the defaults until it is run.
  const unit = await db().from('misaeng_settings').select('key').eq('key', 'credits_unit').maybeSingle()
  const value = unit.data && validConfig(data?.value) ? data!.value : DEFAULT_CREDITS_CONFIG
  cached = { at: Date.now(), value }
  return value
}

export async function saveCreditsConfig(value: unknown, by: string) {
  if (value && typeof value === 'object') delete (value as { rewardDays?: unknown }).rewardDays
  if (!validConfig(value)) {
    throw new CreditsError('Credit settings are not valid (pack ids, $0.50–$1,000 prices, whole credits, App Store product ids, tax rate under 25%).', 'INVALID_PRICES')
  }
  const { error } = await db()
    .from('misaeng_settings')
    .upsert({ key: 'credits', value, updated_at: new Date().toISOString(), updated_by: by } as never, { onConflict: 'key' })
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  cached = null
  return getCreditsConfig()
}

// MARK: - Packs with "what you can do with it"

/** e.g. 460 credits → "1 Premium listing + a 7-day listing" (from the current prices). */
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
    const bonus = Math.max(0, pack.credits - Math.round((pack.priceCents / 100) * CREDITS_PER_DOLLAR))
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
  return (process.env.MISAENG_CREDITS_LINK_SECRET || process.env.INTERNAL_PUSH_SECRET || '').trim()
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
  return `${localePath('ko', `/nyc/credits/receipts/${purchaseId}`)}?k=${receiptKey(purchaseId)}`
}

// MARK: - Stripe (REST, no SDK)

/** Misaeng's Stripe account (Misaeng LLC) (STRIPE_SECRET_KEY). */
export function stripeKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || ''
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

export function inHouseNoPurchase() {
  return new CreditsError('In-house accounts use staff credits and can’t buy credits.', 'IN_HOUSE_NO_PURCHASE', 403)
}

/** What a pack costs this member now (discount, bonus) — the web page and the checkout use the same numbers. */
export async function quotePack(input: { uid: string; packId: string; code?: string | null; appStore?: boolean }) {
  const config = await getCreditsConfig()
  const pack = config.packs.find((p) => p.id === input.packId)
  if (!pack) throw new CreditsError('Choose a credit pack.', 'INVALID')
  const { discount, bonus } = await purchaseOffers({ uid: input.uid, packId: pack.id, code: input.code, appStore: input.appStore })
  const priceCents = discounted(pack.priceCents, discount)
  const bonusCredits = bonus ? Math.floor((pack.credits * bonus.percent) / 100) : 0
  return {
    pack,
    priceCents,
    discountCents: pack.priceCents - priceCents,
    bonusCredits,
    promotionIds: [discount?.id, bonus?.id].filter((id): id is string => Boolean(id)),
    offers: [discount, bonus].filter(Boolean).map((p) => ({ kind: p!.kind, title: p!.title, percent: p!.percent })),
  }
}

/** Stripe Checkout for one pack; returns the Stripe page URL. */
export async function createCheckout(input: { uid: string; packId: string; origin: string; locale: string; code?: string | null }) {
  if (await isInHouse(input.uid)) throw inHouseNoPurchase()
  if (!paymentsEnabled()) throw new CreditsError('Payments are coming soon.', 'PAYMENTS_OFF', 503)
  const config = await getCreditsConfig()
  const quote = await quotePack({ uid: input.uid, packId: input.packId, code: input.code })
  const pack = quote.pack
  if (quote.priceCents < 50) throw new CreditsError('This offer makes the pack too cheap to charge.', 'INVALID')
  const profile = await getSupabaseProfile(input.uid).catch(() => null)
  const license = await activeLicense(input.uid).catch(() => null)
  const name = [profile?.firstName, profile?.lastName].map((p) => p?.trim()).filter(Boolean).join(' ')
  const taxCents = Math.round(quote.priceCents * (config.salesTaxRate || 0))
  const totalCredits = pack.credits + quote.bonusCredits
  const base = `${input.origin}${localePath(parseLocale(input.locale) ?? 'ko', '/nyc/credits')}`
  const params: Record<string, string | number | null | undefined> = {
    mode: 'payment',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': quote.priceCents,
    'line_items[0][price_data][product_data][name]': `Misaeng credits · ${totalCredits}`,
    'line_items[0][price_data][product_data][description]':
      (quote.bonusCredits ? `${pack.credits} + ${quote.bonusCredits} bonus credits. ` : '') + 'Paid credits never expire.',
    success_url: `${base}?paid=1&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}?canceled=1`,
    client_reference_id: input.uid,
    customer_email: profile?.email ?? undefined,
    'metadata[app]': 'misaeng_credits',
    'metadata[user_uid]': input.uid,
    'metadata[pack_id]': pack.id,
    'metadata[credits]': pack.credits,
    'metadata[bonus_credits]': quote.bonusCredits,
    'metadata[pack_cents]': quote.priceCents,
    'metadata[list_cents]': pack.priceCents,
    'metadata[discount_cents]': quote.discountCents,
    'metadata[promotions]': quote.promotionIds.join(',') || undefined,
    'metadata[tax_cents]': taxCents,
    'metadata[buyer_name]': name || undefined,
    'metadata[brokerage]': license?.brokerage ?? undefined,
    'payment_intent_data[metadata][app]': 'misaeng_credits',
    'payment_intent_data[metadata][user_uid]': input.uid,
    'payment_intent_data[description]': `Misaeng credits · ${totalCredits}`,
    // Same account as Misaeng: the card statement says CREDITS.
    'payment_intent_data[statement_descriptor_suffix]': 'CREDITS',
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
    // The member paid: the credits are theirs (an in-house member can't get here — checkout refuses them).
    const data = await rpc('misaeng_credit_purchase_record', {
      p: {
        user: read.uid,
        provider: 'stripe',
        stripeSession: read.sessionId,
        stripeIntent: read.paymentIntent,
        packId: read.packId,
        baseCredits: read.credits,
        bonusCredits: Number(meta.bonus_credits) || 0,
        amountCents: read.amountCents,
        taxCents: read.taxCents,
        listCents: Number(meta.list_cents) || read.amountCents,
        discountCents: Number(meta.discount_cents) || 0,
        currency: read.currency,
        cardBrand: brand,
        last4,
        buyerName: meta.buyer_name || read.name,
        buyerEmail: read.email,
        brokerage: meta.brokerage || null,
        receiptUrl,
        promotionIds: (meta.promotions || '').split(',').filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      },
    })
    return { purchase: data }
  }
  const { data: purchase } = await db()
    .from('misaeng_credit_purchases')
    .select('id')
    .eq('stripe_payment_intent', read.paymentIntent)
    .maybeSingle<{ id: string }>()
  if (!purchase) return { ignored: 'no matching purchase' }
  if (read.kind === 'refunded' && !read.full) return { ignored: 'partial refund (not offered)' }
  const data = await rpc('misaeng_credit_purchase_reverse', {
    p_purchase: purchase.id,
    p_status: read.kind === 'refunded' ? 'refunded' : 'disputed',
    p_note: read.kind === 'refunded' ? 'Refunded in Stripe' : 'Card dispute',
    p_by: 'stripe',
  })
  return { reversed: data }
}

// MARK: - Purchases, receipts, refunds

export type PurchaseRow = {
  id: string
  user_id: string
  provider: 'stripe' | 'apple'
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  apple_transaction_id: string | null
  apple_environment: string | null
  product_id: string | null
  pack_id: string
  credits: number
  base_credits: number | null
  bonus_credits: number
  list_cents: number | null
  discount_cents: number
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
  const { data } = await db().from('misaeng_credit_purchases').select('*').eq('id', id).maybeSingle<PurchaseRow>()
  return data ?? null
}

export async function purchaseBySession(sessionId: string, uid: string) {
  const { data } = await db()
    .from('misaeng_credit_purchases')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .eq('user_id', uid)
    .maybeSingle<PurchaseRow>()
  return data ?? null
}

export async function isRefundable(purchaseId: string) {
  const config = await getCreditsConfig()
  const { data } = await db().rpc('misaeng_credit_purchase_refundable', { p_purchase: purchaseId, p_days: config.refundDays } as never)
  return data === true
}

export async function requestRefund(purchaseId: string, uid: string, reason: string) {
  const config = await getCreditsConfig()
  const { error } = await db().rpc('misaeng_credit_refund_request', {
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
    await db().rpc('misaeng_credit_refund_deny', { p_purchase: purchase.id, p_note: input.note ?? '', p_by: input.by } as never)
    return { status: 'paid' }
  }
  if (purchase.provider === 'apple') {
    throw new CreditsError('App Store purchases are refunded by Apple (reportaproblem.apple.com); the credits are taken back automatically.', 'NOT_REFUNDABLE', 409)
  }
  if (!(await isRefundable(purchase.id))) {
    throw new CreditsError('Not refundable any more (some credits were used, or it is past the refund window).', 'NOT_REFUNDABLE', 409)
  }
  if (!purchase.stripe_payment_intent) throw new CreditsError('No Stripe payment to refund.', 'INVALID')
  await stripe('refunds', {
    body: form({ payment_intent: purchase.stripe_payment_intent, reason: 'requested_by_customer', 'metadata[app]': 'misaeng_credits' }),
    idempotencyKey: `misaeng-refund-${purchase.id}`,
  })
  await rpc('misaeng_credit_purchase_reverse', {
    p_purchase: purchase.id,
    p_status: 'refunded',
    p_note: input.note || 'Refund approved',
    p_by: input.by,
  })
  return { status: 'refunded' }
}

export async function listPurchases(filter: { status?: string; uid?: string }, limit = 200) {
  let query = db().from('misaeng_credit_purchases').select('*').order('created_at', { ascending: false }).limit(limit)
  if (filter.status) query = query.eq('status', filter.status)
  if (filter.uid) query = query.eq('user_id', filter.uid)
  const { data, error } = await query.returns<PurchaseRow[]>()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new CreditsError('Credits are not set up yet (run credits_paid_only.sql).', 'SETUP_REQUIRED', 503)
    }
    throw new CreditsError(error.message, 'LOAD_FAILED', 500)
  }
  return data ?? []
}

/** Member search for the ERP: uid, email (auth), or name / nickname. */
export async function searchMembers(q: string) {
  const query = q.trim()
  if (!query) return []
  const out = new Map<string, { uid: string; name: string | null; nickname: string | null; email: string | null }>()
  if (/^[0-9a-f-]{36}$/i.test(query)) out.set(query, { uid: query, name: null, nickname: null, email: null })
  if (query.includes('@')) {
    const { adminFindUserByEmail } = await import('@lib/auth/supabaseAuth.server')
    const { uidForAuthUser } = await import('@lib/auth/accounts.server')
    const user = await adminFindUserByEmail(query.toLowerCase()).catch(() => null)
    // Misaeng uid (legacy members keep their old uid through auth_accounts), not the Supabase auth id.
    const uid = user ? (await uidForAuthUser(user.id).catch(() => null)) || user.id : null
    if (uid) out.set(uid, { uid, name: null, nickname: null, email: user?.email ?? null })
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
