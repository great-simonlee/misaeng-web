import { NextResponse } from 'next/server'

import { ApiMessageError, apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'

import {
  getAuthErrorMessage,
  resolveAuthenticatedUser,
} from '../lib/authHelpers'
import {
  ellieoAuthorizedFetch,
  getEllieoBaseUrl,
} from '../lib/ellieoServer'
import { resolveSchoolFromEmail } from '@lib/constants/schools'
import { isSchoolOtpEnabled } from '@lib/constants/verificationSafety'
import {
  isSupabaseProfileConfigured,
  upsertSupabaseProfile,
  accountSuspendedResponse,
} from '@lib/supabase/profile.server'
import { isSchoolEmail } from '@lib/utils/verification'

type SchoolEmailBody = {
  action?: 'send' | 'confirm'
  email?: string
  code?: string
}

async function sendViaEllieo(t: Translate, email: string) {
  const { res, data } = await ellieoAuthorizedFetch(
    'auth/verification/school',
    {
      method: 'POST',
      body: { email },
    },
  )

  if (res.ok) {
    return { ok: true as const }
  }

  const message = getAuthErrorMessage(t, data, t('verification.codeSendFailed'))
  if (/invalid school email domain/i.test(message)) {
    return {
      ok: false as const,
      error: t('verification.schoolDomainUnsupported'),
      code: 'SCHOOL_DOMAIN_UNSUPPORTED' as const,
    }
  }

  return { ok: false as const, error: message }
}

async function confirmViaEllieo(t: Translate, email: string, code: string) {
  const bodies = [
    { email, code },
    { email, verificationCode: code },
  ]
  let lastError = t('verification.codeInvalid')

  for (const body of bodies) {
    const { res, data } = await ellieoAuthorizedFetch(
      'auth/verification/school/verify/code',
      {
        method: 'POST',
        body,
      },
    )

    if (res.ok) {
      return { ok: true as const }
    }

    lastError = getAuthErrorMessage(t, data, lastError)
  }

  return { ok: false as const, error: lastError }
}

async function markSchoolVerified(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const school = resolveSchoolFromEmail(normalizedEmail)
  const domain = normalizedEmail.split('@')[1] ?? ''

  if (!isSupabaseProfileConfigured()) {
    throw new ApiMessageError('Supabase is not configured.', 'common.supabaseNotConfigured')
  }

  const profile = await upsertSupabaseProfile(uid, {
    schoolEmail: normalizedEmail,
    schoolEmailVerified: true,
    verifiedSchoolId: school?.id ?? null,
    verifiedSchoolName: school?.fullName ?? domain,
  })

  return {
    profile,
    schoolName: school?.fullName ?? domain,
    schoolId: school?.id ?? null,
  }
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!isSchoolOtpEnabled()) {
      return NextResponse.json(
        { error: t('verification.schoolOtpDisabled') },
        { status: 503 },
      )
    }

    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        { error: t('auth.appConnectMissing') },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    }
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended

    const body = (await request.json()) as SchoolEmailBody
    const action = body.action || 'send'
    const email = body.email?.trim().toLowerCase()

    if (!email || !isSchoolEmail(email)) {
      return NextResponse.json(
        { error: t('verification.schoolEmailRequired') },
        { status: 400 },
      )
    }

    if (action === 'send') {
      const result = await sendViaEllieo(t, email)
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            ...(result.code ? { code: result.code } : {}),
          },
          { status: 502 },
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (action === 'confirm') {
      const code = body.code?.trim()
      if (!code) {
        return NextResponse.json(
          { error: t('verification.codeRequired') },
          { status: 400 },
        )
      }

      const result = await confirmViaEllieo(t, email, code)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      const verified = await markSchoolVerified(user.uid, email)

      try {
        const { awardSchoolVerifyCredit } = await import(
          '@lib/community/creditLedger'
        )
        await awardSchoolVerifyCredit(user.uid)
      } catch (creditError) {
        console.error('Community credit award (school) error:', creditError)
      }

      return NextResponse.json({
        ok: true,
        schoolName: verified.schoolName,
        schoolId: verified.schoolId,
        profile: verified.profile,
      })
    }

    return NextResponse.json({ error: t('common.badRequest') }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'verification.schoolEmailError'),
      },
      { status: 500 },
    )
  }
}
