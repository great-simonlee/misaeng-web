import { CreditsError, db, isMissingTable, rpc } from './creditsCore.server'

/**
 * Ellieo discounts and bonuses (owner 11-25: used actively; credits still come only from payment).
 *   pack_discount     a cheaper credit pack on the web checkout (Stripe). App Store prices can't be changed per member.
 *   purchase_bonus    +percent credits on a purchase (web and App Store); bonus credits carry the purchase's unit value.
 *   listing_discount  fewer credits for a listing plan (applied automatically, the best one wins).
 * Each has a period, a target (everyone / new members / chosen members), per-member and total limits, and an optional
 * code (null = automatic). The ERP edits them; SQL ellieo_promotion_usable() is the one check.
 */

export type PromotionKind = 'pack_discount' | 'purchase_bonus' | 'listing_discount'

export type Promotion = {
  id: string
  kind: PromotionKind
  title: string
  code: string | null
  percent: number
  packIds: string[]
  startsAt: string
  endsAt: string | null
  target: 'all' | 'new' | 'users'
  userIds: string[]
  perUserLimit: number | null
  totalLimit: number | null
  active: boolean
  note: string | null
  createdBy: string | null
  createdAt: string
  uses?: number
}

type Row = {
  id: string; kind: PromotionKind; title: string; code: string | null; percent: number; pack_ids: string[]; starts_at: string
  ends_at: string | null; target: Promotion['target']; user_ids: string[]; per_user_limit: number | null; total_limit: number | null
  active: boolean; note: string | null; created_by: string | null; created_at: string
}

const toPromotion = (r: Row): Promotion => ({
  id: r.id, kind: r.kind, title: r.title, code: r.code, percent: r.percent, packIds: r.pack_ids ?? [], startsAt: r.starts_at,
  endsAt: r.ends_at, target: r.target, userIds: r.user_ids ?? [], perUserLimit: r.per_user_limit, totalLimit: r.total_limit,
  active: r.active, note: r.note, createdBy: r.created_by, createdAt: r.created_at,
})

let cached: { at: number; value: Promotion[] } | null = null

/** Active promotions inside their period (30 s cache). Missing table → none. */
async function livePromotions(): Promise<Promotion[]> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value
  const now = new Date().toISOString()
  const { data, error } = await db()
    .from('ellieo_promotions')
    .select('*')
    .eq('active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .returns<Row[]>()
  if (error && !isMissingTable(error.code)) console.error('Ellieo promotions load error:', error)
  const value = (data ?? []).map(toPromotion)
  cached = { at: Date.now(), value }
  return value
}

async function usable(promo: Promotion, uid: string) {
  if (promo.target === 'users' && !promo.userIds.includes(uid)) return false
  return rpc<boolean>('ellieo_promotion_usable', { p_promo: promo.id, p_user: uid }).catch(() => false)
}

async function best(candidates: Promotion[], uid: string) {
  const sorted = [...candidates].sort((a, b) => b.percent - a.percent)
  for (const promo of sorted) if (await usable(promo, uid)) return promo
  return null
}

const normalizeCode = (code: string | null | undefined) => (code ?? '').trim().toUpperCase().replace(/\s+/g, '') || null

/**
 * Offers for buying one pack. Automatic ones always apply; a code adds the promotion with that code. `appStore`
 * = an App Store purchase: no price discount (only bonus credits).
 */
export async function purchaseOffers(input: { uid: string; packId: string; code?: string | null; appStore?: boolean }) {
  const code = normalizeCode(input.code)
  const live = await livePromotions()
  const forPack = live.filter((p) => p.packIds.length === 0 || p.packIds.includes(input.packId))
  const eligible = (p: Promotion) => p.code === null || (code !== null && p.code === code)
  const discount = input.appStore ? null : await best(forPack.filter((p) => p.kind === 'pack_discount' && eligible(p)), input.uid)
  const bonus = await best(forPack.filter((p) => p.kind === 'purchase_bonus' && eligible(p)), input.uid)
  const codeFound = code === null || [discount, bonus].some((p) => p?.code === code)
  if (code && !codeFound) {
    const exists = live.some((p) => p.code === code && p.kind !== 'listing_discount')
    throw new CreditsError(exists ? 'This code can’t be used for this pack.' : 'This code isn’t valid.', 'INVALID_CODE')
  }
  return { discount, bonus }
}

