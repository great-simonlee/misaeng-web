import { createPrivateKey, sign } from 'node:crypto'

import { invalidatePremium } from './access.server'
import { getEntitlementByExternalId, upsertEntitlement, type PremiumPlan, type PremiumStatus } from './entitlements.server'

/**
 * App Store subscriptions (Misaeng iOS, com.misaeng.nyc): products com.misaeng.nyc.premium.monthly / .season /
 * .annual. A transaction the app sends is never trusted on its own — its originalTransactionId is looked up with the
 * App Store Server API (Get All Subscription Statuses), production first, then sandbox (TestFlight / Xcode).
 * Env: APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY (the .p8 text; "\n" escapes are fine).
 */

const BUNDLE_ID = 'com.misaeng.nyc'
const HOSTS = {
  Production: 'https://api.storekit.itunes.apple.com',
  Sandbox: 'https://api.storekit-sandbox.itunes.apple.com',
} as const
type AppleEnv = keyof typeof HOSTS

const PRODUCT_PLANS: Record<string, PremiumPlan> = {
  [`${BUNDLE_ID}.premium.monthly`]: 'monthly',
  [`${BUNDLE_ID}.premium.season`]: 'season',
  [`${BUNDLE_ID}.premium.annual`]: 'annual',
}

export class AppleIapError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

type AppleTransaction = {
  transactionId?: string
  originalTransactionId?: string
  productId?: string
  bundleId?: string
  expiresDate?: number
  appAccountToken?: string
  offerDiscountType?: string
  offerType?: number
  environment?: string
  revocationDate?: number
}
type AppleRenewal = { autoRenewStatus?: number; originalTransactionId?: string }

function config() {
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim()
  const issuer = process.env.APPLE_IAP_ISSUER_ID?.trim()
  const pem = process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  return keyId && issuer && pem ? { keyId, issuer, pem } : null
}

export function isAppleIapConfigured() {
  return Boolean(config())
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

/** The middle part of a JWS, decoded (the App Store's signedTransactionInfo / signedPayload). */
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
  if (!c) throw new AppleIapError('App Store purchases are not configured.', 503)
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: c.keyId, typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ iss: c.issuer, iat: now, exp: now + 20 * 60, aud: 'appstoreconnect-v1', bid: BUNDLE_ID }),
  )
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(c.pem),
    dsaEncoding: 'ieee-p1363',
  })
  return `${header}.${payload}.${b64url(signature)}`
}

type StatusResponse = {
  environment?: string
  data?: Array<{
    lastTransactions?: Array<{
      originalTransactionId?: string
      status?: number
      signedTransactionInfo?: string
      signedRenewalInfo?: string
    }>
  }>
}

async function fetchStatuses(transactionId: string): Promise<{ env: AppleEnv; body: StatusResponse } | null> {
  const token = apiToken()
  for (const env of ['Production', 'Sandbox'] as AppleEnv[]) {
    const res = await fetch(`${HOSTS[env]}/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) return { env, body: (await res.json()) as StatusResponse }
    if (res.status === 401) throw new AppleIapError('App Store API rejected the key.', 502)
    // 404 / 400: not in this environment, try the next
  }
  return null
}

function statusFrom(code: number | undefined, tx: AppleTransaction): PremiumStatus {
  if (tx.revocationDate) return 'canceled'
  switch (code) {
    case 1:
      return tx.offerDiscountType === 'FREE_TRIAL' ? 'trialing' : 'active'
    case 3: // billing retry
    case 4: // billing grace period
      return 'past_due'
    case 5:
      return 'canceled'
    default:
      return 'expired'
  }
}

/**
 * Look up a subscription with Apple and mirror it into premium_entitlements for `uid` (keyed by
 * originalTransactionId). When uid is null (server notification) the row's current owner is kept.
 */
export async function syncAppleSubscription(transactionId: string, uid: string | null, email?: string | null) {
  const found = await fetchStatuses(transactionId)
  if (!found) throw new AppleIapError('Subscription not found on the App Store.', 404)
  const items = (found.body.data ?? []).flatMap((group) => group.lastTransactions ?? [])
  const decoded = items
    .map((item) => ({
      code: item.status,
      tx: decodeJws<AppleTransaction>(item.signedTransactionInfo) ?? {},
      renewal: decodeJws<AppleRenewal>(item.signedRenewalInfo) ?? {},
    }))
    .filter((item) => item.tx.bundleId === BUNDLE_ID && item.tx.productId && PRODUCT_PLANS[item.tx.productId])
  if (!decoded.length) throw new AppleIapError('No Misaeng Premium subscription in this purchase.', 404)

  let ownerUid = uid
  for (const { code, tx, renewal } of decoded) {
    const originalId = tx.originalTransactionId || renewal.originalTransactionId
    if (!originalId) continue
    const existing = await getEntitlementByExternalId(`apple:${originalId}`)
    // One App Store subscription belongs to one Misaeng account.
    if (uid && existing && existing.user_uid !== uid) {
      throw new AppleIapError('This App Store subscription is linked to another Misaeng account.', 409)
    }
    ownerUid = uid ?? existing?.user_uid ?? null
    if (!ownerUid) continue
    await upsertEntitlement({
      user_uid: ownerUid,
      email: email ?? existing?.email ?? null,
      source: 'apple',
      plan: PRODUCT_PLANS[tx.productId!],
      status: statusFrom(code, tx),
      current_period_end: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
      cancel_at_period_end: renewal.autoRenewStatus === 0,
      external_id: `apple:${originalId}`,
      product_id: tx.productId ?? null,
      environment: found.env,
      raw: { status: code, transactionId: tx.transactionId, appAccountToken: tx.appAccountToken ?? null },
    })
    invalidatePremium(ownerUid)
  }
  return ownerUid
}
