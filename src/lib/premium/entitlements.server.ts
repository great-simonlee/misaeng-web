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
  raw?: unknown
}

const COLUMNS =
  'id,user_uid,email,source,plan,status,current_period_end,cancel_at_period_end,external_id,customer_id,product_id,environment,created_at,updated_at'

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

/** Every row for a user, newest first. Empty when the table is missing (not set up yet). */
export async function listEntitlements(uid: string): Promise<PremiumEntitlement[]> {
  if (!config()) return []
  const res = await rest(
    `premium_entitlements?select=${COLUMNS}&user_uid=eq.${encodeURIComponent(uid)}&order=updated_at.desc`,
  )
  if (!res.ok) return []
  return (await res.json()) as PremiumEntitlement[]
}

export async function getEntitlementByExternalId(externalId: string): Promise<PremiumEntitlement | null> {
  if (!config()) return null
  const res = await rest(
    `premium_entitlements?select=${COLUMNS}&external_id=eq.${encodeURIComponent(externalId)}&limit=1`,
  )
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
