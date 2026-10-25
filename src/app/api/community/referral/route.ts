import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { buildReferralShareUrl } from '@lib/community/referral'
import { COMMUNITY_CREDIT_REFERRAL_MAX } from '@lib/constants/communityCredit'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
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
  const t = await getRequestT(request, 'api')
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      { error: t('referral.featureStorageMissing') },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
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
        error: apiErrorMessage(t, error, 'referral.loadFailed'),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      { error: t('referral.featureStorageMissing') },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
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
        error: apiErrorMessage(t, error, 'referral.bindFailed'),
      },
      { status: 400 },
    )
  }
}
