import { NextResponse } from 'next/server'

import { persistConsentRecord, assertAcceptedCurrentPolicy } from '@lib/consent/recordConsent'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
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
  uiLanguage?: string
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
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
