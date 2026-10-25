import { COMMUNITY_CREDIT_REFERRAL_MAX } from '@lib/constants/communityCredit'
import { ApiMessageError } from '@lib/i18n/apiError'
import {
  createReferralCode,
  isValidReferralCode,
  normalizeReferralCode,
} from '@lib/community/referral'
import {
  getSupabaseProfile,
  upsertSupabaseProfile,
} from '@lib/supabase/profile.server'
import {
  getReferralIndex,
  saveReferralIndex,
} from '@lib/supabase/referral.server'

export async function ensureUserReferralCode(uid: string): Promise<string> {
  const userId = String(uid || '').trim()
  if (!userId) throw new ApiMessageError('Login required', 'common.loginRequired')

  const profile = await getSupabaseProfile(userId)
  const existing = normalizeReferralCode(profile?.referralCode)
  if (isValidReferralCode(existing)) {
    const indexed = await getReferralIndex(existing)
    if (!indexed) {
      await saveReferralIndex({
        code: existing,
        uid: userId,
        createdAt: Date.now(),
        referredUids: [],
      })
    }
    return existing
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createReferralCode()
    const taken = await getReferralIndex(code)
    if (taken) continue
    await saveReferralIndex({
      code,
      uid: userId,
      createdAt: Date.now(),
      referredUids: [],
    })
    await upsertSupabaseProfile(userId, { referralCode: code })
    return code
  }

  throw new ApiMessageError('Could not allocate a referral code', 'referral.codeCreateFailed')
}

export async function bindUserReferrer(args: {
  uid: string
  code: string
}): Promise<{
  referredByCode: string
  referredByUid: string
  usedCount: number
}> {
  const userId = String(args.uid || '').trim()
  const code = normalizeReferralCode(args.code)
  if (!userId) throw new ApiMessageError('Login required', 'common.loginRequired')
  if (!isValidReferralCode(code)) {
    throw new ApiMessageError('Invalid referral code format', 'referral.codeInvalid')
  }

  const profile = await getSupabaseProfile(userId)
  if (profile?.referredByUid) {
    throw new ApiMessageError('Referrer already bound', 'referral.alreadyBound')
  }

  const ownCode = normalizeReferralCode(profile?.referralCode)
  if (ownCode && ownCode === code) {
    throw new ApiMessageError('Cannot use own referral code', 'referral.ownCode')
  }

  const indexed = await getReferralIndex(code)
  if (!indexed) {
    throw new ApiMessageError('Referral code not found', 'referral.codeNotFound')
  }
  if (indexed.uid === userId) {
    throw new ApiMessageError('Cannot use own referral code', 'referral.ownCode')
  }

  const referrer = await getSupabaseProfile(indexed.uid)
  if (!referrer) {
    throw new ApiMessageError('Referrer profile not found', 'referral.referrerNotFound')
  }

  const referredUids = indexed.referredUids.filter((id) => id !== userId)
  if (referredUids.length >= COMMUNITY_CREDIT_REFERRAL_MAX) {
    throw new ApiMessageError('Referral code use limit reached', 'referral.maxUsesReached', {
      max: COMMUNITY_CREDIT_REFERRAL_MAX,
    })
  }

  const nextReferredUids = [...referredUids, userId]
  await saveReferralIndex({
    ...indexed,
    referredUids: nextReferredUids,
  })

  await upsertSupabaseProfile(userId, {
    referredByUid: indexed.uid,
    referredByCode: indexed.code,
    referredAt: Date.now(),
  })

  const { awardReferralBindCredit } = await import('@lib/community/creditLedger')
  await awardReferralBindCredit({
    referrerUid: indexed.uid,
    referredUid: userId,
  })

  return {
    referredByCode: indexed.code,
    referredByUid: indexed.uid,
    usedCount: nextReferredUids.length,
  }
}

export async function getUserReferrerUid(
  uid: string,
): Promise<string | null> {
  const profile = await getSupabaseProfile(uid)
  const referrerUid = String(profile?.referredByUid || '').trim()
  if (!referrerUid || referrerUid === uid) return null
  return referrerUid
}

export async function getReferralUseCount(uid: string): Promise<number> {
  const profile = await getSupabaseProfile(uid)
  const code = normalizeReferralCode(profile?.referralCode)
  if (!isValidReferralCode(code)) return 0
  const indexed = await getReferralIndex(code)
  return indexed?.referredUids.length ?? 0
}
