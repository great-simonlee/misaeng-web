import { NextResponse } from 'next/server'

import { persistConsentRecord, assertAcceptedCurrentPolicy } from '@lib/consent/recordConsent'
import {
  buildAuthUserFromHints,
  getAuthErrorMessage,
  isUpstreamUnavailable,
  loginOrRegisterWithGoogle,
} from '../lib/authHelpers'
import {
  ellieoUpstreamFetch,
  extractEllieoTokens,
  getEllieoBaseUrl,
  getOrCreateDeviceId,
  setEllieoSession,
} from '../lib/ellieoServer'

type GoogleAuthBody = {
  idToken?: string
  googleIdToken?: string
  token?: string
  credential?: string
  email?: string | null
  name?: string | null
  acceptedTerms?: boolean
  termsVersion?: string
  privacyVersion?: string
  uiLanguage?: 'en' | 'ko'
}

const ELLIEO_LOGIN_BODIES = (idToken: string) => [
  { idToken, platform: 'web' },
  { idToken },
  { googleIdToken: idToken, platform: 'web' },
  { googleIdToken: idToken },
  { token: idToken },
]

export async function POST(request: Request) {
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        {
          error:
            'APP_CONNECT_API_BASE_URL 환경 변수가 없어 로그인을 연결할 수 없어요.',
        },
        { status: 503 },
      )
    }

    const body = (await request.json()) as GoogleAuthBody
    const idToken =
      body.idToken ?? body.googleIdToken ?? body.token ?? body.credential

    if (!idToken) {
      return NextResponse.json(
        { error: 'Google idToken이 필요해요.' },
        { status: 400 },
      )
    }

    const deviceId = await getOrCreateDeviceId()
    let lastError = 'Google 로그인에 실패했어요.'
    let lastStatus = 401
    let loginData: unknown = null
    let tokens: ReturnType<typeof extractEllieoTokens> | null = null

    for (const loginBody of ELLIEO_LOGIN_BODIES(idToken)) {
      const { res, data } = await ellieoUpstreamFetch('auth/login/google', {
        method: 'POST',
        body: loginBody,
        deviceId,
      })

      if (res.ok) {
        tokens = extractEllieoTokens(data)
        loginData = data
        if (tokens.accessToken) break
      } else {
        lastStatus = res.status
        lastError = getAuthErrorMessage(data, lastError)
        if (isUpstreamUnavailable(res.status)) {
          return NextResponse.json({ error: lastError }, { status: 503 })
        }
      }
    }

    if (tokens?.accessToken) {
      await setEllieoSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        deviceId,
      })

      const user = buildAuthUserFromHints(
        { email: body.email, name: body.name },
        { payload: loginData, accessToken: tokens.accessToken },
      )

      return NextResponse.json({
        ok: true,
        connected: true,
        registered: false,
        user,
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

    const registerResult = await loginOrRegisterWithGoogle(
      idToken,
      body.email,
      body.name,
      { loginOnly: false, skipLoginAttempt: true },
    )

    if (registerResult.ok) {
      if (registerResult.registered && registerResult.user?.uid) {
        const consent = await persistConsentRecord({
          request,
          userId: registerResult.user.uid,
          email: registerResult.user.email || body.email,
          acceptedTerms: body.acceptedTerms,
          termsVersion: body.termsVersion,
          privacyVersion: body.privacyVersion,
          uiLanguage: body.uiLanguage,
          method: 'google_signup_checkbox',
        })
        if (!consent.ok) {
          return NextResponse.json(consent.body, { status: consent.status })
        }
      }

      return NextResponse.json({
        ok: true,
        connected: true,
        registered: registerResult.registered,
        user: registerResult.user,
      })
    }

    const status =
      'status' in registerResult &&
      registerResult.status &&
      registerResult.status >= 500
        ? 503
        : lastStatus >= 500
          ? 503
          : 401

    return NextResponse.json(
      {
        error: registerResult.error || lastError,
        ...(status === 401
          ? {
              hint: 'Ellieo에 등록된 Google 계정이 필요해요.',
            }
          : {}),
      },
      { status },
    )
  } catch (error) {
    console.error('Google auth error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Google 인증 중 오류가 발생했어요.',
      },
      { status: 500 },
    )
  }
}
