import { NextResponse } from 'next/server'

import { accountDeletedResponse } from '@lib/account/deletedAccount.server'
import { normalizeUserFromAccessToken } from '../../agent-auth/lib/authHelpers'
import { getLegalPolicy } from '@lib/supabase/legalConsent.server'
import type { Translate } from '@lib/i18n/translate'
import type { FlowFail, FlowResult } from '@lib/auth/flows.server'

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
  /** Apple sends the name split (given / family); older app builds only send `name`. */
  firstName?: string | null
  lastName?: string | null
  acceptedTerms?: boolean
  termsVersion?: string
  privacyVersion?: string
  uiLanguage?: string
}

/**
 * 200 with the tokens, or 403 { error, code: 'ACCOUNT_DELETED' } when this account was deleted in Misaeng
 * (the Ellieo account may still accept the password; Misaeng refuses it).
 */
export async function appSessionResponse(
  result: {
    tokens: { accessToken: string | null; refreshToken: string | null }
    user: unknown
    registered?: boolean
  },
  t: Translate,
) {
  // the profile is keyed by the access token's uid (resolveAuthenticatedUser); check the payload's uid too
  const tokenUid = result.tokens.accessToken ? normalizeUserFromAccessToken(result.tokens.accessToken)?.uid : null
  const payloadUid = (result.user as { uid?: unknown } | null)?.uid
  for (const uid of new Set([tokenUid, typeof payloadUid === 'string' ? payloadUid : null])) {
    const deleted = await accountDeletedResponse(uid, t)
    if (deleted) return deleted
  }
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

/** Supabase-mode sign-in result → the same body the app already reads (tokens for the Keychain). */
export async function supabaseAppSessionResponse(result: FlowResult, t: Translate) {
  if (!result.ok) return flowFailureResponse(result)
  const deleted = await accountDeletedResponse(result.uid, t)
  if (deleted) return deleted
  return NextResponse.json(
    {
      ok: true,
      registered: result.registered,
      user: {
        uid: result.uid,
        email: result.session.user.email,
        displayName: result.displayName,
        photoURL: null,
        phoneNumber: null,
      },
      accessToken: result.session.accessToken,
      refreshToken: result.session.refreshToken,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export function flowFailureResponse(result: FlowFail) {
  return NextResponse.json({ error: result.error, code: result.code ?? null, ...(result.extra ?? {}) }, { status: result.status })
}
