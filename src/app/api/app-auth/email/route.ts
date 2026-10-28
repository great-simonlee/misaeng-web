import { NextResponse } from 'next/server'

import { persistConsentRecord } from '@lib/consent/recordConsent'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import { getAuthErrorMessage, loginWithEmail, registerWithEmail } from '../../agent-auth/lib/authHelpers'
import { ellieoUpstreamFetch, getEllieoBaseUrl } from '../../agent-auth/lib/ellieoServer'
import { isSupabaseAuthMode } from '@lib/auth/accounts.server'
import {
  emailLogin,
  emailResendSignupCode,
  emailSignup,
  emailVerifySignup,
  passwordResetConfirm,
  passwordResetStart,
} from '@lib/auth/flows.server'
import {
  APP_DEVICE_ID,
  appSessionResponse,
  consentRequiredResponse,
  flowFailureResponse,
  supabaseAppSessionResponse,
  type AppSignInBody,
} from '../lib/appSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AppEmailBody = Omit<AppSignInBody, 'idToken' | 'authorizationCode'> & {
  mode?: 'login' | 'signup' | 'reset' | 'verify' | 'resend' | 'resetConfirm'
  password?: string
  /** the 6-digit code from the email (verify, resetConfirm) */
  code?: string
}

/**
 * Email sign-in for the app. POST { mode, email, password?, name?, acceptedTerms?, termsVersion?, privacyVersion?, uiLanguage? }
 * login → 200 { accessToken, refreshToken, user } · signup without consent → 428 { consentRequired } ·
 * reset → 200 { ok } (Ellieo emails a reset link).
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  if (isSupabaseAuthMode()) return supabaseEmail(request, t)
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json({ error: t('auth.appConnectMissing') }, { status: 503 })
    }
    const body = ((await request.json().catch(() => null)) || {}) as AppEmailBody
    const mode = body.mode || 'login'
    const email = String(body.email || '').trim()
    const password = String(body.password || '').trim()
    if (!email) {
      return NextResponse.json({ error: t('auth.emailRequired') }, { status: 400 })
    }

    if (mode === 'reset') {
      const { res, data } = await ellieoUpstreamFetch('auth/verification/password', {
        method: 'POST',
        body: { email },
        deviceId: APP_DEVICE_ID,
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: getAuthErrorMessage(t, data, t('auth.passwordResetFailed'), res.status) },
          { status: res.status || 400 },
        )
      }
      return NextResponse.json({ ok: true })
    }

    if (!password) {
      return NextResponse.json({ error: t('auth.passwordRequired') }, { status: 400 })
    }

    if (mode === 'login') {
      const login = await loginWithEmail(t, email, password, { deviceId: APP_DEVICE_ID })
      if (!login.ok) {
        // code: 'auth.invalidCredentials' | 'auth.accountNotFound' | … — the app shows "sign up" / "forgot password" from it
        return NextResponse.json({ error: login.error, code: login.errorKey }, { status: 401 })
      }
      return appSessionResponse({ ...login, registered: false }, t)
    }

    if (body.acceptedTerms !== true) return consentRequiredResponse(t)

    const result = await registerWithEmail(t, email, password, body.name ?? undefined, {
      deviceId: APP_DEVICE_ID,
    })
    if (!result.ok) {
      const emailInUse = 'emailInUse' in result && result.emailInUse
      return NextResponse.json(
        { error: result.error, code: emailInUse ? 'auth.emailInUse' : null },
        { status: emailInUse ? 409 : 400 },
      )
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
        t,
      })
      if (!consent.ok) return NextResponse.json(consent.body, { status: consent.status })
    }

    return appSessionResponse({ ...result, registered: true }, t)
  } catch (error) {
    console.error('App email auth error:', error)
    return NextResponse.json({ error: apiErrorMessage(t, error, 'auth.emailAuthError') }, { status: 500 })
  }
}

/**
 * Misaeng's own login (MISAENG_AUTH_PROVIDER=supabase). Modes:
 *   login       { email, password }                         → 200 tokens · 401 auth.invalidCredentials · 403 auth.emailNotConfirmed
 *   signup      { email, password, name?, acceptedTerms… }  → 202 { verificationRequired } (a code is emailed) · 428 consent · 409 auth.emailInUse
 *   verify      { email, code }                             → 200 tokens (sign-up confirmed)
 *   resend      { email }                                   → 200 { ok } (sign-up code again)
 *   reset       { email }                                   → 200 { ok } (reset code emailed when the account exists)
 *   resetConfirm{ email, code, password }                   → 200 tokens (new password set)
 */
async function supabaseEmail(request: Request, t: Awaited<ReturnType<typeof getRequestT>>) {
  try {
    const body = ((await request.json().catch(() => null)) || {}) as AppEmailBody
    const mode = body.mode || 'login'
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    const code = String(body.code || '')
    if (!email) return NextResponse.json({ error: t('auth.emailRequired') }, { status: 400 })
    const consent = {
      acceptedTerms: body.acceptedTerms,
      termsVersion: body.termsVersion,
      privacyVersion: body.privacyVersion,
      uiLanguage: body.uiLanguage,
    }

    switch (mode) {
      case 'reset': {
        const result = await passwordResetStart(t, email)
        return result.ok ? NextResponse.json({ ok: true }) : flowFailureResponse(result)
      }
      case 'resend': {
        const result = await emailResendSignupCode(t, email)
        return result.ok ? NextResponse.json({ ok: true }) : flowFailureResponse(result)
      }
      case 'verify':
        return supabaseAppSessionResponse(await emailVerifySignup(t, request, email, code, consent), t)
      case 'resetConfirm':
        return supabaseAppSessionResponse(await passwordResetConfirm(t, email, code, password), t)
      case 'signup': {
        if (!password) return NextResponse.json({ error: t('auth.passwordRequired') }, { status: 400 })
        if (body.acceptedTerms !== true) return consentRequiredResponse(t)
        const result = await emailSignup(t, email, password, body.name ?? null, consent)
        if (!result.ok) return flowFailureResponse(result)
        return NextResponse.json({ ok: true, verificationRequired: true, message: t('auth.verificationSent') }, { status: 202 })
      }
      default: {
        if (!password) return NextResponse.json({ error: t('auth.passwordRequired') }, { status: 400 })
        return supabaseAppSessionResponse(await emailLogin(t, email, password, APP_DEVICE_ID), t)
      }
    }
  } catch (error) {
    console.error('App email auth (Supabase) error:', error)
    return NextResponse.json({ error: apiErrorMessage(t, error, 'auth.emailAuthError') }, { status: 500 })
  }
}
