import { createHash, createSign } from 'node:crypto'

import { invalidatePremium } from './access.server'
import {
  getEntitlementByExternalId,
  upsertEntitlement,
  type PremiumEntitlement,
  type PremiumPlan,
  type PremiumStatus,
} from './entitlements.server'
import { getPointsConfig } from '@lib/points/config.server'

/**
 * Google Play subscriptions (Misaeng Android, com.misaeng.nyc): one subscription product `misaeng_premium` with base
 * plans `monthly`, `season`, `annual` (7-day free-trial offer on each). Like the App Store flow, a purchase token the
 * app sends is never trusted on its own: it is read with the Google Play Developer API (purchases.subscriptionsv2.get)
 * and mirrored into premium_entitlements.
 *
 * Row key: external_id = `google:<purchaseToken>`. A token stays the same across renewals; a plan change / resubscribe
 * makes a new token whose `linkedPurchaseToken` points at the old one (that old row is then marked expired).
 * Owner: the app sets obfuscatedAccountId = googleAccountIdFor(uid) on every purchase, and a token that carries
 * another account's id is refused. Server notifications (RTDN) only update rows the app already reported.
 *
 * Env: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (the service account key JSON, raw or base64), GOOGLE_PLAY_PACKAGE_NAME
 * (default com.misaeng.nyc), GOOGLE_RTDN_TOKEN (shared secret in the Pub/Sub push URL), GOOGLE_PLAY_ACCOUNT_SALT
 * (optional, mixed into the obfuscated account id).
 * Switch: the Android paywall shows only when point setting `premium.android_billing` is on (ERP / internal settings
 * API) or env PREMIUM_ANDROID_BILLING=on — AND the service account is configured. Default off.
 */

export const GOOGLE_PRODUCT_ID = 'misaeng_premium'
const BASE_PLANS: Record<string, PremiumPlan> = { monthly: 'monthly', season: 'season', annual: 'annual' }
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'

export class GooglePlayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string }

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const json = JSON.parse(text) as ServiceAccount
    return json.client_email && json.private_key ? { ...json, private_key: json.private_key.replace(/\\n/g, '\n') } : null
  } catch {
    return null
  }
}

export const packageName = () => process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || 'com.misaeng.nyc'

export function isGooglePlayConfigured() {
  return Boolean(serviceAccount())
}

/** The Android paywall is on: switch on and Google configured (off by default). */
export async function androidBillingEnabled(): Promise<boolean> {
  if (!isGooglePlayConfigured()) return false
  if (process.env.PREMIUM_ANDROID_BILLING?.trim().toLowerCase() === 'on') return true
  const config = await getPointsConfig().catch(() => null)
  return Boolean(config?.settings['premium.android_billing'])
}

/** Stable, non-reversible id for this account that the app puts on purchases (Play allows ≤ 64 chars). */
export function googleAccountIdFor(uid: string) {
  const salt = process.env.GOOGLE_PLAY_ACCOUNT_SALT?.trim() || 'misaeng-play'
  return createHash('sha256').update(`${salt}:${uid}`).digest('hex')
}

let cachedToken: { value: string; exp: number } | null = null

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value
  const sa = serviceAccount()
  if (!sa) throw new GooglePlayError('Google Play purchases are not configured.', 503)
  const now = Math.floor(Date.now() / 1000)
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token'
  const b64 = (v: string | Buffer) => Buffer.from(v).toString('base64url')
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${head}.${claims}`)
  const jwt = `${head}.${claims}.${b64(signer.sign(sa.private_key))}`
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    cache: 'no-store',
  })
  if (!res.ok) throw new GooglePlayError('Google rejected the service account.', 502)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

type LineItem = {
  productId?: string
  expiryTime?: string
  autoRenewingPlan?: { autoRenewEnabled?: boolean }
  offerDetails?: { basePlanId?: string; offerId?: string }
  offerPhase?: { freeTrial?: object }
}
export type GoogleSubscription = {
  subscriptionState?: string
  acknowledgementState?: string
  latestOrderId?: string
  linkedPurchaseToken?: string
  testPurchase?: object
  lineItems?: LineItem[]
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string }
}

async function fetchSubscription(purchaseToken: string): Promise<GoogleSubscription | null> {
  const token = await accessToken()
  const res = await fetch(
    `${API}/${packageName()}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  if (res.ok) return (await res.json()) as GoogleSubscription
  if (res.status === 404 || res.status === 400 || res.status === 410) return null
  if (res.status === 401 || res.status === 403) throw new GooglePlayError('Google Play API rejected the service account.', 502)
  throw new GooglePlayError(`Google Play API is unavailable (HTTP ${res.status}).`, 503)
}

