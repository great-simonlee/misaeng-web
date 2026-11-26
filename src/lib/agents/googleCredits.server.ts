import { getSupabaseProfile } from '@lib/supabase/profile.server'
import {
  PLAY_API,
  accessToken,
  googleAccountIdFor,
  isGooglePlayConfigured,
  packageName,
} from '@lib/premium/google.server'

import { getCreditsConfig, googleProductIdOf, inHouseNoPurchase, quotePack } from './credits.server'
import { CreditsError, db, isMissingTable, rpc } from './creditsCore.server'
import { isInHouse } from './inHouse.server'

/**
 * Misaeng credits bought in the Android app (Play Billing one-time products, consumed after delivery; same ids as the
 * App Store packs: com.misaeng.nyc.credits.100 / .220 / .460 / .960 — googleProductIdOf(pack)). Same pattern as
 * Misaeng Premium on Play (src/lib/premium/google.server.ts): the token the app sends is never trusted on its own —
 * the purchase is read back with the Play Developer API (purchases.products.get).
 *
 *   Account    the app buys with obfuscatedAccountId = googleAccountIdFor(uid) (the Premium one); a purchase without
 *              it, or with another account's, is refused, so a token can't be claimed by someone else.
 *   Credits    one paid lot per purchase token (idempotent; SQL supabase/agent_credits_google.sql). Play doesn't say
 *              what it charged, so amountCents = the pack's list price (USD). Purchase bonuses apply.
 *   Consume    the app consumes the purchase only after a 2xx here (or a 409 that says it was another account's /
 *              refunded). The server acknowledges it right away, so Google never auto-refunds a delivered purchase
 *              even if the consume call never happens; the app consumes it on its next launch.
 *   In-house   the app never offers the packs to in-house members; a purchase from one is refused (not consumed).
 *   Refunds    Play voided-purchase notifications (/api/premium/google/notifications) take the credits back.
 *   Env        GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / GOOGLE_PLAY_PACKAGE_NAME (shared with Premium).
 */

type ProductPurchase = {
  /** 0 purchased, 1 canceled, 2 pending */
  purchaseState?: number
  /** 0 not yet consumed, 1 consumed */
  consumptionState?: number
  /** 0 not yet acknowledged, 1 acknowledged */
  acknowledgementState?: number
  orderId?: string
  /** 0 test (license testers), 1 promo, 2 rewarded; absent = a real purchase */
  purchaseType?: number
  obfuscatedExternalAccountId?: string
  regionCode?: string
  productId?: string
}

export function isGoogleCreditsConfigured() {
  return isGooglePlayConfigured()
}

const productUrl = (productId: string, token: string) =>
  `${PLAY_API}/${packageName()}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`

