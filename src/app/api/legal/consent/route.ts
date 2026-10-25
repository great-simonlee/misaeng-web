import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { persistConsentRecord } from '@lib/consent/recordConsent'
import { getRequestT } from '@lib/i18n/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json(
      {
        error: t('common.loginRequired'),
        errorEn: 'Please sign in to continue.',
        errorKo: '로그인이 필요해요.',
      },
      { status: 401 },
    )
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const result = await persistConsentRecord({
    request,
    userId: user.uid,
    email: user.email,
    acceptedTerms: body?.acceptedTerms,
    termsVersion: body?.termsVersion,
    privacyVersion: body?.privacyVersion,
    uiLanguage: body?.uiLanguage,
    method: 'reconsent_modal',
    t,
  })

  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status })
  }

  return NextResponse.json({ ok: true, log: result.log })
}