/** Google refunds purchases that aren't acknowledged within 3 days. */
async function acknowledge(productId: string, purchaseToken: string) {
  const token = await accessToken()
  const res = await fetch(
    `${API}/${packageName()}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' },
  )
  if (!res.ok && res.status !== 400) throw new GooglePlayError(`Acknowledging the purchase failed (HTTP ${res.status}).`, 503)
}

function statusFrom(sub: GoogleSubscription, item: LineItem): PremiumStatus | null {
  switch (sub.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_CANCELED': // auto-renew off: access until expiryTime
      return item.offerPhase?.freeTrial || /trial/i.test(item.offerDetails?.offerId ?? '') ? 'trialing' : 'active'
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return 'past_due'
    case 'SUBSCRIPTION_STATE_PAUSED':
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired'
    default: // PENDING / PENDING_PURCHASE_CANCELED: nothing paid yet, no access
      return null
  }
}

/**
 * Read a purchase token from Google and mirror it into premium_entitlements. `uid` = the account that reported it
 * (app); null = a server notification (the row's owner is kept; unknown tokens are ignored).
 */
export async function syncGoogleSubscription(purchaseToken: string, uid: string | null, email?: string | null) {
  const sub = await fetchSubscription(purchaseToken)
  if (!sub) throw new GooglePlayError('Subscription not found on Google Play.', 404)
  const item = (sub.lineItems ?? []).find((line) => line.productId === GOOGLE_PRODUCT_ID)
  const plan = item?.offerDetails?.basePlanId ? BASE_PLANS[item.offerDetails.basePlanId] : undefined
  if (!item || !plan) throw new GooglePlayError('No Misaeng Premium subscription in this purchase.', 404)

  const externalId = `google:${purchaseToken}`
  const existing = await getEntitlementByExternalId(externalId)
  const buyer = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId
  // One Play subscription belongs to one Misaeng account: refuse a token bought from another account.
  if (uid && buyer && buyer !== googleAccountIdFor(uid)) {
    throw new GooglePlayError('This Google Play subscription is linked to another Misaeng account.', 409)
  }
  if (uid && existing && existing.user_uid !== uid && !(buyer && buyer === googleAccountIdFor(uid))) {
    throw new GooglePlayError('This Google Play subscription is linked to another Misaeng account.', 409)
  }
  const ownerUid = uid ?? existing?.user_uid ?? null
  if (!ownerUid) return null

  const status = statusFrom(sub, item)
  if (!status) return ownerUid
  await upsertEntitlement({
    user_uid: ownerUid,
    email: email ?? existing?.email ?? null,
    source: 'google',
    plan,
    status,
    current_period_end: item.expiryTime ?? null,
    cancel_at_period_end: item.autoRenewingPlan?.autoRenewEnabled === false,
    external_id: externalId,
    product_id: `${GOOGLE_PRODUCT_ID}:${plan}`,
    environment: sub.testPurchase ? 'test' : 'live',
    raw: { state: sub.subscriptionState, latestOrderId: sub.latestOrderId ?? null, linkedPurchaseToken: sub.linkedPurchaseToken ?? null },
  })
  // A plan change / resubscribe replaces the old token: end its row so only the new one counts
  if (sub.linkedPurchaseToken) {
    const old = await getEntitlementByExternalId(`google:${sub.linkedPurchaseToken}`)
    if (old && old.status !== 'expired') {
      await endRow(old, 'expired')
    }
  }
  if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && (status === 'active' || status === 'trialing')) {
    await acknowledge(GOOGLE_PRODUCT_ID, purchaseToken)
  }
  invalidatePremium(ownerUid)
  return ownerUid
}

async function endRow(row: PremiumEntitlement, status: PremiumStatus) {
  await upsertEntitlement({
    user_uid: row.user_uid,
    email: row.email,
    source: row.source,
    plan: row.plan,
    status,
    current_period_end: new Date().toISOString(),
    cancel_at_period_end: true,
    external_id: row.external_id,
    product_id: row.product_id,
    environment: row.environment,
  })
}

/** Refund / chargeback (voidedPurchaseNotification): Premium off right away. Unknown tokens are ignored. */
export async function revokeGooglePurchase(purchaseToken: string) {
  const row = await getEntitlementByExternalId(`google:${purchaseToken}`)
  if (!row) return
  await endRow(row, 'canceled')
  invalidatePremium(row.user_uid)
}
