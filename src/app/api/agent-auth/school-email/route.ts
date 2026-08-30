import { NextResponse } from 'next/server'

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

async function sendViaEllieo(email: string) {
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

  const message = getAuthErrorMessage(data, '인증 코드 발송에 실패했어요.')
  if (/invalid school email domain/i.test(message)) {
    return {
      ok: false as const,
      error:
        '아직 지원하지 않는 학교 이메일 도메인이에요. 미생팀에 학교 등록을 요청해 주세요.',
      code: 'SCHOOL_DOMAIN_UNSUPPORTED' as const,
    }
  }

  return { ok: false as const, error: message }
}

async function confirmViaEllieo(email: string, code: string) {
  const bodies = [
    { email, code },
    { email, verificationCode: code },
  ]
  let lastError = '인증 코드가 올바르지 않거나 만료되었어요.'

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

    lastError = getAuthErrorMessage(data, lastError)
  }

  return { ok: false as const, error: lastError }
}

async function markSchoolVerified(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const school = resolveSchoolFromEmail(normalizedEmail)
  const domain = normalizedEmail.split('@')[1] ?? ''

  if (!isSupabaseProfileConfigured()) {
    throw new Error('Supabase 설정이 필요해요.')
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
  try {
    if (!isSchoolOtpEnabled()) {
      return NextResponse.json(
        { error: '학교 이메일 인증이 일시적으로 비활성화되어 있어요.' },
        { status: 503 },
      )
    }

    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        { error: 'APP_CONNECT_API_BASE_URL 환경 변수가 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }
    const suspended = await accountSuspendedResponse(user.uid)
    if (suspended) return suspended

    const body = (await request.json()) as SchoolEmailBody
    const action = body.action || 'send'
    const email = body.email?.trim().toLowerCase()

    if (!email || !isSchoolEmail(email)) {
      return NextResponse.json(
        { error: '학교 이메일(.edu 또는 등록된 도메인)을 입력해 주세요.' },
        { status: 400 },
      )
    }

    if (action === 'send') {
      const result = await sendViaEllieo(email)
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
          { error: '인증 코드를 입력해 주세요.' },
          { status: 400 },
        )
      }

      const result = await confirmViaEllieo(email, code)
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

    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : getAuthErrorMessage(null, '학교 이메일 인증 중 오류가 발생했어요.'),
      },
      { status: 500 },
    )
  }
}
