import { after, NextResponse } from 'next/server'

import { rememberAppleRefreshToken } from '@lib/account/appleRevoke.server'

import { persistConsentRecord } from '@lib/consent/recordConsent'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import {
  buildAuthUserFromHints,
  getAuthErrorMessage,
  isUpstreamUnavailable,
  normalizeUserFromAccessToken,
} from '../../agent-auth/lib/authHelpers'
import {
  ellieoUpstreamFetch,
  extractEllieoTokens,
  getEllieoBaseUrl,
} from '../../agent-auth/lib/ellieoServer'
import {
  APP_DEVICE_ID,
  appSessionResponse,
  consentRequiredResponse,
  type AppSignInBody,
} from '../lib/appSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sign in with Apple. POST { idToken, authorizationCode, email?, name?, acceptedTerms?, termsVersion?, privacyVersion?, uiLanguage? }
 * Ellieo: auth/login/apple { id_token } → for a new account auth/register/apple { id_token, authorizationCode }.
 * Apple sends the name and email only on the first sign-in, so the app passes them along.
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json({ error: t('auth.appConnectMissingLogin') }, { status: 503 })
    }
    const body = ((await request.json().catch(() => null)) || {}) as AppSignInBody
    const idToken = String(body.idToken || '').trim()
    const authorizationCode = String(body.authorizationCode || '').trim()
    if (!idToken) {
      return NextResponse.json({ error: t('auth.appleIdTokenRequired') }, { status: 400 })
    }

    const login = await ellieoUpstreamFetch('auth/login/apple', {
      method: 'POST',
      body: { id_token: idToken, ...(body.name ? { name: body.name } : {}) },
      deviceId: APP_DEVICE_ID,
    })
    const loginTokens = login.res.ok ? extractEllieoTokens(login.data) : null
    if (loginTokens?.accessToken) {
      const response = await appSessionResponse({
        tokens: loginTokens,
        user: buildAuthUserFromHints(body, { payload: login.data, accessToken: loginTokens.accessToken }),
        registered: false,
      }, t)
      // Ellieo's login does not use the authorization code: exchange it for an Apple refresh token so account
      // deletion can revoke Sign in with Apple (no-op unless APPLE_SIWA_* keys are set)
      const uid = normalizeUserFromAccessToken(loginTokens.accessToken)?.uid
      if (response.ok && uid && authorizationCode) {
        after(() => rememberAppleRefreshToken(uid, authorizationCode))
      }
      return response
    }
    if (isUpstreamUnavailable(login.res.status)) {
      return NextResponse.json({ error: t('auth.ellieoUnavailable') }, { status: 503 })
    }

    if (body.acceptedTerms !== true) return consentRequiredResponse(t)
    if (!authorizationCode) {
      return NextResponse.json({ error: t('auth.appleSignupFailed') }, { status: 400 })
    }

    const register = await ellieoUpstreamFetch('auth/register/apple', {
      method: 'POST',
      body: {
        id_token: idToken,
        authorizationCode,
        ...(body.name ? { name: body.name } : {}),
        ...(body.email ? { email: body.email } : {}),
      },
      deviceId: APP_DEVICE_ID,
    })
    let data = register.data
    let tokens = register.res.ok ? extractEllieoTokens(data) : null
    if (!tokens?.accessToken && register.res.ok) {
      // Some Ellieo register endpoints return the account only; log in to get tokens.
      const retry = await ellieoUpstreamFetch('auth/login/apple', {
        method: 'POST',
        body: { id_token: idToken },
        deviceId: APP_DEVICE_ID,
      })
      data = retry.data
      tokens = retry.res.ok ? extractEllieoTokens(data) : null
    }
    if (!tokens?.accessToken) {
      const status = isUpstreamUnavailable(register.res.status) ? 503 : 401
      return NextResponse.json(
        { error: getAuthErrorMessage(t, register.data, t('auth.appleSignupFailed'), register.res.status) },
        { status },
      )
    }

    const user = buildAuthUserFromHints(body, { payload: data, accessToken: tokens.accessToken })
    if (user?.uid) {
      const consent = await persistConsentRecord({
        request,
        userId: user.uid,
        email: user.email || body.email,
        acceptedTerms: body.acceptedTerms,
        termsVersion: body.termsVersion,
        privacyVersion: body.privacyVersion,
        uiLanguage: body.uiLanguage,
        method: 'apple_signup_checkbox',
        t,
      })
      if (!consent.ok) return NextResponse.json(consent.body, { status: consent.status })
    }

    return appSessionResponse({ tokens, user, registered: true }, t)
  } catch (error) {
    console.error('App Apple auth error:', error)
    return NextResponse.json({ error: apiErrorMessage(t, error, 'auth.appleLoginFailed') }, { status: 500 })
  }
}
