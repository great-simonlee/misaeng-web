import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { CreditsError, db, isMissingTable, rpc } from './creditsCore.server'

/**
 * Misaeng in-house accounts (owner 11-25). A member whose VERIFIED email (sign-in email, school email or work email) is
 * on the in-house domain list (default misaeng.com) and not on the exception list is in-house:
 *   - staff credits only: every month (America/New_York) what is left of last month's is replaced with this month's
 *     amount (default 1000); $0 value, never refundable, never transferable, never revenue
 *   - can't buy credits (Stripe Checkout and the App Store sheet are refused; Top up is hidden in the app)
 *   - in-house listings hold at most `boostSlots` (default 1) of the Boost spots
 *   - Licensed Agent approval is still needed for brokered listings
 * The ERP edits the lists and amounts, tops up staff credits, and removes people who leave (staff credits → 0 and all
 * their listings deleted) or excludes test accounts (staff credits → 0, listings kept). Removed / excluded members stay
 * that way until the ERP adds them again.
 */

export type InHouseConfig = { domains: string[]; exceptions: string[]; monthlyCredits: number; boostSlots: number }

export const DEFAULT_IN_HOUSE_CONFIG: InHouseConfig = {
  domains: ['misaeng.com'],
  exceptions: ['simon+misaeng-qa@misaeng.com'],
  monthlyCredits: 1000,
  boostSlots: 1,
}

const DOMAIN = /^[a-z0-9.-]+\.[a-z]{2,}$/
const EMAIL = /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/

function validConfig(v: unknown): v is InHouseConfig {
  const c = v as InHouseConfig | null
  return Boolean(
    c &&
      Array.isArray(c.domains) && c.domains.length <= 20 && c.domains.every((d) => typeof d === 'string' && DOMAIN.test(d)) &&
      Array.isArray(c.exceptions) && c.exceptions.length <= 200 &&
      c.exceptions.every((e) => typeof e === 'string' && (EMAIL.test(e) || /^[0-9a-f-]{36}$/i.test(e))) &&
      Number.isInteger(c.monthlyCredits) && c.monthlyCredits >= 0 && c.monthlyCredits <= 1_000_000 &&
      Number.isInteger(c.boostSlots) && c.boostSlots >= 0 && c.boostSlots <= 50,
  )
}

let cachedConfig: { at: number; value: InHouseConfig } | null = null

export async function getInHouseConfig(): Promise<InHouseConfig> {
  if (cachedConfig && Date.now() - cachedConfig.at < 30_000) return cachedConfig.value
  const { data } = await db().from('misaeng_settings').select('value').eq('key', 'in_house').maybeSingle<{ value: InHouseConfig }>()
  const value = validConfig(data?.value) ? data!.value : DEFAULT_IN_HOUSE_CONFIG
  cachedConfig = { at: Date.now(), value }
  return value
}

export async function saveInHouseConfig(input: unknown, by: string) {
  const raw = (input ?? {}) as Partial<InHouseConfig>
  const value: InHouseConfig = {
    domains: [...new Set((raw.domains ?? []).map((d) => String(d).trim().toLowerCase().replace(/^@/, '')).filter(Boolean))],
    exceptions: [...new Set((raw.exceptions ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))],
    monthlyCredits: Number(raw.monthlyCredits),
    boostSlots: Number(raw.boostSlots),
  }
  if (!validConfig(value)) {
    throw new CreditsError('In-house settings are not valid (domains like misaeng.com, emails or uids, whole numbers).', 'INVALID')
  }
  const { error } = await db()
    .from('misaeng_settings')
    .upsert({ key: 'in_house', value, updated_at: new Date().toISOString(), updated_by: by } as never, { onConflict: 'key' })
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  cachedConfig = null
  statusCache.clear()
  return getInHouseConfig()
}

/** Verified emails of a member: sign-in email (confirmed), verified school email, verified work email. */
export async function verifiedEmails(uid: string): Promise<string[]> {
  const out = new Set<string>()
  const { adminGetUser } = await import('@lib/auth/supabaseAuth.server')
  const [user, profile] = await Promise.all([adminGetUser(uid).catch(() => null), getSupabaseProfile(uid).catch(() => null)])
  if (user?.email && user.emailConfirmed) out.add(user.email.toLowerCase())
  if (profile?.schoolEmail && profile.schoolEmailVerified) out.add(profile.schoolEmail.toLowerCase())
  if (profile?.workEmail && profile.workEmailVerified) out.add(profile.workEmail.toLowerCase())
  return [...out]
}

export function qualifies(emails: string[], uid: string, config: InHouseConfig): string | null {
  const exceptions = new Set(config.exceptions.map((e) => e.toLowerCase()))
  if (exceptions.has(uid.toLowerCase()) || emails.some((e) => exceptions.has(e))) return null
  const domains = new Set(config.domains.map((d) => d.toLowerCase()))
  return emails.find((e) => domains.has(e.split('@')[1] ?? '')) ?? null
}

