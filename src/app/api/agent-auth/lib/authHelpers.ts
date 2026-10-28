import { createHash } from 'node:crypto'

import { cookies } from 'next/headers'

import { isAccountDeleted } from '@lib/account/deletedAccount.server'
import { isPlaceholderEmail, isSupabaseAuthMode } from '@lib/auth/accounts.server'
import {
  resolveMisaengCookieSession,
  upgradeEllieoWebSession,
  userForMisaengToken,
} from '@lib/auth/session.server'
import { isSupabaseToken } from '@lib/auth/supabaseAuth.server'
import { isMisaengEmail } from '@lib/constants/nyc'
import type { Translate } from '@lib/i18n/translate'

import {
  clearEllieoSession,
  ELLIEO_ACCESS_COOKIE,
  ellieoUpstreamFetch,
  extractEllieoTokens,
  getEllieoAccessToken,
  getEllieoRefreshToken,
  getOrCreateDeviceId,
  getRequestBearerToken,
  isEllieoTokenAccepted,
  refreshEllieoAccessToken,
  setEllieoSession,
} from './ellieoServer'
import { getAuthErrorMessage, upstreamErrorKey } from './upstreamError'

export { getAuthErrorMessage }

function isUpstreamUnavailable(status: number) {
  return status === 502 || status === 503 || status === 504
}

export { isUpstreamUnavailable }

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(normalized, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function pickEmailFromRecord(record: Record<string, unknown>): string | null {
  const candidates = ['email', 'userEmail', 'username', 'loginEmail']
  for (const key of candidates) {
    const value = record[key]
    if (typeof value === 'string' && value.includes('@')) {
      return value
    }
  }
  return null
}

export function buildAuthUserFromHints(
  hints: {
    email?: string | null
    name?: string | null
  },
  sources: {
    payload?: unknown
    accessToken?: string | null
  } = {},
) {
  const fromPayload = sources.payload
    ? normalizeUserFromPayload(sources.payload)
    : null
  if (fromPayload) return fromPayload

  const fromToken = sources.accessToken
    ? normalizeUserFromAccessToken(sources.accessToken)
    : null
  if (fromToken) return fromToken

  const email = hints.email?.trim()
  if (!email) return null

  return {
    uid: email,
    email,
    displayName: hints.name?.trim() || null,
    photoURL: null,
    phoneNumber: null,
  }
}

export function normalizeUserFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const data =
    'data' in payload && payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload

  if (!data || typeof data !== 'object') return null

  const record = data as Record<string, unknown>
  const nestedUser =
    record.user && typeof record.user === 'object'
      ? (record.user as Record<string, unknown>)
      : null

  const source = nestedUser ?? record

  const email =
    pickEmailFromRecord(source as Record<string, unknown>) ||
    pickEmailFromRecord(record) ||
    null

  if (!email) return null

  const uid =
    (source.id != null && String(source.id)) ||
    (source.uid != null && String(source.uid)) ||
    (source.userIdx != null && String(source.userIdx)) ||
    email

  const displayName =
    (typeof source.name === 'string' && source.name) ||
    (typeof source.nickname === 'string' && source.nickname) ||
    null

  const photoURL =
    (typeof source.photoURL === 'string' && source.photoURL) ||
    (typeof source.profileImage === 'string' && source.profileImage) ||
    null

  const phoneNumber =
    (typeof source.phone === 'string' && source.phone) || null

  return {
    uid,
    email,
    displayName,
    photoURL,
    phoneNumber,
  }
}

export function normalizeUserFromAccessToken(accessToken: string) {
  const payload = decodeJwtPayload(accessToken)
  if (!payload) return null

  const email = pickEmailFromRecord(payload)

  const uid =
    (payload.sub != null && String(payload.sub)) ||
    (payload.userIdx != null && String(payload.userIdx)) ||
    (payload.id != null && String(payload.id)) ||
    (payload.userId != null && String(payload.userId)) ||
    email

  if (!uid) return null

  return {
    uid,
    email: email || (uid.includes('@') ? uid : `${uid}@ellieo.user`),
    displayName:
      (typeof payload.name === 'string' && payload.name) ||
      (typeof payload.nickname === 'string' && payload.nickname) ||
      (typeof payload.userName === 'string' && payload.userName) ||
      null,
    photoURL:
      (typeof payload.photoURL === 'string' && payload.photoURL) ||
      (typeof payload.profileImage === 'string' && payload.profileImage) ||
      null,
    phoneNumber:
      (typeof payload.phone === 'string' && payload.phone) ||
      (typeof payload.phoneNumber === 'string' && payload.phoneNumber) ||
      null,
  }
}

