import { NextResponse } from 'next/server'

import { getLegalPolicy } from '@lib/supabase/legalConsent.server'
import type { Translate } from '@lib/i18n/translate'

/**
 * Native app sign-in (misaeng-app). Same Ellieo accounts as the web, but tokens are returned in the body
 * (the app keeps them in the Keychain and sends `Authorization: Bearer`) instead of being set as cookies.
 */

/** Ellieo device id for every app sign-in and refresh (tokens may be bound to the device). */
export const APP_DEVICE_ID = 'misaeng-ios'

export type AppSignInBody = {
  idToken?: string
  authorizationCode?: string
  email?: string | null
  name?: string | null
  acceptedTerms?: boolean
  termsVersion?: string
  privacyVersion?: string
  uiLanguage?: string
}

export function appSessionResponse(result: {
  tokens: { accessToken: string | null; refreshToken: string | null }
  user: unknown
  registered?: boolean
}) {
  return NextResponse.json(
    {
      ok: true,
      registered: Boolean(result.registered),
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/** No account yet and no consent in the request: the app shows the terms sheet and retries with consent. */
export async function consentRequiredResponse(t: Translate) {
  const policy = await getLegalPolicy()
  return NextResponse.json(
    {
      error: t('auth.consentRequired'),
      consentRequired: true,
      termsVersion: policy.termsVersion,
      privacyVersion: policy.privacyVersion,
    },
    { status: 428 },
  )
}
