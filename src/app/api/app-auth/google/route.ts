import { NextResponse } from 'next/server'

import { persistConsentRecord } from '@lib/consent/recordConsent'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import { loginOrRegisterWithGoogle, loginWithGoogle } from '../../agent-auth/lib/authHelpers'
import { getEllieoBaseUrl } from '../../agent-auth/lib/ellieoServer'
import {
  APP_DEVICE_ID,
  appSessionResponse,
  consentRequiredResponse,
  type AppSignInBody,
} from '../lib/appSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { idToken, email?, name?, acceptedTerms?, termsVersion?, privacyVersion?, uiLanguage? }
 * The Google ID token must be issued for the web client ID (the iOS app sets it as `serverClientID`),
 * because that is the audience Ellieo accepts.
 * 200 { accessToken, refreshToken, user, registered } · 428 { consentRequired } for a new account without consent.
 * The shared login helpers also set web session cookies; the app does not store cookies (URLSession has no cookie storage).
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json({ error: t('auth.appConnectMissingLogin') }, { status: 503 })
    }
    const body = ((await request.json().catch(() => null)) || {}) as AppSignInBody
    const idToken = String(body.idToken || '').trim()
    if (!idToken) {
      return NextResponse.json({ error: t('auth.googleIdTokenRequired') }, { status: 400 })
    }

    const login = await loginWithGoogle(t, idToken, body.email, body.name, { deviceId: APP_DEVICE_ID })
    if (login.ok) return appSessionResponse({ ...login, registered: false }, t)
    if (login.status && login.status >= 500) {
      return NextResponse.json({ error: login.error }, { status: 503 })
    }

    if (body.acceptedTerms !== true) return consentRequiredResponse(t)

    const result = await loginOrRegisterWithGoogle(t, idToken, body.email, body.name, {
      skipLoginAttempt: true,
      deviceId: APP_DEVICE_ID,
    })
    if (!result.ok) {
      const status = 'status' in result && result.status && result.status >= 500 ? 503 : 401
      return NextResponse.json({ error: result.error }, { status })
    }

    if (result.registered && result.user?.uid) {
      const consent = await persistConsentRecord({
        request,
        userId: result.user.uid,
        email: result.user.email || body.email,
        acceptedTerms: body.acceptedTerms,
        termsVersion: body.termsVersion,
        privacyVersion: body.privacyVersion,
        uiLanguage: body.uiLanguage,
        method: 'google_signup_checkbox',
        t,
      })
      if (!consent.ok) return NextResponse.json(consent.body, { status: consent.status })
    }

    return appSessionResponse(result, t)
  } catch (error) {
    console.error('App Google auth error:', error)
    return NextResponse.json({ error: apiErrorMessage(t, error, 'auth.googleAuthError') }, { status: 500 })
  }
}
