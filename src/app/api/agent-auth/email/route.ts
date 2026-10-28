import { NextResponse } from 'next/server'

import { refuseDeletedWebSignIn } from '@lib/account/deletedAccount.server'
import { persistConsentRecord, assertAcceptedCurrentPolicy } from '@lib/consent/recordConsent'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import { getEllieoBaseUrl, ellieoUpstreamFetch, getOrCreateDeviceId } from '../lib/ellieoServer'
import { supabaseWebSessionResponse, webFlowFailure } from '../lib/webSession'
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
  getAuthErrorMessage,
  loginWithEmail,
  registerWithEmail,
} from '../lib/authHelpers'

type EmailAuthBody = {
  mode?: 'login' | 'signup' | 'reset' | 'verify' | 'resend' | 'resetConfirm'
  code?: string
  email?: string
  password?: string
  name?: string
  acceptedTerms?: boolean
  termsVersion?: string
  privacyVersion?: string
  uiLanguage?: string
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  if (isSupabaseAuthMode()) return supabaseEmail(request, t)
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        { error: t('auth.appConnectMissing') },
        { status: 503 },
      )
    }

    const body = (await request.json()) as EmailAuthBody
    const mode = body.mode || 'login'
    const email = body.email?.trim()
    const password = body.password?.trim()

    if (!email) {
      return NextResponse.json(
        { error: t('auth.emailRequired') },
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
          { error: getAuthErrorMessage(t, data, t('auth.passwordResetFailed'), res.status) },
          { status: res.status || 400 },
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (!password) {
      return NextResponse.json(
        { error: t('auth.passwordRequired') },
        { status: 400 },
      )
    }

    if (mode === 'login') {
      const result = await loginWithEmail(t, email, password)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 401 })
      }
      const deleted = await refuseDeletedWebSignIn(result.user?.uid, t)
      if (deleted) return deleted

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
      t,
    })
    if (!consentCheck.ok) {
      return NextResponse.json(consentCheck.body, { status: consentCheck.status })
    }

    const result = await registerWithEmail(t, email, password, body.name)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 'emailInUse' in result && result.emailInUse ? 409 : 400 },
      )
    }
    const deletedAccount = await refuseDeletedWebSignIn(result.user?.uid, t)
    if (deletedAccount) return deletedAccount

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
        error: apiErrorMessage(t, error, 'auth.emailAuthError'),
      },
      { status: 500 },
    )
  }
}

/** Misaeng's own login (MISAENG_AUTH_PROVIDER=supabase) — same modes as /api/app-auth/email, cookies instead of tokens. */
async function supabaseEmail(request: Request, t: Awaited<ReturnType<typeof getRequestT>>) {
  try {
    const body = ((await request.json().catch(() => null)) || {}) as EmailAuthBody
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
        return result.ok ? NextResponse.json({ ok: true, codeSent: true }) : webFlowFailure(result)
      }
      case 'resend': {
        const result = await emailResendSignupCode(t, email)
        return result.ok ? NextResponse.json({ ok: true }) : webFlowFailure(result)
      }
      case 'verify':
        return supabaseWebSessionResponse(await emailVerifySignup(t, request, email, code, consent), t, { mode: 'signup' })
      case 'resetConfirm':
        return supabaseWebSessionResponse(await passwordResetConfirm(t, email, code, password), t, { mode: 'login' })
      case 'signup': {
        if (!password) return NextResponse.json({ error: t('auth.passwordRequired') }, { status: 400 })
        const consentCheck = await assertAcceptedCurrentPolicy({ ...consent, t })
        if (!consentCheck.ok) return NextResponse.json(consentCheck.body, { status: consentCheck.status })
        const result = await emailSignup(t, email, password, body.name ?? null, consent)
        if (!result.ok) return webFlowFailure(result)
        return NextResponse.json({ ok: true, mode: 'signup', verificationRequired: true, message: t('auth.verificationSent') }, { status: 202 })
      }
      default: {
        if (!password) return NextResponse.json({ error: t('auth.passwordRequired') }, { status: 400 })
        const result = await emailLogin(t, email, password, await getOrCreateDeviceId())
        return supabaseWebSessionResponse(result, t, { mode: 'login' })
      }
    }
  } catch (error) {
    console.error('Web email auth (Supabase) error:', error)
    return NextResponse.json({ error: apiErrorMessage(t, error, 'auth.emailAuthError') }, { status: 500 })
  }
}
