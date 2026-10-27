import { htmlToPlainText } from '@lib/community/html'
import { isAnonymousBoard } from '@lib/constants/nyc'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

import {
  earliestAnyVerificationMs,
  earliestIdentityVerificationMs,
  isIdentityVerifiedProfile,
  isProfileCompleteForPoints,
  pointsTierOf,
} from './account.server'
import { getPointsConfig, ruleAmount, ruleCap, ruleThreshold } from './config.server'
import { getCutoverMs } from './engine.server'
import { pointsErrors } from './errors'
import { bindPointIdentity } from './identity.server'
import { legacyBonusesClaimed, legacyNetEarned } from './legacy.server'
import { clawbackSource, earnPoints, getPointsState, type EarnResult } from './ledger.server'
import { notifyPointsEarned } from './notify.server'
import { enc, pointsRest } from './rest.server'
import { nyDate, previousDate } from './time'

/**
 * One-time and activity bonuses on the new ledger (only called by the facade after cutover).
 * Idempotency keys follow the spec: `verify:{uid}:{kind}` for verification rewards.
 */

export type BonusOutcome = { awarded: number; reason?: string; skipped?: string }

function outcome(result: EarnResult | null, skipped?: string): BonusOutcome {
  if (!result) return { awarded: 0, skipped }
  if (!result.ok) return { awarded: 0, skipped: result.capped ? 'cap' : 'failed' }
  return { awarded: result.duplicate ? 0 : result.amount, skipped: result.duplicate ? 'duplicate' : undefined }
}

// MARK: verification

export type VerificationKind = 'school_email' | 'work_email' | 'instagram'

/** Welcome (+earn.verify_first_email): first school OR work verification, once per account. */
async function awardWelcome(uid: string, profile: SupabaseProfileRecord, kind: 'school_email' | 'work_email', identifier?: string | null) {
  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'earn.verify_first_email')
  if (amount <= 0) return outcome(null, 'disabled')
  if (!isIdentityVerifiedProfile(profile)) return outcome(null, 'not_verified')

  // legacy one-time verification bonus already paid → no second welcome
  if ((await legacyBonusesClaimed(uid)).has('school-verify')) return outcome(null, 'legacy_bonus')
  // already identity-verified before the new rules started → not a "first" verification under them
  const cutoverMs = await getCutoverMs()
  const earliest = earliestIdentityVerificationMs(profile)
  if (cutoverMs !== null && earliest !== null && earliest < cutoverMs) return outcome(null, 'verified_before_cutover')

  const email = identifier ?? (kind === 'school_email' ? profile.schoolEmail : profile.workEmail)
  if (!(await bindPointIdentity(kind, email, uid))) return outcome(null, 'identity_taken')

  const result = await earnPoints({
    uid,
    amount,
    reason: 'welcome',
    sourceType: 'verification',
    sourceId: kind,
    key: `verify:${uid}:first_email`,
  })
  if (result.ok && !result.duplicate) notifyPointsEarned(uid, result.amount, 'welcome', result.balance)
  return outcome(result)
}

async function awardInstagram(uid: string, profile: SupabaseProfileRecord, identifier?: string | null) {
  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'earn.verify_instagram')
  if (amount <= 0) return outcome(null, 'disabled')
  if (!profile.instagramVerified) return outcome(null, 'not_verified')
  const cutoverMs = await getCutoverMs()
  const at = typeof profile.instagramReviewedAt === 'number' ? profile.instagramReviewedAt : -Infinity
  if (cutoverMs !== null && at < cutoverMs) return outcome(null, 'verified_before_cutover')
  if (!(await bindPointIdentity('instagram', identifier ?? profile.instagramHandle, uid))) return outcome(null, 'identity_taken')

  const result = await earnPoints({
    uid,
    amount,
    reason: 'verify_instagram',
    sourceType: 'verification',
    sourceId: 'instagram',
    key: `verify:${uid}:instagram`,
  })
  if (result.ok && !result.duplicate) notifyPointsEarned(uid, result.amount, 'verify_instagram', result.balance)
  return outcome(result)
}

