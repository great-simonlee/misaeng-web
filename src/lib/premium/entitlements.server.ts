/**
 * premium_entitlements (supabase/premium.sql): one row per subscription or grant. Only the server writes it
 * (Stripe webhook, App Store verification / notifications). Raw PostgREST with the service role key, like the other
 * misaeng-web storage helpers.
 */

export type PremiumSource = 'stripe' | 'apple' | 'google' | 'code' | 'gift' | 'staff'
export type PremiumPlan = 'monthly' | 'season' | 'annual' | 'code' | 'gift'
export type PremiumStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'

export type PremiumEntitlement = {
  id: string
  user_uid: string
  email: string | null
  source: PremiumSource
  plan: PremiumPlan
  status: PremiumStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  external_id: string
  customer_id: string | null
  product_id: string | null
  environment: string | null
  /** The parent who pays for this member's Premium (supabase/parent_links.sql); null = the member paid themselves. */
  payer_uid?: string | null
  created_at: string
  updated_at: string
}

export type EntitlementUpsert = {
  user_uid: string
  email?: string | null
  source: PremiumSource
  plan: PremiumPlan
  status: PremiumStatus
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  external_id: string
  customer_id?: string | null
  product_id?: string | null
  environment?: string | null
  /** Only sent for parent-paid rows (so self purchases keep saving before parent_links.sql ran). */
  payer_uid?: string | null
  raw?: unknown
}

const BASE_COLUMNS =
  'id,user_uid,email,source,plan,status,current_period_end,cancel_at_period_end,external_id,customer_id,product_id,environment,created_at,updated_at'
const COLUMNS = `${BASE_COLUMNS},payer_uid`

/**
 * payer_uid arrives with supabase/parent_links.sql. Until it ran, reads fall back to the old columns (re-checked every
 * 5 minutes) so Premium never looks "unknown" because of a migration order.
 */
let noPayerColumnUntil = 0
export function payerColumnReady() {
  return Date.now() >= noPayerColumnUntil
}

/** premium_entitlements rows (all columns, payer_uid once parent_links.sql ran) for a PostgREST filter. */
export async function selectRows(filter: string): Promise<Response> {
  if (payerColumnReady()) {
    const res = await rest(`premium_entitlements?select=${COLUMNS}&${filter}`)
    if (res.ok || res.status !== 400) return res
    const body = await res.clone().text().catch(() => '')
    if (!body.includes('payer_uid')) return res
    noPayerColumnUntil = Date.now() + 5 * 60_000
  }
  return rest(`premium_entitlements?select=${BASE_COLUMNS}&${filter.replace(/,payer_uid\.eq\.[^,)&]*/g, '')}`)
}

export function premiumDbConfigured() {
  return Boolean(config())
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

/** Raw PostgREST call with the service role key (also used by codes / refunds). */
export async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const c = config()
  if (!c) throw new Error('Supabase is not configured.')
  const headers: Record<string, string> = {
    apikey: c.key,
    Authorization: `Bearer ${c.key}`,
    'Content-Type': 'application/json',
  }
  if (init.prefer) headers.Prefer = init.prefer
  return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers, cache: 'no-store' })
}

/**
 * Every row for a user, newest first. Empty when Supabase isn't configured; THROWS when the read fails, so a database
 * hiccup never makes a paying member look free (and get offered a second trial).
 */
export async function listEntitlements(uid: string): Promise<PremiumEntitlement[]> {
  if (!config()) return []
  const res = await selectRows(`user_uid=eq.${encodeURIComponent(uid)}&order=updated_at.desc`)
  if (!res.ok) throw new Error(`Reading premium_entitlements failed (HTTP ${res.status}).`)
  return (await res.json()) as PremiumEntitlement[]
}

/** Rows this member pays for as a parent (user_uid = a child). Empty before parent_links.sql ran. Throws on errors. */
export async function listPaidByPayer(payerUid: string): Promise<PremiumEntitlement[]> {
  if (!config() || !payerColumnReady()) return []
  const res = await rest(
    `premium_entitlements?select=${COLUMNS}&payer_uid=eq.${encodeURIComponent(payerUid)}&order=updated_at.desc`,
  )
  if (res.status === 400) return []
  if (!res.ok) throw new Error(`Reading premium_entitlements failed (HTTP ${res.status}).`)
  return (await res.json()) as PremiumEntitlement[]
}

export async function getEntitlementById(id: string): Promise<PremiumEntitlement | null> {
  if (!config() || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const res = await selectRows(`id=eq.${encodeURIComponent(id)}&limit=1`)
  if (!res.ok) return null
  return ((await res.json()) as PremiumEntitlement[])[0] ?? null
}

export async function getEntitlementByExternalId(externalId: string): Promise<PremiumEntitlement | null> {
  if (!config()) return null
  const res = await selectRows(`external_id=eq.${encodeURIComponent(externalId)}&limit=1`)
  if (!res.ok) return null
  const rows = (await res.json()) as PremiumEntitlement[]
  return rows[0] ?? null
}

/** Insert or update by external_id (subscription id / originalTransactionId). */
export async function upsertEntitlement(row: EntitlementUpsert): Promise<void> {
  const res = await rest('premium_entitlements?on_conflict=external_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Saving the entitlement failed (HTTP ${res.status}).`)
}
