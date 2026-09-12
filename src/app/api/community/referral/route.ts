import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { buildReferralShareUrl } from '@lib/community/referral'
import { COMMUNITY_CREDIT_REFERRAL_MAX } from '@lib/constants/communityCredit'
import {
  bindUserReferrer,
  ensureUserReferralCode,
  getReferralUseCount,
} from '@lib/community/referral.server'
import {
  getSupabaseProfile,
  isSupabaseProfileConfigured,
} from '@lib/supabase/profile.server'

export async function GET(request: Request) {
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      { error: '추천 기능을 쓰려면 저장소 설정이 필요해요.' },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  try {
    const code = await ensureUserReferralCode(user.uid)
    const [profile, usedCount] = await Promise.all([
      getSupabaseProfile(user.uid),
      getReferralUseCount(user.uid),
    ])
    const origin = new URL(request.url).origin
    return NextResponse.json({
      code,
      shareUrl: buildReferralShareUrl(origin, code),
      referredByCode: profile?.referredByCode ?? null,
      usedCount,
      maxUses: COMMUNITY_CREDIT_REFERRAL_MAX,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '추천 정보를 불러오지 못했어요.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      { error: '추천 기능을 쓰려면 저장소 설정이 필요해요.' },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | { code?: unknown }
    | null
  const code = typeof body?.code === 'string' ? body.code : ''

  try {
    const bound = await bindUserReferrer({ uid: user.uid, code })
    return NextResponse.json({
      ok: true,
      referredByCode: bound.referredByCode,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '추천인 연결에 실패했어요.',
      },
      { status: 400 },
    )
  }
}