async function fetchProductPurchase(productId: string, purchaseToken: string): Promise<ProductPurchase | null> {
  let token: string
  try {
    token = await accessToken()
  } catch {
    throw new CreditsError('Google Play purchases are not configured.', 'GOOGLE_OFF', 503)
  }
  const res = await fetch(productUrl(productId, purchaseToken), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (res.ok) return (await res.json()) as ProductPurchase
  if (res.status === 404 || res.status === 400 || res.status === 410) return null
  if (res.status === 401 || res.status === 403) throw new CreditsError('Google Play API rejected the service account.', 'GOOGLE_ERROR', 502)
  // Anything else is temporary: the app keeps the purchase (unconsumed) and retries.
  throw new CreditsError(`Google Play API is unavailable (HTTP ${res.status}).`, 'GOOGLE_UNAVAILABLE', 503)
}

/** Google refunds one-time purchases that aren't acknowledged (or consumed) within 3 days. */
async function acknowledge(productId: string, purchaseToken: string) {
  const token = await accessToken()
  const res = await fetch(`${productUrl(productId, purchaseToken)}:acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  })
  // 400 = already acknowledged / consumed
  if (!res.ok && res.status !== 400) console.error('[credits/google] acknowledge failed', res.status)
}

/** The app reports a Play credit-pack purchase → credits (idempotent). */
export async function claimGooglePurchase(input: { uid: string; productId: string; purchaseToken: string }) {
  if (!/^[a-z0-9._]{3,100}$/.test(input.productId) || !/^[A-Za-z0-9._:-]{10,1000}$/.test(input.purchaseToken)) {
    throw new CreditsError('Invalid purchase.', 'INVALID')
  }
  const config = await getCreditsConfig()
  const pack = config.packs.find((p) => googleProductIdOf(p) === input.productId)
  if (!pack) throw new CreditsError('This Google Play product is not a Misaeng credit pack.', 'INVALID', 400)

  // Already recorded (the app retried after a lost reply): just answer, without asking Google again.
  const { data: existing, error } = await db()
    .from('misaeng_credit_purchases')
    .select('id, user_id')
    .eq('google_purchase_token', input.purchaseToken)
    .maybeSingle<{ id: string; user_id: string }>()
  // 42703 = the google_* columns aren't there yet (supabase/agent_credits_google.sql not run): the app keeps the purchase.
  if (error) {
    throw error.code === '42703' || isMissingTable(error.code)
      ? new CreditsError('Google Play credits are not set up yet (run agent_credits_google.sql).', 'SETUP_REQUIRED', 503)
      : new CreditsError(`Credits failed: ${error.message}`, 'SERVER_ERROR', 500)
  }
  if (existing) {
    if (existing.user_id !== input.uid) throw new CreditsError('This purchase was made by another Misaeng account.', 'OTHER_ACCOUNT', 409)
    return { purchaseId: existing.id, created: false }
  }

  const purchase = await fetchProductPurchase(input.productId, input.purchaseToken)
  if (!purchase) throw new CreditsError('Purchase not found on Google Play.', 'NOT_FOUND', 404)
  if (purchase.obfuscatedExternalAccountId !== googleAccountIdFor(input.uid)) {
    throw new CreditsError('This purchase was made by another Misaeng account.', 'OTHER_ACCOUNT', 409)
  }
  if (purchase.purchaseState === 1) throw new CreditsError('Google refunded or canceled this purchase.', 'REFUNDED', 409)
  if (purchase.purchaseState !== 0) throw new CreditsError('The payment is still pending.', 'PENDING', 409)
  if (await isInHouse(input.uid)) throw inHouseNoPurchase()

  const quote = await quotePack({ uid: input.uid, packId: pack.id, appStore: true })
  const profile = await getSupabaseProfile(input.uid).catch(() => null)
  const name = [profile?.firstName, profile?.lastName].map((p) => p?.trim()).filter(Boolean).join(' ')
  const result = await rpc<{ purchaseId: string; created: boolean }>('misaeng_credit_purchase_record', {
    p: {
      user: input.uid,
      provider: 'google',
      googleToken: input.purchaseToken,
      googleOrder: purchase.orderId ?? null,
      googleEnvironment: purchase.purchaseType === 0 ? 'test' : 'live',
      productId: input.productId,
      packId: pack.id,
      baseCredits: pack.credits,
      bonusCredits: quote.bonusCredits,
      amountCents: pack.priceCents,
      listCents: pack.priceCents,
      currency: 'usd',
      buyerName: name || null,
      buyerEmail: profile?.email ?? null,
      promotionIds: quote.promotionIds,
    },
  })
  if (purchase.acknowledgementState === 0 && purchase.consumptionState !== 1) {
    await acknowledge(input.productId, input.purchaseToken).catch((error) => console.error('[credits/google] acknowledge', error))
  }
  return result
}

/** Play voided-purchase notification (refund / chargeback / revoke): the credits are taken back. Unknown tokens are ignored. */
export async function revokeGoogleCreditPurchase(purchaseToken: string) {
  const { data: purchase } = await db()
    .from('misaeng_credit_purchases')
    .select('id')
    .eq('google_purchase_token', purchaseToken)
    .maybeSingle<{ id: string }>()
  if (!purchase) return { ignored: 'unknown purchase' }
  const reversed = await rpc('misaeng_credit_purchase_reverse', {
    p_purchase: purchase.id,
    p_status: 'refunded',
    p_note: 'Refunded by Google Play',
    p_by: 'google',
  })
  return { reversed }
}
