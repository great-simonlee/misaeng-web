import { ellieoUpstreamFetch, extractEllieoTokens, getEllieoBaseUrl } from '@/app/api/agent-auth/lib/ellieoServer'
import { normalizeUserFromAccessToken } from '@/app/api/agent-auth/lib/authHelpers'
import { persistConsentRecord } from '@lib/consent/recordConsent'
import type { Translate } from '@lib/i18n/translate'

import {
  ensureAuthUserForEllieoMember,
  isEllieoLegacyLoginOn,
  isPlaceholderEmail,
  resolveUid,
  sessionFromEllieoMember,
  UidConflictError,
} from './accounts.server'
import { authRest, enc } from './store.server'
import {
  adminCreateUser,
  adminSetPassword,
  AuthApiError,
  refreshSession,
  sendEmailCode,
  signInWithIdToken,
  signInWithPassword,
  signUpWithEmail,
  updatePasswordWithToken,
  verifyEmailCode,
  type AuthSession,
} from './supabaseAuth.server'

/*
 * Sign-in flows on Misaeng's own accounts (Supabase Auth), shared by the app (/api/app-auth/*) and the web
 * (/api/agent-auth/*). Routes turn the result into their response (Keychain tokens for the app, cookies for the web).
 */

export type Consent = {
  acceptedTerms?: boolean
  termsVersion?: string
  privacyVersion?: string
  uiLanguage?: string
}

export type FlowOk = { ok: true; session: AuthSession; uid: string; registered: boolean; displayName: string | null }
export type FlowFail = { ok: false; status: number; error: string; code?: string; extra?: Record<string, unknown> }
export type FlowResult = FlowOk | FlowFail

const fail = (status: number, error: string, code?: string, extra?: Record<string, unknown>): FlowFail => ({
  ok: false,
  status,
  error,
  ...(code ? { code } : {}),
  ...(extra ? { extra } : {}),
})

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Supabase error → response (codes the app already understands where they exist). */
function authFailure(t: Translate, error: unknown, fallbackKey: string): FlowFail {
  if (error instanceof AuthApiError) {
    const code = error.code || ''
    if (error.status >= 500) return fail(503, t('auth.authUnavailable'))
    if (code === 'invalid_credentials') return fail(401, t('auth.invalidCredentials'), 'auth.invalidCredentials')
    if (code === 'email_not_confirmed') return fail(403, t('auth.emailNotConfirmed'), 'auth.emailNotConfirmed')
    if (code === 'user_already_exists' || code === 'email_exists') return fail(409, t('auth.emailInUse'), 'auth.emailInUse')
    if (code === 'weak_password') return fail(400, t('auth.weakPassword'), 'auth.weakPassword')
    if (code === 'validation_failed' || code === 'email_address_invalid') return fail(400, t('auth.invalidEmail'), 'auth.invalidEmail')
    if (code === 'otp_expired') return fail(400, t('auth.codeExpired'), 'auth.codeExpired')
    if (code === 'over_email_send_rate_limit') return fail(429, t('auth.codeCooldown'), 'auth.codeCooldown')
    if (code === 'over_request_rate_limit') {
      return fail(429, t('auth.tooManyAttempts'), 'auth.tooManyAttempts')
    }
    if (code === 'user_banned') return fail(403, t('auth.accountDisabled'), 'auth.accountDisabled')
  }
  if (error instanceof UidConflictError) return fail(409, t('auth.emailInUse'), 'auth.emailInUse')
  console.error('Auth flow error:', error)
  return fail(500, t(fallbackKey))
}

async function recordConsent(request: Request, t: Translate, uid: string, email: string | null, consent: Consent, method: 'signup_checkbox' | 'google_signup_checkbox' | 'apple_signup_checkbox') {
  return persistConsentRecord({
    request,
    userId: uid,
    email,
    acceptedTerms: consent.acceptedTerms,
    termsVersion: consent.termsVersion,
    privacyVersion: consent.privacyVersion,
    uiLanguage: consent.uiLanguage,
    method,
    t,
  })
}

// MARK: Ellieo switch-over

type EllieoMember = { uid: string; email: string; name: string | null }

/** Checks an email + password with Ellieo once (switch-over only). Null = wrong / unknown, 'unavailable' = Ellieo down. */
async function checkEllieoPassword(email: string, password: string, deviceId: string): Promise<EllieoMember | null | 'unavailable'> {
  if (!isEllieoLegacyLoginOn() || !getEllieoBaseUrl()) return null
  for (const body of [{ email, password, platform: 'web' }, { email, password }]) {
    try {
      const { res, data } = await ellieoUpstreamFetch('auth/login', { method: 'POST', body, deviceId })
      if (res.status >= 500) return 'unavailable'
      if (!res.ok) continue
      const access = extractEllieoTokens(data).accessToken
      const member = access ? normalizeUserFromAccessToken(access) : null
      if (!member) return null
      return { uid: member.uid, email: isPlaceholderEmail(member.email) ? normalizeEmail(email) : member.email, name: member.displayName }
    } catch {
      return 'unavailable'
    }
  }
  return null
}

