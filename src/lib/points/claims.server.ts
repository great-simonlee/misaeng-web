import { listStoredOpenBoardPosts } from '@lib/supabase/community.server'
import type { CommunityPost } from '@/types/nyc'

import { getPointsProfile } from './account.server'
import { getPointsConfig, ruleAmount, ruleCap, ruleThreshold, type PointsConfig } from './config.server'
import { CLAIM_COMPONENTS, claimComponentRuleKey, type ClaimBoard, type ClaimComponent } from './defaults'
import {
  claimBoardFor,
  companyKeyOf,
  detailReportFor,
  earliestTimelineDate,
  foodPhotoCount,
  postBodyText,
  postPlainText,
  roleKeyOf,
} from './detail'
import { PointsError } from './errors'
import { legacyNetEarned } from './legacy.server'
import { clawbackSource, earnPoints } from './ledger.server'
import { notifyPointsClawback, notifyPointsEarned } from './notify.server'
import { enc, pointsRest, PointsStoreError } from './rest.server'
import { maxSimilarity } from './similarity'
import { cycleOf, nyDayStart, nyMonthStart } from './time'

/**
 * Review claims (spec 2.3 / 3.2 / 3.4, without AI prescreen): a post on an earning board creates ONE pending
 * claim with the proposed components; ERP approves (→ ledger 'earn' rows, push), rejects or picks.
 * Anti-farming: verification tier, duplicate combo per cycle, monthly / daily caps, food photo + length,
 * text similarity (claim kept with hold_reason='similar').
 */

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type ComponentAmounts = Partial<Record<ClaimComponent, number>>

export type PointClaim = {
  id: string
  user_id: string
  post_id: string
  board: ClaimBoard
  requested: ComponentAmounts
  components: ComponentAmounts
  checks: Record<string, unknown>
  status: ClaimStatus
  hold_reason: string | null
  dedupe_key: string | null
  cycle: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
}

export type ClaimSkipReason =
  | 'board'
  | 'no_author'
  | 'before_cutover'
  | 'verification'
  | 'monthly_cap'
  | 'daily_cap'
  | 'duplicate'
  | 'no_company'
  | 'food_photo'
  | 'food_length'
  | 'disabled'
  | 'not_pending'

export type ClaimResult =
  | { created: true; claim: PointClaim }
  | { created: false; refreshed?: boolean; claim?: PointClaim; reason: ClaimSkipReason }

const CLAIM_SELECT = 'id,user_id,post_id,board,requested,components,checks,status,hold_reason,dedupe_key,cycle,reviewed_by,reviewed_at,reject_reason,created_at,updated_at'

export async function getClaimByPost(postId: string): Promise<PointClaim | null> {
  const rows = await pointsRest<PointClaim[]>(`point_claims?post_id=eq.${enc(postId)}&select=${CLAIM_SELECT}`)
  return rows?.[0] ?? null
}

export async function getClaim(id: string): Promise<PointClaim | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await pointsRest<PointClaim[]>(`point_claims?id=eq.${enc(id)}&select=${CLAIM_SELECT}`)
  return rows?.[0] ?? null
}

async function countClaims(uid: string, board: ClaimBoard, since: Date): Promise<number> {
  const rows = await pointsRest<{ id: string }[]>(
    `point_claims?user_id=eq.${enc(uid)}&board=eq.${board}&status=in.(pending,approved)` +
      `&created_at=gte.${enc(since.toISOString())}&select=id`,
  )
  return rows?.length ?? 0
}

async function dedupeTaken(key: string, exceptPostId: string): Promise<boolean> {
  const rows = await pointsRest<{ post_id: string }[]>(
    `point_claims?dedupe_key=eq.${enc(key)}&status=in.(pending,approved)&select=post_id`,
  )
  return (rows ?? []).some((r) => r.post_id !== exceptPostId)
}

const STATUS_BOARDS = ['status', 'cpt-opt', 'visa', 'green-card']

/** Is this the first review for its catalog company (no earlier open job-review post for the same companyId)? */
async function isFirstCompanyReview(post: CommunityPost): Promise<boolean> {
  const companyId = String(post.companyId || '').trim()
  if (!companyId) return false // free-text companies don't qualify (too easy to farm)
  const posts = await listStoredOpenBoardPosts('job-review')
  return !posts.some(
    (other) =>
      other.id !== post.id &&
      String(other.companyId || '').trim() === companyId &&
      (other.createdAt < post.createdAt || (other.createdAt === post.createdAt && other.id < post.id)),
  )
}