/** The best automatic listing discount for this member (or null). */
export async function listingDiscount(uid: string) {
  const live = await livePromotions()
  return best(live.filter((p) => p.kind === 'listing_discount' && p.code === null), uid)
}

export function discounted(credits: number, promo: Promotion | null) {
  return promo ? Math.max(0, Math.round((credits * (100 - promo.percent)) / 100)) : credits
}

// MARK: - ERP

export async function listPromotions() {
  const { data, error } = await db().from('ellieo_promotions').select('*').order('created_at', { ascending: false }).limit(300).returns<Row[]>()
  if (error) {
    if (isMissingTable(error.code)) throw new CreditsError('Run credits_paid_only.sql first.', 'SETUP_REQUIRED', 503)
    throw new CreditsError(error.message, 'LOAD_FAILED', 500)
  }
  const promos = (data ?? []).map(toPromotion)
  const { data: uses } = await db().from('ellieo_promotion_uses').select('promotion_id').returns<{ promotion_id: string }[]>()
  const counts = new Map<string, number>()
  for (const u of uses ?? []) counts.set(u.promotion_id, (counts.get(u.promotion_id) ?? 0) + 1)
  return promos.map((p) => ({ ...p, uses: counts.get(p.id) ?? 0 }))
}

const KINDS: PromotionKind[] = ['pack_discount', 'purchase_bonus', 'listing_discount']

/** Create (no id) or update a promotion. */
export async function savePromotion(input: Record<string, unknown>, by: string) {
  const kind = String(input.kind ?? '') as PromotionKind
  const title = String(input.title ?? '').trim()
  const code = normalizeCode(typeof input.code === 'string' ? input.code : null)
  const percent = Number(input.percent)
  const target = String(input.target ?? 'all')
  const startsAt = input.startsAt ? new Date(String(input.startsAt)) : new Date()
  const endsAt = input.endsAt ? new Date(String(input.endsAt)) : null
  const limit = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
  const perUserLimit = limit(input.perUserLimit)
  const totalLimit = limit(input.totalLimit)
  const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split(/[\s,]+/)).map((x) => String(x).trim()).filter(Boolean)
  const problems: string[] = []
  if (!KINDS.includes(kind)) problems.push('type')
  if (title.length < 2 || title.length > 80) problems.push('title (2–80 characters)')
  if (code && !/^[A-Z0-9_-]{3,24}$/.test(code)) problems.push('code (3–24 letters, numbers, - or _)')
  if (code && kind === 'listing_discount') problems.push('code (listing discounts are automatic)')
  if (!Number.isInteger(percent) || percent < 1 || percent > 90) problems.push('percent (1–90)')
  if (!['all', 'new', 'users'].includes(target)) problems.push('target')
  if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) problems.push('period')
  if (perUserLimit !== null && (!Number.isInteger(perUserLimit) || perUserLimit < 1 || perUserLimit > 1000)) problems.push('per-member limit')
  if (totalLimit !== null && (!Number.isInteger(totalLimit) || totalLimit < 1 || totalLimit > 1_000_000)) problems.push('total limit')
  const userIds = list(input.userIds)
  if (target === 'users' && userIds.length === 0) problems.push('members (uids)')
  if (problems.length) throw new CreditsError(`Check: ${problems.join(', ')}.`, 'INVALID')
  const row = {
    kind, title, code, percent, target,
    pack_ids: kind === 'listing_discount' ? [] : list(input.packIds),
    user_ids: target === 'users' ? userIds : [],
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    per_user_limit: perUserLimit,
    total_limit: totalLimit,
    active: input.active !== false,
    note: String(input.note ?? '').trim().slice(0, 200) || null,
    updated_at: new Date().toISOString(),
  }
  const id = typeof input.id === 'string' && /^[0-9a-f-]{36}$/i.test(input.id) ? input.id : null
  const query = id
    ? db().from('ellieo_promotions').update(row as never).eq('id', id)
    : db().from('ellieo_promotions').insert({ ...row, created_by: by } as never)
  const { error } = await query
  if (error) {
    if (error.code === '23505') throw new CreditsError('That code is already used by another promotion.', 'INVALID')
    throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  }
  cached = null
  return listPromotions()
}

export async function setPromotionActive(id: string, active: boolean) {
  const { error } = await db().from('ellieo_promotions').update({ active, updated_at: new Date().toISOString() } as never).eq('id', id)
  if (error) throw new CreditsError(error.message, 'SAVE_FAILED', 500)
  cached = null
  return listPromotions()
}
