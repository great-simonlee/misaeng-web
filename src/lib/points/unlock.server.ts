import { isStatusCommunityBoard } from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'

import { getPointsConfig, ruleAmount } from './config.server'
import { bindPointIdentity } from './identity.server'
import { unlockPostRpc, type UnlockOutcome } from './ledger.server'
import { enc, pointsRest } from './rest.server'

/**
 * Review unlocks (spec 2.4 / 4.1 / 4.3). Lockable: interview/job ('job-review') and visa/OPT boards.
 * Food (and every other board) is never locked. Order: already unlocked (any method, free-period unlocks stay
 * open for good) → free period (recorded, not counted) → lifetime free quota → spend.review_unlock points.
 */

export function isLockableBoard(categoryId: string): boolean {
  return categoryId === 'job-review' || isStatusCommunityBoard(categoryId)
}

export type UnlockResult =
  | (UnlockOutcome & { required: true })
  | { required: false; unlocked: true; method: 'not_required'; charged: 0; already: false }

export async function unlockPost(input: {
  uid: string
  email: string | null
  post: Pick<CommunityPost, 'id' | 'categoryId' | 'authorUid'>
}): Promise<UnlockResult> {
  if (!isLockableBoard(input.post.categoryId) || input.post.authorUid === input.uid) {
    return { required: false, unlocked: true, method: 'not_required', charged: 0, already: false }
  }
  const config = await getPointsConfig()
  const paywallEnabled = config.settings['paywall.enabled']
  const freeQuota = ruleAmount(config, 'quota.free_unlocks_lifetime')
  // free quota only for the first account of a (Gmail-normalized) sign-up email
  const freeQuotaAllowed =
    paywallEnabled && freeQuota > 0 ? await bindPointIdentity('signup_email', input.email, input.uid) : true
  const outcome = await unlockPostRpc({
    uid: input.uid,
    postId: input.post.id,
    paywallEnabled,
    cost: ruleAmount(config, 'spend.review_unlock'),
    freeQuota,
    freeQuotaAllowed,
  })
  return { ...outcome, required: true }
}

/**
 * Has the user unlocked this post (for body gating once the paywall is on)? Any unlock row counts, including
 * 'free_period' ones: posts opened during the free period stay open permanently (decision 2026-10-26).
 */
export async function hasUnlocked(uid: string, postId: string): Promise<boolean> {
  const rows = await pointsRest<{ method: string }[]>(
    `content_unlocks?user_id=eq.${enc(uid)}&post_id=eq.${enc(postId)}&select=method`,
  )
  return Boolean(rows?.[0]?.method)
}