/** Is this email an existing (Ellieo-era) member who never signed in to Misaeng's own login? */
async function isUnclaimedLegacyEmail(email: string) {
  const rows = await authRest<{ uid: string }[]>(`legacy_users?email=ilike.${enc(email.replace(/[%_]/g, '\\$&'))}&select=uid&limit=1`)
  return rows.length > 0
}

// MARK: email

export async function emailLogin(t: Translate, rawEmail: string, password: string, deviceId: string): Promise<FlowResult> {
  const email = normalizeEmail(rawEmail)
  try {
    const session = await signInWithPassword(email, password)
    const { uid } = await resolveUid(session.user)
    return { ok: true, session, uid, registered: false, displayName: null }
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== 'invalid_credentials') return authFailure(t, error, 'auth.loginFailed')
  }

  // Switch-over (A): an existing member's first sign-in — the password is checked with Ellieo once, then kept here.
  const member = await checkEllieoPassword(email, password, deviceId)
  if (member === 'unavailable') return fail(503, t('auth.ellieoUnavailable'))
  if (!member) return fail(401, t('auth.invalidCredentials'), 'auth.invalidCredentials')
  try {
    const user = await ensureAuthUserForEllieoMember({ uid: member.uid, email: member.email, name: member.name }, 'ellieo_password', password)
    await adminSetPassword(user.id, password)
    const session = await signInWithPassword(member.email, password)
    return { ok: true, session, uid: member.uid, registered: false, displayName: member.name }
  } catch (error) {
    return authFailure(t, error, 'auth.loginFailed')
  }
}

/**
 * Email sign-up: Supabase emails a 6-digit code; the account is usable after `emailVerifySignup`. An existing
 * member who signs up again with their own email gets their old account back once the code is confirmed.
 */
export async function emailSignup(t: Translate, rawEmail: string, password: string, name: string | null, consent: Consent): Promise<FlowFail | { ok: true; verificationRequired: true }> {
  const email = normalizeEmail(rawEmail)
  try {
    const result = await signUpWithEmail(email, password, {
      ...(name ? { name } : {}),
      consent: { termsVersion: consent.termsVersion ?? null, privacyVersion: consent.privacyVersion ?? null, uiLanguage: consent.uiLanguage ?? null },
    })
    // Supabase answers an already-confirmed email with a fake user and sends nothing (no account enumeration)
    if (result.user.id && result.user.emailConfirmed && !result.session) return fail(409, t('auth.emailInUse'), 'auth.emailInUse')
    return { ok: true, verificationRequired: true }
  } catch (error) {
    return authFailure(t, error, 'auth.signupFailed')
  }
}

export async function emailVerifySignup(t: Translate, request: Request, rawEmail: string, code: string, consent: Consent): Promise<FlowResult> {
  const email = normalizeEmail(rawEmail)
  if (!code.trim()) return fail(400, t('auth.codeRequired'))
  try {
    const session = await verifyEmailCode('signup', email, code.trim())
    const linked = await resolveUid(session.user)
    if (linked.created && linked.isNew) {
      const stored = (session.user.metadata.consent ?? {}) as Consent
      const recorded = await recordConsent(request, t, linked.uid, email, { acceptedTerms: true, ...stored, ...strip(consent) }, 'signup_checkbox')
      if (!recorded.ok) console.error('Sign-up consent not recorded:', recorded)
    }
    const name = typeof session.user.metadata.name === 'string' ? session.user.metadata.name : null
    return { ok: true, session, uid: linked.uid, registered: linked.isNew, displayName: name }
  } catch (error) {
    if (error instanceof AuthApiError && (error.code === 'otp_expired' || error.status === 403)) {
      return fail(400, t('auth.codeInvalid'), 'auth.codeInvalid')
    }
    return authFailure(t, error, 'auth.signupFailed')
  }
}

