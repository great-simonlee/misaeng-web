import { createPrivateKey, sign } from 'node:crypto'

import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { appAccountTokenFor } from '@lib/premium/apple.server'

import { inHouseNoPurchase, getCreditsConfig, quotePack } from './credits.server'
import { CreditsError, db, rpc } from './creditsCore.server'
import { isInHouse } from './inHouse.server'

/**
 * Misaeng credits bought in the iOS app (StoreKit 2 consumables, one per pack: com.misaeng.nyc.credits.100 / .220 /
 * .460 / .960 — the ids live in the credits config). Same pattern as Misaeng Premium (src/lib/premium/apple.server.ts
 * on misaeng-web): what the app sends is never trusted on its own — the transaction is read back from the App Store
 * Server API (Get Transaction Info), production first, then sandbox (TestFlight / Xcode sandbox).
 *
 *   Account    the app buys with the member's appAccountToken (the Premium one), so a transaction can't be claimed by someone else.
 *   Credits    one paid lot per transaction id (idempotent); amountCents = the price Apple charged (USD) — that is what
 *              one credit is worth for revenue / liability. Purchase bonuses apply; pack discounts don't (Apple sets
 *              the price).
 *   In-house   the app never offers the sheet to in-house members; if a transaction from one arrives anyway it is
 *              refused (not finished) so they can ask Apple for a refund.
 *   Refunds    App Store Server Notifications V2 (/api/premium/apple/notifications (shared with Premium)): REFUND / REVOKE → the transaction is
 *              read back and, if Apple revoked it, the credits are taken back (debt if they were used).
 *   Env        ELLIEO_APPLE_IAP_KEY_ID / _ISSUER_ID / _PRIVATE_KEY, or Misaeng's APPLE_IAP_* (same developer team).
 *              MISAENG_APPLE_IAP_LOCAL_TEST=1 (never in production): trust Xcode StoreKit-testing transactions, which the
 *              App Store Server API doesn't know.
 */

const BUNDLE_ID = 'com.misaeng.nyc'
const HOSTS = {
  Production: 'https://api.storekit.itunes.apple.com',
  Sandbox: 'https://api.storekit-sandbox.itunes.apple.com',
} as const
type AppleEnv = keyof typeof HOSTS

export type AppleTransaction = {
  transactionId?: string
  originalTransactionId?: string
  productId?: string
  bundleId?: string
  appAccountToken?: string
  type?: string
  price?: number
  currency?: string
  environment?: string
  revocationDate?: number
  purchaseDate?: number
}

function config() {
  const keyId = (process.env.APPLE_IAP_KEY_ID)?.trim()
  const issuer = (process.env.APPLE_IAP_ISSUER_ID)?.trim()
  const pem = (process.env.APPLE_IAP_PRIVATE_KEY)?.replace(/\\n/g, '\n').trim()
  return keyId && issuer && pem ? { keyId, issuer, pem } : null
}

export function localTestMode() {
  return process.env.MISAENG_APPLE_IAP_LOCAL_TEST === '1' && process.env.NODE_ENV !== 'production'
}

export function isAppleCreditsConfigured() {
  return Boolean(config()) || localTestMode()
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

export function decodeJws<T>(jws: string | undefined | null): T | null {
  const part = jws?.split('.')[1]
  if (!part) return null
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function apiToken() {
  const c = config()
  if (!c) throw new CreditsError('App Store purchases are not configured.', 'APPLE_OFF', 503)
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: c.keyId, typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ iss: c.issuer, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1', bid: BUNDLE_ID }))
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key: createPrivateKey(c.pem), dsaEncoding: 'ieee-p1363' })
  return `${header}.${payload}.${b64url(signature)}`
}

