import { NextResponse } from 'next/server'

import { refuseDeletedWebSignIn } from '@lib/account/deletedAccount.server'
import { persistConsentRecord, assertAcceptedCurrentPolicy } from '@lib/consent/recordConsent'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import {
  buildAuthUserFromHints,
  getAuthErrorMessage,
  isUpstreamUnavailable,
  loginOrRegisterWithGoogle,
  normalizeUserFromAccessToken,
} from '../lib/authHelpers'
import {
  ellieoUpstreamFetch,
  extractEllieoTokens,
  getEllieoBaseUrl,
  getOrCreateDeviceId,
  setEllieoSession,
} from '../lib/ellieoServer'
import { supabaseWebSessionResponse } from '../lib/webSession'
import { isSupabaseAuthMode } from '@lib/auth/accounts.server'
import { idTokenSignIn } from '@lib/auth/flows.server'

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
  uiLanguage?: string
}

const ELLIEO_LOGIN_BODIES = (idToken: string) => [
  { idToken, platform: 'web' },
  { idToken },
  { googleIdToken: idToken, platform: 'web' },
  { googleIdToken: idToken },
  { token: idToken },
]

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  if (isSupabaseAuthMode()) {
    const body = ((await request.json().catch(() => null)) || {}) as GoogleAuthBody
    const idToken = body.idToken ?? body.googleIdToken ?? body.token ?? body.credential
    if (!idToken) return NextResponse.json({ error: t('auth.googleIdTokenRequired') }, { status: 400 })
    const result = await idTokenSignIn(t, request, 'google', idToken, { consent: body, name: body.name })
    if (!result.ok && result.status === 428) {
      // same answer the web already handles for a new Google account without consent
      const consentCheck = await assertAcceptedCurrentPolicy({
        acceptedTerms: body.acceptedTerms,
        termsVersion: body.termsVersion,
        privacyVersion: body.privacyVersion,
        t,
      })
      if (!consentCheck.ok) return NextResponse.json(consentCheck.body, { status: consentCheck.status })
    }
    return supabaseWebSessionResponse(result, t)
  }
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        {
          error: t('auth.appConnectMissingLogin'),
        },
        { status: 503 },
      )
    }

    const body = (await request.json()) as GoogleAuthBody
    const idToken =
      body.idToken ?? body.googleIdToken ?? body.token ?? body.credential

    if (!idToken) {
      return NextResponse.json(
        { error: t('auth.googleIdTokenRequired') },
        { status: 400 },
      )
    }

    const deviceId = await getOrCreateDeviceId()
    let lastError = t('auth.googleLoginFailed')
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
        lastError = getAuthErrorMessage(t, data, lastError, res.status)
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
      const deleted = await refuseDeletedWebSignIn(
        normalizeUserFromAccessToken(tokens.accessToken)?.uid ?? user?.uid,
        t,
      )
      if (deleted) return deleted

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
      t,
    })
    if (!consentCheck.ok) {
      return NextResponse.json(consentCheck.body, { status: consentCheck.status })
    }

    const registerResult = await loginOrRegisterWithGoogle(
      t,
      idToken,
      body.email,
      body.name,
      { loginOnly: false, skipLoginAttempt: true },
    )

    if (registerResult.ok) {
      const deleted = await refuseDeletedWebSignIn(registerResult.user?.uid, t)
      if (deleted) return deleted
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
          t,
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
              hint: t('auth.googleAccountHint'),
            }
          : {}),
      },
      { status },
    )
  } catch (error) {
    console.error('Google auth error:', error)

    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'auth.googleAuthError'),
      },
      { status: 500 },
    )
  }
}