export async function persistAuthSession(
  t: Translate,
  loginData: unknown,
  deviceId: string,
  hints?: { email?: string | null; name?: string | null },
) {
  const tokens = extractEllieoTokens(loginData)
  if (!tokens.accessToken) {
    return { ok: false as const, error: t('auth.noAccessToken') }
  }

  await setEllieoSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    deviceId,
  })

  return {
    ok: true as const,
    // 네이티브 앱 로그인(/api/app-auth/*)은 쿠키 대신 이 토큰을 받아 키체인에 둔다
    tokens,
    user: buildAuthUserFromHints(hints ?? {}, {
      payload: loginData,
      accessToken: tokens.accessToken,
    }),
    profile: loginData,
  }
}

/** `deviceId`: the native app passes its own fixed id so login and /api/app-auth/refresh use the same device. */
type AuthOptions = { deviceId?: string }

export async function loginWithEmail(
  t: Translate,
  email: string,
  password: string,
  options?: AuthOptions,
) {
  const deviceId = options?.deviceId || (await getOrCreateDeviceId())
  const candidates = [
    { email, password, platform: 'web' },
    { email, password },
  ]

  let lastError = t('auth.loginFailed')
  // `api` 번역 키 (예: 'auth.invalidCredentials'). 앱이 다음 안내(가입하기, 비밀번호 찾기)를 고르는 데 쓴다
  let errorKey: string | null = null
  for (const body of candidates) {
    const { res, data } = await ellieoUpstreamFetch('auth/login', {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) {
      lastError = getAuthErrorMessage(t, data, lastError, res.status)
      errorKey = upstreamErrorKey(data, res.status)
      continue
    }

    const session = await persistAuthSession(t, data, deviceId, { email })
    if (session.ok) return session
    lastError = session.error
  }

  return { ok: false as const, error: lastError, errorKey }
}

export async function registerWithEmail(
  t: Translate,
  email: string,
  password: string,
  name?: string,
  options?: AuthOptions,
) {
  const deviceId = options?.deviceId || (await getOrCreateDeviceId())
  const displayName = name?.trim() || email.split('@')[0]
  const registerPaths = isMisaengEmail(email)
    ? ['auth/register/agent', 'auth/register']
    : ['auth/register', 'auth/register/agent']

  let signupError = t('auth.signupFailed')
  let emailInUse = false
  for (const path of registerPaths) {
    const { res, data } = await ellieoUpstreamFetch(path, {
      method: 'POST',
      body: { email, password, name: displayName, platform: 'web' },
      deviceId,
    })

    if (res.ok) {
      const tokens = extractEllieoTokens(data)
      if (tokens.accessToken) {
        return persistAuthSession(t, data, deviceId, {
          email,
          name: displayName,
        })
      }
      break
    }

    // 첫 경로의 구체적인 오류(이미 가입된 이메일 등)를 두 번째 경로의 일반 오류로 덮지 않는다
    if (signupError === t('auth.signupFailed')) {
      signupError = getAuthErrorMessage(t, data, signupError, res.status)
      emailInUse = signupError === t('auth.emailInUse')
    }
  }

  // 같은 비밀번호로 이미 가입한 사람은 그대로 로그인시킨다
  const login = await loginWithEmail(t, email, password, options)
  if (login.ok) return login

  // 가입을 하려던 것이니 로그인 오류(비밀번호 틀림)보다 가입 오류가 맞는 안내다
  return { ok: false as const, error: signupError, emailInUse }
}

function buildGoogleBodies(
  idToken: string,
  email?: string | null,
  name?: string | null,
) {
  return [
    { idToken, platform: 'web' },
    { idToken },
    { googleIdToken: idToken, platform: 'web' },
    { googleIdToken: idToken },
    { token: idToken },
    { idToken, email, name, platform: 'web' },
    { googleIdToken: idToken, email, name, platform: 'web' },
  ]
}

export async function loginWithGoogle(
  t: Translate,
  idToken: string,
  email?: string | null,
  name?: string | null,
  options?: AuthOptions,
) {
  const deviceId = options?.deviceId || (await getOrCreateDeviceId())
  let lastError = t('auth.googleLoginFailed')
  let lastStatus = 401

  for (const body of buildGoogleBodies(idToken, email, name)) {
    const { res, data } = await ellieoUpstreamFetch('auth/login/google', {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) {
      lastStatus = res.status
      lastError = getAuthErrorMessage(t, data, lastError, res.status)
      if (isUpstreamUnavailable(res.status)) {
        return { ok: false as const, error: lastError, status: lastStatus }
      }
      continue
    }

    const session = await persistAuthSession(t, data, deviceId, { email, name })
    if (session.ok) return session
    lastError = session.error
  }

  return { ok: false as const, error: lastError, status: lastStatus }
}

export async function registerWithGoogle(
  t: Translate,
  idToken: string,
  email?: string | null,
  name?: string | null,
  asAgent = false,
  options?: AuthOptions,
) {
  const deviceId = options?.deviceId || (await getOrCreateDeviceId())
  const registerPath = asAgent
    ? 'auth/register/google/agent'
    : 'auth/register/google'

  const registerBodies = buildGoogleBodies(idToken, email, name)
  let lastError = asAgent
    ? t('auth.agentGoogleSignupFailed')
    : t('auth.googleSignupFailed')
  let lastStatus = 401

  for (const body of registerBodies) {
    const { res, data } = await ellieoUpstreamFetch(registerPath, {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) {
      lastStatus = res.status
      lastError = getAuthErrorMessage(t, data, lastError, res.status)
      if (isUpstreamUnavailable(res.status)) {
        return { ok: false as const, error: lastError, status: lastStatus }
      }
      continue
    }

    const session = await persistAuthSession(t, data, deviceId, { email, name })
    if (session.ok) return session
  }

  const login = await loginWithGoogle(t, idToken, email, name, options)
  if (login.ok) return login

  return {
    ok: false as const,
    error: login.error || lastError,
    status: 'status' in login ? login.status : lastStatus,
  }
}

export async function loginOrRegisterWithGoogle(
  t: Translate,
  idToken: string,
  email?: string | null,
  name?: string | null,
  options?: AuthOptions & {
    loginOnly?: boolean
    skipLoginAttempt?: boolean
  },
) {
  if (!options?.skipLoginAttempt) {
    const login = await loginWithGoogle(t, idToken, email, name, options)
    if (login.ok) {
      return { ...login, registered: false }
    }

    if ('status' in login && login.status && isUpstreamUnavailable(login.status)) {
      return login
    }

    if (options?.loginOnly) {
      return login
    }
  }

  const asAgent = isMisaengEmail(email)
  const register = await registerWithGoogle(t, idToken, email, name, asAgent, options)
  if (register.ok) {
    return { ...register, registered: true }
  }

  return register
}

/** Ellieo가 확인해 준 액세스 토큰 (sha256 → 유효 기한). 같은 토큰을 요청마다 다시 묻지 않도록 */
const verifiedTokens = new Map<string, number>()
const VERIFIED_TTL_MS = 5 * 60_000

/**
 * 액세스 토큰을 믿어도 되는지. JWT 내용은 누구나 만들 수 있으므로 Ellieo 서버가 받아 준 토큰만 쓴다.
 * 만료(exp)가 지났거나, Ellieo가 거절했거나, 확인할 수 없으면 false.
 */
export async function verifyEllieoAccessToken(accessToken: string): Promise<boolean> {
  const payload = decodeJwtPayload(accessToken)
  const expMs = typeof payload?.exp === 'number' ? payload.exp * 1000 : null
  const now = Date.now()
  if (expMs !== null && expMs <= now) return false

  const key = createHash('sha256').update(accessToken).digest('hex')
  const until = verifiedTokens.get(key)
  if (until && until > now) return true

  const accepted = await isEllieoTokenAccepted(accessToken)
  if (!accepted) return false
  if (verifiedTokens.size > 5000) verifiedTokens.clear()
  verifiedTokens.set(key, Math.min(now + VERIFIED_TTL_MS, expMs ?? Infinity))
  return true
}

/**
 * 현재 요청의 사용자와 Ellieo 액세스 토큰. 앱은 Bearer 토큰, 웹은 쿠키(만료 시 리프레시 토큰으로 갱신).
 * 탈퇴한 계정(프로필 status 'deleted')은 로그인하지 않은 것으로 본다 — `allowDeleted`는 탈퇴 요청을 다시 보낼 때만.
 */
export async function resolveAuthenticatedSession(options: { allowDeleted?: boolean } = {}) {
  if (isSupabaseAuthMode()) return resolveSupabaseModeSession(options)
  const bearer = await getRequestBearerToken()
  let accessToken: string | null = null
  if (bearer) {
    accessToken = (await verifyEllieoAccessToken(bearer)) ? bearer : null
  } else {
    accessToken = await getEllieoAccessToken()
    const refreshToken = await getEllieoRefreshToken()

    if (accessToken && !(await verifyEllieoAccessToken(accessToken))) {
      accessToken = null
    }
    if (!accessToken && refreshToken) {
      const refreshed = (await refreshEllieoAccessToken()) || null
      accessToken = refreshed && (await verifyEllieoAccessToken(refreshed)) ? refreshed : null
    }
  }

  if (!accessToken) return null
  const user = normalizeUserFromAccessToken(accessToken)
  if (!user) return null
  if (!options.allowDeleted && (await isAccountDeleted(user.uid))) return null
  return { user, accessToken }
}

/** 현재 요청의 사용자. 앱은 Bearer 토큰, 웹은 쿠키(만료 시 리프레시 토큰으로 갱신). 탈퇴한 계정은 null. */
export async function resolveAuthenticatedUser() {
  return (await resolveAuthenticatedSession())?.user ?? null
}

type ResolvedSession = {
  user: { uid: string; email: string; displayName: string | null; photoURL: string | null; phoneNumber: string | null; authUserId?: string }
  accessToken: string
}

/**
 * Misaeng's own login (MISAENG_AUTH_PROVIDER=supabase). App: Bearer Supabase token. Web: misaeng_* cookies.
 * Switch-over: an Ellieo token is still accepted (checked with Ellieo as before) — the app swaps it at its next
 * /api/app-auth/refresh, the web swaps it right here for a Misaeng session on the same uid.
 */
async function resolveSupabaseModeSession(options: { allowDeleted?: boolean }): Promise<ResolvedSession | null> {
  let resolved: ResolvedSession | null = null
  const bearer = await getRequestBearerToken()
  if (bearer) {
    if (isSupabaseToken(bearer)) {
      const user = await userForMisaengToken(bearer)
      resolved = user ? { user, accessToken: bearer } : null
    } else if (await verifyEllieoAccessToken(bearer)) {
      const user = normalizeUserFromAccessToken(bearer)
      resolved = user ? { user, accessToken: bearer } : null
    }
  } else {
    resolved = await resolveMisaengCookieSession()
    if (!resolved) resolved = await upgradeLegacyWebCookies()
  }
  if (!resolved) return null
  if (!options.allowDeleted && (await isAccountDeleted(resolved.user.uid))) return null
  return resolved
}

/** A web visitor with a live Ellieo cookie session → a Misaeng session for the same uid (Ellieo cookies cleared). */
async function upgradeLegacyWebCookies(): Promise<ResolvedSession | null> {
  const jar = await cookies()
  // the cookie itself — never getEllieoAccessToken(), which falls back to the server's API key
  let access = jar.get(ELLIEO_ACCESS_COOKIE)?.value?.trim() || null
  if (access && !(await verifyEllieoAccessToken(access))) access = null
  if (!access && (await getEllieoRefreshToken())) {
    const refreshed = await refreshEllieoAccessToken().catch(() => null)
    access = refreshed && (await verifyEllieoAccessToken(refreshed)) ? refreshed : null
  }
  if (!access) return null
  const member = normalizeUserFromAccessToken(access)
  if (!member) return null
  if (isPlaceholderEmail(member.email) || (await isAccountDeleted(member.uid))) {
    return { user: member, accessToken: access }
  }
  try {
    const upgraded = await upgradeEllieoWebSession(member)
    if (upgraded) {
      await clearEllieoSession().catch(() => null)
      return upgraded
    }
  } catch (error) {
    console.error('Ellieo → Misaeng session upgrade failed:', error)
  }
  return { user: member, accessToken: access }
}
