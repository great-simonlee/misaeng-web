import { createPrivateKey, sign } from 'node:crypto'

import { invalidatePremium } from './access.server'
import { beneficiaryOfAppleToken, type Beneficiary } from './beneficiary.server'
import { getEntitlementByExternalId, rest, upsertEntitlement, type PremiumPlan, type PremiumStatus } from './entitlements.server'

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
type AppleRenewal = { autoRenewStatus?: number; originalTransactionId?: string; gracePeriodExpiresDate?: number }

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
    // Only "not in this environment" moves on to the next one; a 429 / 5xx is temporary — throw so the app keeps the
    // transaction unfinished and Apple retries the notification (instead of "not found" → purchase lost).
    if (res.status !== 404 && res.status !== 400) {
      throw new AppleIapError(`App Store API is unavailable (HTTP ${res.status}).`, 503)
    }
  }
  return null
}

/**
 * The appAccountToken the app puts on every purchase (premium_apple_accounts): one per Misaeng account, created on
 * first use. Links a purchase to the account that made it, even if the app never got to report it.
 */
const tokenCache = new Map<string, string>()

export async function appAccountTokenFor(uid: string): Promise<string | null> {
  const cached = tokenCache.get(uid)
  if (cached) return cached
  const token = await loadAppAccountToken(uid)
  if (token) tokenCache.set(uid, token)
  return token
}

async function loadAppAccountToken(uid: string): Promise<string | null> {
  const read = async () => {
    const res = await rest(`premium_apple_accounts?select=token&user_uid=eq.${encodeURIComponent(uid)}&limit=1`)
    if (!res.ok) return null
    return ((await res.json()) as { token: string }[])[0]?.token ?? null
  }
  const existing = await read()
  if (existing) return existing
  await rest('premium_apple_accounts?on_conflict=user_uid', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify({ user_uid: uid }),
  })
  return read()
}

async function ownerOfToken(token: string | undefined): Promise<string | null> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null
  const res = await rest(`premium_apple_accounts?select=user_uid&token=eq.${encodeURIComponent(token.toLowerCase())}&limit=1`)
  if (!res.ok) return null
  return ((await res.json()) as { user_uid: string }[])[0]?.user_uid ?? null
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
    // Who made the latest purchase on this subscription (the app sets our appAccountToken on every purchase). A
    // beneficiary token (parent buying for a child) names the child as owner and the parent as payer.
    const selfBuyer = await ownerOfToken(tx.appAccountToken)
    const buyer: Beneficiary | { userUid: string; payerUid: null } | null = selfBuyer
      ? { userUid: selfBuyer, payerUid: null }
      : await beneficiaryOfAppleToken(tx.appAccountToken)
    // The reporting account may be the owner, or the parent who paid (purchase / restore on the parent's phone).
    const mayReport = (b: { userUid: string; payerUid: string | null }) => b.userUid === uid || b.payerUid === uid
    // One App Store subscription belongs to one Misaeng account. It moves only when the latest purchase was made from
    // the requesting account (e.g. the old account was deleted and this one bought again).
    if (uid && buyer && !mayReport(buyer)) {
      throw new AppleIapError('This App Store subscription is linked to another Misaeng account.', 409)
    }
    if (uid && existing && existing.user_uid !== uid && existing.payer_uid !== uid && !(buyer && mayReport(buyer))) {
      throw new AppleIapError('This App Store subscription is linked to another Misaeng account.', 409)
    }
    let payerUid: string | null | undefined
    if (buyer?.payerUid) {
      ownerUid = buyer.userUid
      payerUid = buyer.payerUid
    } else if (uid && !buyer && existing?.payer_uid === uid) {
      // The parent restored an older parent-paid purchase: it stays the child's.
      ownerUid = existing.user_uid
      payerUid = uid
    } else {
      // Server notification for a purchase the app never reported: the token says whose it is.
      ownerUid = uid ?? existing?.user_uid ?? buyer?.userUid ?? null
      // The member bought it themselves this time: no longer parent-paid.
      payerUid = buyer && existing?.payer_uid ? null : undefined
    }
    if (!ownerUid) continue
    const status = statusFrom(code, tx)
    // Billing grace (status 4): Apple keeps access until gracePeriodExpiresDate; retry without grace (3): 3 days.
    const periodEnd =
      code === 4 && renewal.gracePeriodExpiresDate
        ? renewal.gracePeriodExpiresDate
        : code === 3 && tx.expiresDate
          ? tx.expiresDate + 3 * 86_400_000
          : tx.expiresDate
    await upsertEntitlement({
      user_uid: ownerUid,
      ...(payerUid !== undefined ? { payer_uid: payerUid } : {}),
      // A parent's purchase: the row keeps the child's email, never the reporting parent's.
      email: (payerUid ? null : email) ?? existing?.email ?? null,
      source: 'apple',
      plan: PRODUCT_PLANS[tx.productId!],
      status,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      cancel_at_period_end: renewal.autoRenewStatus === 0,
      external_id: `apple:${originalId}`,
      product_id: tx.productId ?? null,
      environment: found.env,
      raw: { status: code, transactionId: tx.transactionId, appAccountToken: tx.appAccountToken ?? null },
    })
    invalidatePremium(ownerUid)
    if (payerUid) invalidatePremium(payerUid)
    if (existing?.payer_uid) invalidatePremium(existing.payer_uid)
  }
  return ownerUid
}