/**
 * Compared against the same user's posts and the 300 most recent posts on the same board(s)
 * (cached board lists, so a post save never triggers a full Storage listing).
 */
async function similarityOf(post: CommunityPost, board: ClaimBoard) {
  const boardIds = board === 'visa' ? STATUS_BOARDS : [post.categoryId]
  const boards = (await Promise.all(boardIds.map((id) => listStoredOpenBoardPosts(id)))).flat()
  const mine = boards.filter((other) => other.authorUid === post.authorUid)
  const recentBoard = [...boards].sort((a, b) => b.createdAt - a.createdAt).slice(0, 300)
  const seen = new Set<string>([post.id])
  const others: { id: string; text: string }[] = []
  for (const other of [...mine, ...recentBoard]) {
    if (seen.has(other.id)) continue
    seen.add(other.id)
    others.push({ id: other.id, text: postPlainText(other) })
  }
  return maxSimilarity(postPlainText(post), others)
}

/** Proposed amounts and checks for a post (no caps / dedupe here). */
async function proposal(config: PointsConfig, board: ClaimBoard, post: CommunityPost) {
  const requested: ComponentAmounts = {}
  const checks: Record<string, unknown> = {}
  const base = ruleAmount(config, claimComponentRuleKey(board, 'base'))
  if (base > 0) requested.base = base

  const detail = detailReportFor(board, post)
  if (detail) {
    checks.detail = detail
    const amount = ruleAmount(config, claimComponentRuleKey(board, 'detail'))
    if (detail.complete && amount > 0) requested.detail = amount
  }

  if (board === 'interview') {
    const first = await isFirstCompanyReview(post)
    checks.firstCompany = first
    const amount = ruleAmount(config, 'earn.first_company_review')
    if (first && amount > 0) requested.first_company = amount
  }

  const threshold = ruleThreshold(config, 'rule.similarity_threshold')
  let holdReason: string | null = null
  if (threshold !== null) {
    const sim = await similarityOf(post, board)
    checks.similarity = { score: Math.round(sim.score * 1000) / 1000, matchPostId: sim.matchId, thresholdPct: threshold }
    if (sim.score * 100 >= threshold) holdReason = 'similar'
  }
  return { requested, checks, holdReason }
}

function dedupeOf(board: ClaimBoard, post: CommunityPost): { key: string | null; cycle: string | null; error?: ClaimSkipReason } {
  if (board === 'food') return { key: null, cycle: null }
  const cycle = cycleOf(earliestTimelineDate(post) ?? post.createdAt)
  if (board === 'interview') {
    const company = companyKeyOf(post)
    if (!company) return { key: null, cycle, error: 'no_company' }
    return { key: `interview:${post.authorUid}:${company}:${roleKeyOf(post)}:${cycle}`, cycle }
  }
  return { key: `visa:${post.authorUid}:${post.cptOptType ?? 'unknown'}:${cycle}`, cycle }
}

/**
 * Creates the pending claim for a post (or refreshes the proposal of a still-pending one after an edit).
 * `eventAt` = when the post became the user's (createdAt, or the guest-link time); before cutover → nothing.
 */
