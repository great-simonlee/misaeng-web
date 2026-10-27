import { getPointsConfig, ruleAmount, ruleCap, ruleThreshold } from './config.server'
import { pointsErrors, PointsError } from './errors'
import { ensureLegacyOpening } from './legacy.server'
import { getPointsState } from './ledger.server'
import { nyMonthStart } from './time'
import { enc, inList, pointsRest, pointsRpc, type PointsRpcResult } from './rest.server'

/**
 * Roommate / sublet post boost: spend.housing_post_boost points pin the post for rule.housing_boost_days.
 * Limits (all ERP-editable): one boost at a time per post, rule.housing_boost_cooldown_days after it ends before the
 * same post again, cap.housing_boost_monthly per user, cap.housing_boost_active running boosts per board + city.
 * Stored in `point_post_boosts` (not in the post JSON, which the post normalizer would drop on the next edit).
 * List ordering: src/app/api/community/route.ts pins posts with an active boost.
 */

export const BOOSTABLE_BOARDS = new Set(['roommate'])

type BoostRules = { cost: number; days: number; cooldownDays: number; monthlyCap: number | null; maxActive: number | null }

async function boostRules(): Promise<BoostRules> {
  const config = await getPointsConfig()
  return {
    cost: ruleAmount(config, 'spend.housing_post_boost'),
    days: ruleThreshold(config, 'rule.housing_boost_days') ?? 7,
    cooldownDays: ruleThreshold(config, 'rule.housing_boost_cooldown_days') ?? 0,
    monthlyCap: ruleCap(config, 'cap.housing_boost_monthly'),
    maxActive: ruleCap(config, 'cap.housing_boost_active'),
  }
}

type BoostRpcResult = PointsRpcResult & { boosted_until?: string; available_at?: string; next_free_at?: string; max?: number }

export async function boostPost(input: { uid: string; postId: string; boardId: string; city: string | null; requestKey?: string | null }) {
  if (!BOOSTABLE_BOARDS.has(input.boardId)) {
    throw new PointsError('Only roommate/sublet posts can be boosted', 'points.boost.notAllowed', 400, undefined, 'BOOST_NOT_ALLOWED')
  }
  const rules = await boostRules()
  if (rules.cost <= 0 || rules.days <= 0) throw pointsErrors.disabled()

  await ensureLegacyOpening(input.uid)
  const current = await getBoostedUntil(input.postId)
  // same last end → same key: a double tap charges once; the next boost (after cooldown) gets a new key
  const key = `boost:${input.postId}:${input.requestKey?.trim() || current || 'none'}`
  const result = await pointsRpc<BoostRpcResult>('boost_post', {
    p_user_id: input.uid,
    p_post_id: input.postId,
    p_board: input.boardId,
    p_city: input.city,
    p_cost: rules.cost,
    p_days: rules.days,
    p_cooldown_days: rules.cooldownDays,
    p_monthly_cap: rules.monthlyCap ?? 0,
    p_max_active: rules.maxActive ?? 0,
    p_idempotency_key: key,
  })
  if (!result?.ok) throw boostError(result, rules)
  return {
    boostedUntil: String(result.boosted_until),
    charged: result.duplicate ? 0 : rules.cost,
    duplicate: Boolean(result.duplicate),
    balance: result.balance ?? 0,
    available: result.available ?? 0,
  }
}

function boostError(result: BoostRpcResult | null | undefined, rules: BoostRules): Error {
  switch (result?.error) {
    case 'insufficient':
      return pointsErrors.insufficient(result.required ?? rules.cost, result.available ?? 0)
    case 'disabled':
      return pointsErrors.disabled()
    case 'active':
      return new PointsError('Already boosted', 'points.boost.active', 409, { date: shortDate(result.boosted_until) }, 'BOOST_ACTIVE')
    case 'cooldown':
      return new PointsError('Boost cooldown', 'points.boost.cooldown', 409, { date: shortDate(result.available_at) }, 'BOOST_COOLDOWN')
    case 'monthly_cap':
      return new PointsError('Monthly boost limit', 'points.boost.monthlyCap', 409, { max: result.max ?? rules.monthlyCap ?? 0 }, 'BOOST_MONTHLY_CAP')
    case 'slots_full':
      return new PointsError('All boost slots taken', 'points.boost.slotsFull', 409, { date: shortDate(result.next_free_at) }, 'BOOST_SLOTS_FULL')
    default:
      return new Error(`boost_post failed: ${result?.error ?? 'unknown'}`)
  }
}

/** "11/2" in New York time — the same in every language, so error messages can show it as is. */
function shortDate(iso: string | undefined): string {
  const date = iso ? new Date(iso) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'numeric', day: 'numeric' }).format(date)
}