function strip(consent: Consent): Consent {
  return Object.fromEntries(Object.entries(consent).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Consent
}

export async function emailResendSignupCode(t: Translate, rawEmail: string): Promise<FlowFail | { ok: true }> {
  try {
    await sendEmailCode('signup', normalizeEmail(rawEmail))
    return { ok: true }
  } catch (error) {
    return authFailure(t, error, 'auth.signupFailed')
  }
}

/**
 * Password reset, step 1: emails a 6-digit code. Always answers ok (no account enumeration). An existing member
 * without a Misaeng login yet gets one first, so the reset also works for them (switch-over B).
 */
export async function passwordResetStart(t: Translate, rawEmail: string): Promise<FlowFail | { ok: true }> {
  const email = normalizeEmail(rawEmail)
  try {
    // An existing member without a Misaeng login yet gets one first. No lookup by email here: Supabase's lookup
    // (generate_link) counts as a sent email and would trip the 60-second limit for the reset mail right after.
    if (await isUnclaimedLegacyEmail(email)) {
      await adminCreateUser(email).catch((error) => {
        if (!(error instanceof AuthApiError && (error.code === 'email_exists' || error.status === 422))) throw error
      })
    }
    await sendEmailCode('recovery', email)
    return { ok: true }
  } catch (error) {
    if (error instanceof AuthApiError && error.status >= 500) return fail(503, t('auth.emailUnavailable'))
    if (error instanceof AuthApiError && error.code === 'over_email_send_rate_limit') return fail(429, t('auth.codeCooldown'), 'auth.codeCooldown')
    if (error instanceof AuthApiError && error.code?.startsWith('over_')) return fail(429, t('auth.tooManyAttempts'), 'auth.tooManyAttempts')
    console.error('Password reset start:', error)
    return { ok: true }
  }
}

/** Password reset, step 2: the emailed code + a new password → signed in (and linked to the old uid by email). */
export async function passwordResetConfirm(t: Translate, rawEmail: string, code: string, password: string): Promise<FlowResult> {
  const email = normalizeEmail(rawEmail)
  if (!code.trim()) return fail(400, t('auth.codeRequired'))
  if (password.length < 6) return fail(400, t('auth.weakPassword'), 'auth.weakPassword')
  let session: AuthSession
  try {
    session = await verifyEmailCode('recovery', email, code.trim())
  } catch (error) {
    if (error instanceof AuthApiError && error.status < 500) return fail(400, t('auth.codeInvalid'), 'auth.codeInvalid')
    return authFailure(t, error, 'auth.passwordResetFailed')
  }
  try {
    await updatePasswordWithToken(session.accessToken, password)
    const { uid } = await resolveUid(session.user)
    return { ok: true, session, uid, registered: false, displayName: null }
  } catch (error) {
    return authFailure(t, error, 'auth.passwordResetFailed')
  }
}

// MARK: Google / Apple

/**
 * Native / web Google or Apple sign-in. A brand-new member must accept the terms first: without consent the
 * answer is 428 consentRequired and nothing is linked yet (the app shows the terms sheet and retries).
 */
export async function idTokenSignIn(
  t: Translate,
  request: Request,
  provider: 'google' | 'apple',
  idToken: string,
  options: { nonce?: string | null; consent: Consent; name?: string | null },
): Promise<FlowResult> {
  let session: AuthSession
  try {
    session = await signInWithIdToken(provider, idToken, options.nonce)
  } catch (error) {
    return authFailure(t, error, provider === 'google' ? 'auth.googleLoginFailed' : 'auth.appleLoginFailed')
  }
  try {
    const accepted = options.consent.acceptedTerms === true
    const linked = await resolveUid(session.user, { createNew: accepted })
    if (linked.isNew && !linked.uid) {
      return fail(428, t('auth.consentRequired'), 'auth.consentRequired', { consentRequired: true })
    }
    if (linked.created && linked.isNew) {
      const method = provider === 'google' ? 'google_signup_checkbox' : 'apple_signup_checkbox'
      const recorded = await recordConsent(request, t, linked.uid, session.user.email, options.consent, method)
      if (!recorded.ok) console.error('Sign-up consent not recorded:', recorded)
    }
    const meta = session.user.metadata
    const displayName = options.name?.trim() || (typeof meta.full_name === 'string' ? meta.full_name : null) || (typeof meta.name === 'string' ? meta.name : null)
    return { ok: true, session, uid: linked.uid, registered: linked.isNew, displayName }
  } catch (error) {
    return authFailure(t, error, provider === 'google' ? 'auth.googleLoginFailed' : 'auth.appleLoginFailed')
  }
}

// MARK: refresh

/**
 * Token refresh. A Supabase refresh token is refreshed as is. An old Ellieo refresh token (app builds signed in
 * before the switch) is refreshed with Ellieo once and swapped for a Misaeng session on the same uid.
 */
export async function refreshTokens(refreshToken: string, deviceId: string): Promise<{ session: AuthSession; uid: string } | 'invalid' | 'unavailable'> {
  const looksEllieo = refreshToken.split('.').length === 3
  if (!looksEllieo) {
    try {
      const session = await refreshSession(refreshToken)
      return { session, uid: (await resolveUid(session.user)).uid }
    } catch (error) {
      if (error instanceof AuthApiError && error.status >= 500) return 'unavailable'
      if (!getEllieoBaseUrl()) return 'invalid'
    }
  }
  if (!getEllieoBaseUrl()) return 'invalid'
  try {
    const { res, data } = await ellieoUpstreamFetch('auth/refresh', { method: 'POST', body: { refreshToken }, deviceId })
    if (res.status >= 500) return 'unavailable'
    const access = res.ok ? extractEllieoTokens(data).accessToken : null
    const member = access ? normalizeUserFromAccessToken(access) : null
    if (!member || isPlaceholderEmail(member.email)) return 'invalid'
    const session = await sessionFromEllieoMember({ uid: member.uid, email: member.email, name: member.displayName })
    return { session, uid: member.uid }
  } catch (error) {
    console.error('Ellieo → Misaeng refresh swap failed:', error)
    return 'unavailable'
  }
}