export async function createOrRefreshClaim(
  post: CommunityPost,
  options: { cutoverMs: number; eventAt?: number },
): Promise<ClaimResult> {
  const board = claimBoardFor(post.categoryId)
  if (!board) return { created: false, reason: 'board' }
  const uid = String(post.authorUid || '').trim()
  if (!uid) return { created: false, reason: 'no_author' }

  const config = await getPointsConfig()
  const existing = await getClaimByPost(post.id)
  if (existing) {
    if (existing.status !== 'pending') return { created: false, claim: existing, reason: 'not_pending' }
    const { requested, checks, holdReason } = await proposal(config, board, post)
    // keep components that only ERP / verification can add
    const merged: ComponentAmounts = { ...requested }
    if (existing.requested.verified) merged.verified = existing.requested.verified
    const rows = await pointsRest<PointClaim[]>(`point_claims?id=eq.${enc(existing.id)}&status=eq.pending`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({
        requested: merged,
        checks,
        hold_reason: holdReason ?? (existing.hold_reason === 'similar' ? null : existing.hold_reason),
        updated_at: new Date().toISOString(),
      }),
    })
    return { created: false, refreshed: true, claim: rows?.[0] ?? existing, reason: 'not_pending' }
  }

  if ((options.eventAt ?? post.createdAt) < options.cutoverMs) return { created: false, reason: 'before_cutover' }
  if (ruleAmount(config, claimComponentRuleKey(board, 'base')) <= 0) return { created: false, reason: 'disabled' }

  const { tier } = await getPointsProfile(uid)
  if (board === 'food' ? tier === 'none' : tier !== 'identity') return { created: false, reason: 'verification' }

  if (board === 'food') {
    const minPhotos = ruleThreshold(config, 'rule.food_min_photos')
    if (minPhotos !== null && foodPhotoCount(post) < minPhotos) return { created: false, reason: 'food_photo' }
    const minChars = ruleThreshold(config, 'rule.food_min_chars')
    if (minChars !== null && [...postBodyText(post)].length < minChars) return { created: false, reason: 'food_length' }
    const cap = ruleCap(config, 'cap.food_daily')
    if (cap !== null && (await countClaims(uid, board, nyDayStart())) >= cap) return { created: false, reason: 'daily_cap' }
  } else {
    const cap = ruleCap(config, board === 'interview' ? 'cap.interview_monthly' : 'cap.visa_monthly')
    if (cap !== null && (await countClaims(uid, board, nyMonthStart())) >= cap) return { created: false, reason: 'monthly_cap' }
  }

  const dedupe = dedupeOf(board, post)
  if (dedupe.error) return { created: false, reason: dedupe.error }
  if (dedupe.key && (await dedupeTaken(dedupe.key, post.id))) return { created: false, reason: 'duplicate' }

  const { requested, checks, holdReason } = await proposal(config, board, post)
  try {
    const rows = await pointsRest<PointClaim[]>('point_claims', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        user_id: uid,
        post_id: post.id,
        board,
        requested,
        checks,
        hold_reason: holdReason,
        dedupe_key: dedupe.key,
        cycle: dedupe.cycle,
      }),
    })
    const claim = rows?.[0]
    if (!claim) throw new Error('Claim insert returned nothing')
    return { created: true, claim }
  } catch (error) {
    // unique violation: same post raced, or the same combo got claimed concurrently
    if (error instanceof PointsStoreError && error.code === '23505') {
      const raced = await getClaimByPost(post.id)
      return raced ? { created: false, claim: raced, reason: 'not_pending' } : { created: false, reason: 'duplicate' }
    }
    throw error
  }
}

// MARK: decisions (ERP)

function componentAmount(config: PointsConfig, claim: PointClaim, component: ClaimComponent): number {
  const requested = claim.requested[component]
  if (typeof requested === 'number' && requested > 0) return requested
  return ruleAmount(config, claimComponentRuleKey(claim.board, component))
}

/** Pays the given components (idempotent per post+component). Returns the amounts newly paid. */
async function payComponents(
  claim: PointClaim,
  components: ClaimComponent[],
  actor: string | null,
): Promise<{ paid: ComponentAmounts; total: number; balance: number }> {
  const config = await getPointsConfig()
  const paid: ComponentAmounts = {}
  let total = 0
  let balance = 0
  for (const component of components) {
    if (typeof claim.components[component] === 'number') continue // already paid
    const amount = componentAmount(config, claim, component)
    if (amount <= 0) continue
    const result = await earnPoints({
      uid: claim.user_id,
      amount,
      reason: `review.${component}`,
      sourceType: 'post',
      sourceId: claim.post_id,
      key: `earn:post:${claim.post_id}:${component}`,
      createdBy: actor,
      note: `claim ${claim.id} (${claim.board})`,
    })
    if (!result.ok) continue
    paid[component] = result.amount
    if (!result.duplicate) total += result.amount
    balance = result.balance
  }
  return { paid, total, balance }
}

