import { COMMUNITY_CREDIT_REFERRAL_MAX } from '@lib/constants/communityCredit'
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
  if (!userId) throw new Error('로그인이 필요해요.')

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

  throw new Error('추천 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
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
  if (!userId) throw new Error('로그인이 필요해요.')
  if (!isValidReferralCode(code)) {
    throw new Error('추천인 코드 8자리를 확인해 주세요.')
  }

  const profile = await getSupabaseProfile(userId)
  if (profile?.referredByUid) {
    throw new Error('이미 추천인이 연결되어 있어요.')
  }

  const ownCode = normalizeReferralCode(profile?.referralCode)
  if (ownCode && ownCode === code) {
    throw new Error('본인 코드로는 추천할 수 없어요.')
  }

  const indexed = await getReferralIndex(code)
  if (!indexed) {
    throw new Error('없는 추천인 코드예요.')
  }
  if (indexed.uid === userId) {
    throw new Error('본인 코드로는 추천할 수 없어요.')
  }

  const referrer = await getSupabaseProfile(indexed.uid)
  if (!referrer) {
    throw new Error('추천인을 찾을 수 없어요.')
  }

  const referredUids = indexed.referredUids.filter((id) => id !== userId)
  if (referredUids.length >= COMMUNITY_CREDIT_REFERRAL_MAX) {
    throw new Error(
      `이 추천 코드는 최대 ${COMMUNITY_CREDIT_REFERRAL_MAX}명까지 사용할 수 있어요.`,
    )
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