export type BoostBlock = 'active' | 'cooldown' | 'monthly_cap' | 'slots_full' | 'insufficient' | 'disabled' | null

/**
 * What the author's "boost" button should show (GET /api/community/{id}/boost). Read-only; the RPC re-checks
 * everything under a lock, so this can be slightly stale.
 */
export async function getBoostStatus(input: { uid: string | null; postId: string; boardId: string; city: string | null }) {
  const rules = await boostRules()
  const now = Date.now()
  const lastEnd = await getBoostedUntil(input.postId)
  const active = Boolean(lastEnd && Date.parse(lastEnd) > now)
  const status = {
    cost: rules.cost,
    days: rules.days,
    cooldownDays: rules.cooldownDays,
    boostedUntil: active ? lastEnd : null,
    active,
    block: null as BoostBlock,
    /** cooldown → when the same post can be boosted again; slots_full → when the first slot frees */
    availableAt: null as string | null,
    monthlyCap: rules.monthlyCap,
    monthlyUsed: 0,
    slotsTotal: rules.maxActive,
    slotsUsed: 0,
    available: null as number | null,
  }
  if (rules.cost <= 0 || rules.days <= 0) return { ...status, block: 'disabled' as BoostBlock }

  const running = await pointsRest<{ boosted_until: string }[]>(
    `point_post_boosts?board=eq.${enc(input.boardId)}&city=${input.city ? `eq.${enc(input.city)}` : 'is.null'}` +
      `&boosted_until=gt.${enc(new Date(now).toISOString())}&select=boosted_until&order=boosted_until.asc`,
  )
  status.slotsUsed = running?.length ?? 0

  if (input.uid) {
    const monthStart = nyMonthStart(now).toISOString()
    const mine = await pointsRest<{ id: string }[]>(
      `point_post_boosts?user_id=eq.${enc(input.uid)}&created_at=gte.${enc(monthStart)}&select=id`,
    )
    status.monthlyUsed = mine?.length ?? 0
    const state = await getPointsState(input.uid).catch(() => null)
    status.available = state?.available ?? null
  }

  if (active) return { ...status, block: 'active' as BoostBlock }
  if (lastEnd && rules.cooldownDays > 0) {
    const until = Date.parse(lastEnd) + rules.cooldownDays * 86_400_000
    if (until > now) return { ...status, block: 'cooldown' as BoostBlock, availableAt: new Date(until).toISOString() }
  }
  if (rules.monthlyCap !== null && rules.monthlyCap > 0 && status.monthlyUsed >= rules.monthlyCap) {
    return { ...status, block: 'monthly_cap' as BoostBlock }
  }
  if (rules.maxActive !== null && rules.maxActive > 0 && status.slotsUsed >= rules.maxActive) {
    return { ...status, block: 'slots_full' as BoostBlock, availableAt: running?.[0]?.boosted_until ?? null }
  }
  if (status.available !== null && status.available < rules.cost) return { ...status, block: 'insufficient' as BoostBlock }
  return status
}


/**
 * The post was deleted: end its running boost now so the slot frees for others. No refund (owner decision,
 * 2026-10-26: deleting or finishing the deal never gives the points back).
 */
export async function endPostBoost(postId: string): Promise<void> {
  const now = new Date().toISOString()
  await pointsRest(`point_post_boosts?post_id=eq.${enc(postId)}&boosted_until=gt.${enc(now)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ boosted_until: now }),
  })
}

/** Current boost end (ISO) of a post, or null. */
export async function getBoostedUntil(postId: string): Promise<string | null> {
  const rows = await pointsRest<{ boosted_until: string }[]>(
    `point_post_boosts?post_id=eq.${enc(postId)}&select=boosted_until&order=boosted_until.desc&limit=1`,
  )
  return rows?.[0]?.boosted_until ?? null
}

/**
 * Active boosts for list ordering: postId → boostedUntil (ISO), only boosts still running.
 * Returns an empty map when the points tables are missing (lists must keep working).
 */
export async function getActiveBoosts(postIds?: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  try {
    const now = new Date().toISOString()
    const filter = postIds?.length ? `&post_id=in.${enc(inList(postIds))}` : ''
    const rows = await pointsRest<{ post_id: string; boosted_until: string }[]>(
      `point_post_boosts?boosted_until=gt.${enc(now)}${filter}&select=post_id,boosted_until&order=boosted_until.desc`,
    )
    for (const row of rows ?? []) if (!out.has(row.post_id)) out.set(row.post_id, row.boosted_until)
  } catch {
    // tables not set up or unreachable → no boosts
  }
  return out
}