/**
 * A verification just completed (school email confirmed, workplace approved, Instagram approved).
 * Pays welcome / instagram, then the referral reward of whoever referred this user, then the profile bonus
 * when this is the user's first verification (so completing the profile before verifying still pays once).
 */
export async function handleVerificationCompleted(uid: string, kind: VerificationKind, identifier?: string | null) {
  const profile = await getSupabaseProfile(uid)
  if (!profile) return { verification: outcome(null, 'no_profile') }
  const verification =
    kind === 'instagram' ? await awardInstagram(uid, profile, identifier) : await awardWelcome(uid, profile, kind, identifier)
  const referral = kind === 'instagram' ? outcome(null, 'instagram_only') : await awardReferral(uid, profile)

  let profileBonus: BonusOutcome = outcome(null, 'not_first_verification')
  const cutoverMs = await getCutoverMs()
  const earliest = earliestAnyVerificationMs(profile)
  if (cutoverMs !== null && earliest !== null && earliest >= cutoverMs) profileBonus = await awardProfileComplete(uid, profile)
  return { verification, referral, profileBonus }
}

// MARK: profile

export async function awardProfileComplete(uid: string, known?: SupabaseProfileRecord | null) {
  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'earn.profile_complete')
  if (amount <= 0) return outcome(null, 'disabled')
  const profile = known ?? (await getSupabaseProfile(uid))
  if (!isProfileCompleteForPoints(profile)) return outcome(null, 'incomplete')
  if (pointsTierOf(profile) === 'none') return outcome(null, 'not_verified')
  const result = await earnPoints({
    uid,
    amount,
    reason: 'profile_complete',
    sourceType: 'profile',
    sourceId: uid,
    key: `earn:profile_complete:${uid}`,
  })
  if (result.ok && !result.duplicate) notifyPointsEarned(uid, result.amount, 'profile_complete', result.balance)
  return outcome(result)
}

// MARK: referral

/**
 * +earn.referral to the referrer once the referred user is school/work verified (Instagram alone doesn't count),
 * only if that first identity verification happened after cutover, at most cap.referral_monthly people a month.
 * A referral already paid by the legacy system (bind-time +10) is not paid again.
 */
export async function awardReferral(referredUid: string, known?: SupabaseProfileRecord | null): Promise<BonusOutcome> {
  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'earn.referral')
  if (amount <= 0) return outcome(null, 'disabled')
  const profile = known ?? (await getSupabaseProfile(referredUid))
  const referrerUid = String(profile?.referredByUid || '').trim()
  if (!referrerUid || referrerUid === referredUid) return outcome(null, 'no_referrer')
  if (!isIdentityVerifiedProfile(profile)) return outcome(null, 'not_verified')

  const cutoverMs = await getCutoverMs()
  const earliest = earliestIdentityVerificationMs(profile)
  if (cutoverMs !== null && earliest !== null && earliest < cutoverMs) return outcome(null, 'verified_before_cutover')
  if ((await legacyNetEarned(referrerUid, `referral:${referredUid}`, ['referral'])) > 0) return outcome(null, 'legacy_paid')

  const referrer = await getSupabaseProfile(referrerUid)
  if (!referrer || referrer.status === 'suspended') return outcome(null, 'referrer_unavailable')

  const cap = ruleCap(config, 'cap.referral_monthly')
  const result = await earnPoints({
    uid: referrerUid,
    amount,
    reason: 'referral',
    sourceType: 'referral',
    sourceId: referredUid,
    key: `earn:referral:${referredUid}`,
    cap: cap === null ? null : { reasons: ['referral'], window: 'month', mode: 'count', limit: cap },
  })
  if (result.ok && !result.duplicate) notifyPointsEarned(referrerUid, result.amount, 'referral', result.balance)
  return outcome(result)
}

// MARK: comments

