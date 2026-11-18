import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { BRAND_CONFIG } from '@lib/brand'
import { buildReferralShareUrl } from '@lib/community/referral'
import { COMMUNITY_CREDIT_REFERRAL_MAX, COMMUNITY_CREDIT_REFERRAL_POST } from '@lib/constants/communityCredit'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import { getPointsConfig, ruleAmount } from '@lib/points/config.server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
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
    const [profile, usedCount, ledgerActive] = await Promise.all([
      getSupabaseProfile(user.uid),
      getReferralUseCount(user.uid),
      isPointsLedgerActive(),
    ])
    // the apps show this amount instead of a number built into the app, so it follows the points switch-over
    const creditsPerUse = ledgerActive
      ? ruleAmount(await getPointsConfig(), 'earn.referral')
      : COMMUNITY_CREDIT_REFERRAL_POST
    // behind the AWS proxy request.url is the internal address, so shared links use the public site URL
    const origin = process.env.NODE_ENV === 'production' ? BRAND_CONFIG.siteUrl : new URL(request.url).origin
    return NextResponse.json({
      code,
      shareUrl: buildReferralShareUrl(origin, code),
      referredByCode: profile?.referredByCode ?? null,
      usedCount,
      maxUses: COMMUNITY_CREDIT_REFERRAL_MAX,
      creditsPerUse,
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