type Row = { user_id: string; email: string; status: 'active' | 'removed'; source: string; last_grant_month: string | null; created_at: string; removed_at: string | null; removed_by: string | null; removed_note: string | null }

const statusCache = new Map<string, { at: number; inHouse: boolean }>()

/**
 * Is this member in-house? First time a qualifying member is seen they are added (and get this month's staff credits);
 * an active member is topped to this month's amount when a new month starts (the daily job does it too). 60 s cache.
 */
export async function isInHouse(uid: string): Promise<boolean> {
  const hit = statusCache.get(uid)
  if (hit && Date.now() - hit.at < 60_000) return hit.inHouse
  let inHouse = false
  const { data: row, error } = await db().from('misaeng_in_house').select('status').eq('user_id', uid).maybeSingle<{ status: string }>()
  if (error) {
    if (isMissingTable(error.code)) return false
    throw new CreditsError(error.message, 'LOAD_FAILED', 500)
  }
  if (row?.status === 'removed') {
    inHouse = false
  } else if (row?.status === 'active') {
    inHouse = (await rpc<string>('misaeng_in_house_sync', { p_user: uid, p_email: '' }).catch(() => 'active')) === 'active'
  } else {
    const email = qualifies(await verifiedEmails(uid), uid, await getInHouseConfig())
    if (email) inHouse = (await rpc<string>('misaeng_in_house_sync', { p_user: uid, p_email: email })) === 'active'
  }
  statusCache.set(uid, { at: Date.now(), inHouse })
  return inHouse
}

export function forgetInHouse(uid: string) {
  statusCache.delete(uid)
}

// MARK: - ERP

export async function listInHouse() {
  const { data, error } = await db()
    .from('misaeng_in_house')
    .select('*')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<Row[]>()
  if (error) {
    if (isMissingTable(error.code)) throw new CreditsError('Run credits_paid_only.sql first.', 'SETUP_REQUIRED', 503)
    throw new CreditsError(error.message, 'LOAD_FAILED', 500)
  }
  const rows = data ?? []
  const balances = await Promise.all(
    rows.map((row) =>
      row.status === 'active'
        ? rpc<{ staff: number }[]>('misaeng_credit_balance', { p_user: row.user_id }).then((r) => Number(r?.[0]?.staff) || 0).catch(() => 0)
        : Promise.resolve(0),
    ),
  )
  return rows.map((row, i) => ({
    uid: row.user_id,
    email: row.email,
    status: row.status,
    source: row.source,
    lastGrantMonth: row.last_grant_month,
    since: row.created_at,
    removedAt: row.removed_at,
    removedBy: row.removed_by,
    removedNote: row.removed_note,
    staffCredits: balances[i],
  }))
}

/** ERP: add by email or uid (works for members who don't qualify by domain, too). */
export async function addInHouse(input: { uid: string; email: string; by: string }) {
  await rpc('misaeng_in_house_add', { p_user: input.uid, p_email: input.email || input.uid, p_by: input.by })
  forgetInHouse(input.uid)
}

/** ERP: someone left — staff credits → 0 and every listing they posted is deleted. */
export async function removeInHouse(input: { uid: string; note: string; by: string }) {
  if (input.note.trim().length < 3) throw new CreditsError('Add a note (why they are removed).', 'NOTE_REQUIRED')
  const result = await rpc<{ staffCreditsRemoved: number; listingsDeleted: number }>('misaeng_in_house_remove', {
    p_user: input.uid, p_note: input.note.trim(), p_by: input.by,
  })
  forgetInHouse(input.uid)
  return result
}

/** ERP: a test account on the in-house domain — staff credits → 0, listings kept, can buy again. */
export async function excludeInHouse(input: { uid: string; note: string; by: string }) {
  const result = await rpc<{ staffCreditsRemoved: number }>('misaeng_in_house_exclude', {
    p_user: input.uid, p_note: input.note.trim(), p_by: input.by,
  })
  forgetInHouse(input.uid)
  return result
}

/** ERP (Super Admin): extra staff credits for this month. */
export async function topUpStaffCredits(input: { uid: string; amount: number; note: string; by: string }) {
  if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > 1_000_000) {
    throw new CreditsError('Enter a whole number of credits (1–1,000,000).', 'INVALID_AMOUNT')
  }
  if (input.note.trim().length < 3) throw new CreditsError('Add a note (who it is for and why).', 'NOTE_REQUIRED')
  await rpc('misaeng_staff_topup', { p_user: input.uid, p_amount: input.amount, p_note: input.note.trim(), p_by: input.by })
}
