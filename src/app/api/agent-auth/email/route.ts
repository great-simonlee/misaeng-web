import { NextResponse } from 'next/server'

import { persistConsentRecord, assertAcceptedCurrentPolicy } from '@lib/consent/recordConsent'
import { getEllieoBaseUrl, ellieoUpstreamFetch } from '../lib/ellieoServer'
import {
  getAuthErrorMessage,
  loginWithEmail,
  registerWithEmail,
} from '../lib/authHelpers'

type EmailAuthBody = {
  mode?: 'login' | 'signup' | 'reset'
  email?: string
  password?: string
  name?: string
  acceptedTerms?: boolean
  termsVersion?: string
  privacyVersion?: string
  uiLanguage?: 'en' | 'ko'
}

export async function POST(request: Request) {
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        { error: 'APP_CONNECT_API_BASE_URL 환경 변수가 필요해요.' },
        { status: 503 },
      )
    }

    const body = (await request.json()) as EmailAuthBody
    const mode = body.mode || 'login'
    const email = body.email?.trim()
    const password = body.password?.trim()

    if (!email) {
      return NextResponse.json(
        { error: '이메일을 입력해 주세요.' },
        { status: 400 },
      )
    }

    if (mode === 'reset') {
      const { res, data } = await ellieoUpstreamFetch(
        'auth/verification/password',
        {
          method: 'POST',
          body: { email },
        },
      )

      if (!res.ok) {
        return NextResponse.json(
          { error: getAuthErrorMessage(data, '비밀번호 재설정 요청에 실패했어요.') },
          { status: res.status || 400 },
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해 주세요.' },
        { status: 400 },
      )
    }

    if (mode === 'login') {
      const result = await loginWithEmail(email, password)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 401 })
      }

      return NextResponse.json({
        ok: true,
        mode: 'login',
        user: result.user,
      })
    }

    const consentCheck = await assertAcceptedCurrentPolicy({
      acceptedTerms: body.acceptedTerms,
      termsVersion: body.termsVersion,
      privacyVersion: body.privacyVersion,
    })
    if (!consentCheck.ok) {
      return NextResponse.json(consentCheck.body, { status: consentCheck.status })
    }

    const result = await registerWithEmail(email, password, body.name)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    if (result.user?.uid) {
      const consent = await persistConsentRecord({
        request,
        userId: result.user.uid,
        email: result.user.email || email,
        acceptedTerms: body.acceptedTerms,
        termsVersion: body.termsVersion,
        privacyVersion: body.privacyVersion,
        uiLanguage: body.uiLanguage,
        method: 'signup_checkbox',
      })
      if (!consent.ok) {
        return NextResponse.json(consent.body, { status: consent.status })
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'signup',
      user: result.user,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '이메일 인증 중 오류가 발생했어요.',
      },
      { status: 500 },
    )
  }
}