export async function awardComment(input: {
  uid: string
  commentId: string
  postId: string
  boardId: string | null
  postAuthorUid: string | null
  parentAuthorUid: string | null
  body: string
}): Promise<BonusOutcome> {
  if (input.boardId && isAnonymousBoard(input.boardId)) return outcome(null, 'anonymous')
  if (input.postAuthorUid && input.postAuthorUid === input.uid) return outcome(null, 'own_post')
  if (input.parentAuthorUid && input.parentAuthorUid === input.uid) return outcome(null, 'own_comment')

  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'earn.comment')
  if (amount <= 0) return outcome(null, 'disabled')
  const minChars = ruleThreshold(config, 'rule.comment_min_chars')
  const text = htmlToPlainText(input.body || '').replace(/\s+/g, ' ').trim()
  if (minChars !== null && [...text].length < minChars) return outcome(null, 'too_short')

  const profile = await getSupabaseProfile(input.uid)
  if (pointsTierOf(profile) === 'none') return outcome(null, 'not_verified')

  const cap = ruleCap(config, 'cap.comment_daily')
  return outcome(
    await earnPoints({
      uid: input.uid,
      amount,
      reason: 'comment',
      sourceType: 'comment',
      sourceId: input.commentId,
      key: `earn:comment:${input.commentId}`,
      cap: cap === null ? null : { reasons: ['comment'], window: 'day', mode: 'sum', limit: cap },
      note: `post ${input.postId}`,
    }),
  )
}

/** Comment deleted → take back what it earned (ledger, or legacy JSON if it was credited before cutover). */
export async function clawbackComment(uid: string, commentId: string) {
  const extraEarned = await legacyNetEarned(uid, commentId, ['comment'])
  return clawbackSource({
    uid,
    sourceType: 'comment',
    sourceId: commentId,
    key: `clawback:comment:${commentId}`,
    reason: 'clawback.comment',
    extraEarned,
    note: 'comment deleted',
  })
}

// MARK: check-in

export type CheckinOutcome = {
  date: string
  already: boolean
  streak: number
  earned: number
  streakBonus: number
  capped: boolean
  balance: number
  available: number
}

async function streakEndingOn(uid: string, today: string): Promise<number> {
  const rows = await pointsRest<{ checkin_date: string }[]>(
    `daily_checkins?user_id=eq.${enc(uid)}&checkin_date=lte.${today}&select=checkin_date&order=checkin_date.desc&limit=400`,
  )
  let streak = 0
  let expected = today
  for (const row of rows ?? []) {
    const date = String(row.checkin_date).slice(0, 10)
    if (date !== expected) break
    streak += 1
    expected = previousDate(expected)
  }
  return streak
}

/** Daily check-in (America/New_York day). Basic verification (school/work/instagram) required. */
export async function checkin(uid: string): Promise<CheckinOutcome> {
  const profile = await getSupabaseProfile(uid)
  if (pointsTierOf(profile) === 'none') throw pointsErrors.verificationRequired()
  const config = await getPointsConfig()
  const daily = ruleAmount(config, 'earn.checkin')
  if (daily <= 0) throw pointsErrors.disabled()

  const today = nyDate()
  const inserted = await pointsRest<{ checkin_date: string }[]>('daily_checkins?on_conflict=user_id,checkin_date', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: JSON.stringify({ user_id: uid, checkin_date: today }),
  })
  const streak = await streakEndingOn(uid, today)
  const capLimit = ruleCap(config, 'cap.checkin_monthly')
  const cap = capLimit === null ? null : { reasons: ['checkin', 'checkin_streak7'], window: 'month' as const, mode: 'sum' as const, limit: capLimit }

  // idempotent by date: a retry after a failed earn still pays once
  const day = await earnPoints({ uid, amount: daily, reason: 'checkin', sourceType: 'checkin', sourceId: today, key: `earn:checkin:${uid}:${today}`, cap })
  let streakBonus = 0
  let capped = day.capped
  const bonus = ruleAmount(config, 'earn.checkin_streak7')
  if (bonus > 0 && streak > 0 && streak % 7 === 0) {
    const result = await earnPoints({
      uid,
      amount: bonus,
      reason: 'checkin_streak7',
      sourceType: 'checkin',
      sourceId: today,
      key: `earn:checkin_streak7:${uid}:${today}`,
      cap,
    })
    streakBonus = result.ok && !result.duplicate ? result.amount : 0
    capped = capped || result.capped
  }
  const state = await getPointsState(uid)
  return {
    date: today,
    already: !inserted?.length,
    streak,
    earned: day.ok && !day.duplicate ? day.amount : 0,
    streakBonus,
    capped,
    balance: state.balance,
    available: state.available,
  }
}