/** Get Transaction Info — production, then sandbox. null = Apple doesn't know it. */
async function fetchTransaction(transactionId: string): Promise<{ env: AppleEnv; tx: AppleTransaction } | null> {
  const token = apiToken()
  for (const env of ['Production', 'Sandbox'] as AppleEnv[]) {
    const res = await fetch(`${HOSTS[env]}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) {
      const body = (await res.json()) as { signedTransactionInfo?: string }
      const tx = decodeJws<AppleTransaction>(body.signedTransactionInfo)
      if (tx) return { env, tx }
    }
    if (res.status === 401) throw new CreditsError('App Store API rejected the key.', 'APPLE_ERROR', 502)
    // 404 / 400 = not in this environment; anything else is temporary → the app keeps the transaction and retries.
    if (!res.ok && res.status !== 404 && res.status !== 400) {
      throw new CreditsError(`App Store API is unavailable (HTTP ${res.status}).`, 'APPLE_UNAVAILABLE', 503)
    }
  }
  return null
}

async function readTransaction(transactionId: string, signedTransaction?: string | null) {
  if (localTestMode() && signedTransaction) {
    const tx = decodeJws<AppleTransaction>(signedTransaction)
    if (tx && (tx.environment === 'Xcode' || tx.environment === 'LocalTesting') && tx.transactionId === transactionId) {
      return { env: 'Xcode', tx }
    }
  }
  if (!config()) throw new CreditsError('App Store purchases are not configured.', 'APPLE_OFF', 503)
  return fetchTransaction(transactionId)
}

/** The app reports a finished StoreKit purchase → credits (idempotent). Returns the new balance-facing summary. */
export async function claimAppleTransaction(input: { uid: string; transactionId: string; signedTransaction?: string | null }) {
  if (!/^\d{1,30}$/.test(input.transactionId)) throw new CreditsError('Invalid transaction.', 'INVALID')
  const found = await readTransaction(input.transactionId, input.signedTransaction)
  if (!found) throw new CreditsError('Purchase not found on the App Store.', 'NOT_FOUND', 404)
  const { tx, env } = found
  if (tx.bundleId !== BUNDLE_ID) throw new CreditsError('This purchase is not from Misaeng.', 'INVALID', 400)
  const config = await getCreditsConfig()
  const pack = config.packs.find((p) => p.appleProductId && p.appleProductId === tx.productId)
  if (!pack) throw new CreditsError('This App Store product is not a Misaeng credit pack.', 'INVALID', 400)
  // Misaeng buys with the member's Premium appAccountToken (premium_apple_accounts; uids aren't UUIDs), or the uid.
  const ownToken = tx.appAccountToken ? await appAccountTokenFor(input.uid).catch(() => null) : null
  if (
    tx.appAccountToken &&
    tx.appAccountToken.toLowerCase() !== input.uid.toLowerCase() &&
    tx.appAccountToken.toLowerCase() !== (ownToken ?? '').toLowerCase()
  ) {
    throw new CreditsError('This purchase was made by another Misaeng account.', 'OTHER_ACCOUNT', 409)
  }
  // Already recorded (the app retried, or the notification came first): just answer.
  const { data: existing } = await db()
    .from('misaeng_credit_purchases')
    .select('id, user_id')
    .eq('apple_transaction_id', String(tx.transactionId))
    .maybeSingle<{ id: string; user_id: string }>()
  if (existing) {
    if (existing.user_id !== input.uid) throw new CreditsError('This purchase was made by another Misaeng account.', 'OTHER_ACCOUNT', 409)
    return { purchaseId: existing.id, created: false }
  }
  if (tx.revocationDate) throw new CreditsError('Apple refunded this purchase.', 'REFUNDED', 409)
  if (await isInHouse(input.uid)) throw inHouseNoPurchase()
  const quote = await quotePack({ uid: input.uid, packId: pack.id, appStore: true })
  // Apple's price is in milli-units of the storefront currency; USD → cents. Other currencies: the pack's list price.
  const currency = (tx.currency || 'USD').toLowerCase()
  const amountCents = currency === 'usd' && Number.isFinite(tx.price) ? Math.round(Number(tx.price) / 10) : pack.priceCents
  const profile = await getSupabaseProfile(input.uid).catch(() => null)
  const name = [profile?.firstName, profile?.lastName].map((p) => p?.trim()).filter(Boolean).join(' ')
  const result = await rpc<{ purchaseId: string; created: boolean }>('misaeng_credit_purchase_record', {
    p: {
      user: input.uid,
      provider: 'apple',
      appleTransaction: String(tx.transactionId),
      appleOriginalTransaction: tx.originalTransactionId ? String(tx.originalTransactionId) : null,
      appleEnvironment: env,
      productId: tx.productId,
      packId: pack.id,
      baseCredits: pack.credits,
      bonusCredits: quote.bonusCredits,
      amountCents,
      listCents: amountCents,
      currency: currency === 'usd' ? 'usd' : currency,
      buyerName: name || null,
      buyerEmail: profile?.email ?? null,
      promotionIds: quote.promotionIds,
    },
  })
  return result
}

/** App Store Server Notification V2: a refund / revoke takes the credits back. Other types are ignored. */
export async function handleAppleNotification(signedPayload: string | null | undefined) {
  const payload = decodeJws<{ notificationType?: string; data?: { signedTransactionInfo?: string; bundleId?: string } }>(signedPayload)
  const type = payload?.notificationType
  if (type !== 'REFUND' && type !== 'REVOKE') return { ignored: type ?? 'unknown' }
  const hinted = decodeJws<AppleTransaction>(payload?.data?.signedTransactionInfo)
  if (!hinted?.transactionId) return { ignored: 'no transaction' }
  // Never trust the notification body: read the transaction back from Apple.
  const found = await fetchTransaction(String(hinted.transactionId))
  if (!found || found.tx.bundleId !== BUNDLE_ID || !found.tx.revocationDate) return { ignored: 'not revoked' }
  const { data: purchase } = await db()
    .from('misaeng_credit_purchases')
    .select('id')
    .eq('apple_transaction_id', String(found.tx.transactionId))
    .maybeSingle<{ id: string }>()
  if (!purchase) return { ignored: 'unknown purchase' }
  const reversed = await rpc('misaeng_credit_purchase_reverse', {
    p_purchase: purchase.id,
    p_status: 'refunded',
    p_note: type === 'REFUND' ? 'Refunded by Apple' : 'Revoked by Apple',
    p_by: 'apple',
  })
  return { reversed }
}