async function patchClaim(id: string, patch: Record<string, unknown>): Promise<PointClaim> {
  const rows = await pointsRest<PointClaim[]>(`point_claims?id=eq.${enc(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  })
  const claim = rows?.[0]
  if (!claim) throw new PointsError('Claim not found', 'points.claimNotFound', 404)
  return claim
}

export type ClaimDecision =
  | { action: 'approve'; components?: ClaimComponent[] }
  | { action: 'reject'; reason: string }
  | { action: 'pick' }

export async function decideClaim(claimId: string, decision: ClaimDecision, actor: string | null) {
  const claim = await getClaim(claimId)
  if (!claim) throw new PointsError('Claim not found', 'points.claimNotFound', 404)
  const now = new Date().toISOString()

  if (decision.action === 'reject') {
    if (claim.status !== 'pending') {
      throw new PointsError('Only pending claims can be rejected (use clawback for paid ones)', 'points.claimNotPending', 409)
    }
    return { claim: await patchClaim(claim.id, { status: 'rejected', reject_reason: decision.reason || null, reviewed_by: actor, reviewed_at: now }), paid: {} }
  }

  if (claim.status === 'rejected' || claim.status === 'expired') {
    throw new PointsError('Claim already closed', 'points.claimNotPending', 409)
  }

  const requestedComponents = CLAIM_COMPONENTS.filter((c) => c !== 'pick' && (claim.requested[c] ?? 0) > 0)
  let components: ClaimComponent[] =
    decision.action === 'approve' && decision.components?.length
      ? decision.components.filter((c) => CLAIM_COMPONENTS.includes(c))
      : claim.status === 'approved'
        ? []
        : requestedComponents
  if (decision.action === 'pick') components = [...new Set([...components, 'pick' as const])]

  const { paid, total, balance } = await payComponents(claim, components, actor)
  const updated = await patchClaim(claim.id, {
    status: 'approved',
    components: { ...claim.components, ...paid },
    reviewed_by: claim.reviewed_by ?? actor,
    reviewed_at: claim.reviewed_at ?? now,
    hold_reason: null,
  })
  if (total > 0) notifyPointsEarned(claim.user_id, total, decision.action === 'pick' ? 'review.pick' : 'review.total', balance)
  return { claim: updated, paid }
}

/**
 * Hook for the verification-documents feature (spec ch.5): call when a document for `postId` is approved.
 * Approved claim → pays `verified` now. Pending claim → adds it to the proposal (paid on approval).
 * No claim (capped, duplicate, food, before cutover) → nothing.
 */
export async function addVerifiedComponent(postId: string, actor: string | null) {
  const claim = await getClaimByPost(postId)
  if (!claim) return { applied: false as const, reason: 'no_claim' as const }
  if (claim.board === 'food') return { applied: false as const, reason: 'board' as const }
  const config = await getPointsConfig()
  const amount = ruleAmount(config, claimComponentRuleKey(claim.board, 'verified'))
  if (amount <= 0) return { applied: false as const, reason: 'disabled' as const }

  if (claim.status === 'pending') {
    const updated = await patchClaim(claim.id, { requested: { ...claim.requested, verified: amount } })
    return { applied: true as const, pending: true, claim: updated }
  }
  if (claim.status !== 'approved') return { applied: false as const, reason: 'closed' as const }
  const { paid, total, balance } = await payComponents(claim, ['verified'], actor)
  const updated = await patchClaim(claim.id, { components: { ...claim.components, ...paid } })
  if (total > 0) notifyPointsEarned(claim.user_id, total, 'review.verified', balance)
  return { applied: true as const, pending: false, claim: updated }
}

/** Clawback of everything a post earned (ledger + legacy JSON earnings), and closes a pending claim. */
export async function clawbackPost(input: {
  postId: string
  uid: string
  reason: string
  actor: string | null
  notify: boolean
  /** idempotency key; default = one deletion clawback per post */
  key?: string
}) {
  const claim = await getClaimByPost(input.postId)
  if (claim?.status === 'pending') {
    await patchClaim(claim.id, {
      status: 'rejected',
      reject_reason: input.reason,
      reviewed_by: input.actor,
      reviewed_at: new Date().toISOString(),
    })
  }
  const extraEarned = await legacyNetEarned(input.uid, input.postId, ['food', 'status', 'job-review', 'review-bonus'])
  const result = await clawbackSource({
    uid: input.uid,
    sourceType: 'post',
    sourceId: input.postId,
    key: input.key ?? `clawback:post:${input.postId}`,
    reason: 'clawback.post',
    extraEarned,
    createdBy: input.actor,
    note: input.reason,
  })
  if (input.notify && result.clawedBack > 0 && !result.duplicate) {
    notifyPointsClawback(input.uid, result.clawedBack, result.balance)
  }
  return result
}

/** Claims of a user (for "my reviews" screens). */
export async function listClaimsForUser(uid: string, limit = 50): Promise<PointClaim[]> {
  return (
    (await pointsRest<PointClaim[]>(
      `point_claims?user_id=eq.${enc(uid)}&select=${CLAIM_SELECT}&order=created_at.desc&limit=${Math.min(limit, 200)}`,
    )) ?? []
  )
}
