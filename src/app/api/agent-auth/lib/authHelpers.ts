import { isMisaengEmail } from '@lib/constants/nyc'

import {
  ellieoUpstreamFetch,
  extractEllieoTokens,
  getEllieoAccessToken,
  getEllieoRefreshToken,
  getOrCreateDeviceId,
  refreshEllieoAccessToken,
  setEllieoSession,
} from './ellieoServer'

export function getAuthErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback
  if ('message' in data && typeof data.message === 'string') return data.message
  if ('error' in data && typeof data.error === 'string') return data.error
  if ('raw' in data && typeof data.raw === 'string' && data.raw.includes('502')) {
    return 'Ellieo 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
  }
  return fallback
}

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
  loginData: unknown,
  deviceId: string,
  hints?: { email?: string | null; name?: string | null },
) {
  const tokens = extractEllieoTokens(loginData)
  if (!tokens.accessToken) {
    return { ok: false as const, error: '액세스 토큰을 받지 못했어요.' }
  }

  await setEllieoSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    deviceId,
  })

  return {
    ok: true as const,
    user: buildAuthUserFromHints(hints ?? {}, {
      payload: loginData,
      accessToken: tokens.accessToken,
    }),
    profile: loginData,
  }
}

export async function loginWithEmail(email: string, password: string) {
  const deviceId = await getOrCreateDeviceId()
  const candidates = [
    { email, password, platform: 'web' },
    { email, password },
  ]

  let lastError = '로그인에 실패했어요.'
  for (const body of candidates) {
    const { res, data } = await ellieoUpstreamFetch('auth/login', {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) {
      lastError = getAuthErrorMessage(data, lastError)
      continue
    }

    const session = await persistAuthSession(data, deviceId, { email })
    if (session.ok) return session
    lastError = session.error
  }

  return { ok: false as const, error: lastError }
}

export async function registerWithEmail(
  email: string,
  password: string,
  name?: string,
) {
  const deviceId = await getOrCreateDeviceId()
  const displayName = name?.trim() || email.split('@')[0]
  const registerPaths = isMisaengEmail(email)
    ? ['auth/register/agent', 'auth/register']
    : ['auth/register', 'auth/register/agent']

  let signupError = '회원가입에 실패했어요.'
  for (const path of registerPaths) {
    const { res, data } = await ellieoUpstreamFetch(path, {
      method: 'POST',
      body: { email, password, name: displayName, platform: 'web' },
      deviceId,
    })

    if (res.ok) {
      const tokens = extractEllieoTokens(data)
      if (tokens.accessToken) {
        return persistAuthSession(data, deviceId, {
          email,
          name: displayName,
        })
      }
      break
    }

    signupError = getAuthErrorMessage(data, signupError)
  }

  const login = await loginWithEmail(email, password)
  if (login.ok) return login

  return { ok: false as const, error: login.error || signupError }
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
  idToken: string,
  email?: string | null,
  name?: string | null,
) {
  const deviceId = await getOrCreateDeviceId()
  let lastError = 'Google 로그인에 실패했어요.'
  let lastStatus = 401

  for (const body of buildGoogleBodies(idToken, email, name)) {
    const { res, data } = await ellieoUpstreamFetch('auth/login/google', {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) {
      lastStatus = res.status
      lastError = getAuthErrorMessage(data, lastError)
      if (isUpstreamUnavailable(res.status)) {
        return { ok: false as const, error: lastError, status: lastStatus }
      }
      continue
    }

    const session = await persistAuthSession(data, deviceId, { email, name })
    if (session.ok) return session
    lastError = session.error
  }

  return { ok: false as const, error: lastError, status: lastStatus }
}

export async function registerWithGoogle(
  idToken: string,
  email?: string | null,
  name?: string | null,
  asAgent = false,
) {
  const deviceId = await getOrCreateDeviceId()
  const registerPath = asAgent
    ? 'auth/register/google/agent'
    : 'auth/register/google'

  const registerBodies = buildGoogleBodies(idToken, email, name)
  let lastError = asAgent
    ? '에이전트 Google 회원가입에 실패했어요.'
    : 'Google 회원가입에 실패했어요.'
  let lastStatus = 401

  for (const body of registerBodies) {
    const { res, data } = await ellieoUpstreamFetch(registerPath, {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) {
      lastStatus = res.status
      lastError = getAuthErrorMessage(data, lastError)
      if (isUpstreamUnavailable(res.status)) {
        return { ok: false as const, error: lastError, status: lastStatus }
      }
      continue
    }

    const session = await persistAuthSession(data, deviceId, { email, name })
    if (session.ok) return session
  }

  const login = await loginWithGoogle(idToken, email, name)
  if (login.ok) return login

  return {
    ok: false as const,
    error: login.error || lastError,
    status: 'status' in login ? login.status : lastStatus,
  }
}

export async function loginOrRegisterWithGoogle(
  idToken: string,
  email?: string | null,
  name?: string | null,
  options?: {
    loginOnly?: boolean
    skipLoginAttempt?: boolean
  },
) {
  if (!options?.skipLoginAttempt) {
    const login = await loginWithGoogle(idToken, email, name)
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
  const register = await registerWithGoogle(idToken, email, name, asAgent)
  if (register.ok) {
    return { ...register, registered: true }
  }

  return register
}

/** Ellieo 로그인 세션(액세스 토큰)만으로 현재 사용자 확인 — 프로필 API 호출 없음 */
export async function resolveAuthenticatedUser() {
  let accessToken = await getEllieoAccessToken()
  const refreshToken = await getEllieoRefreshToken()

  if (!accessToken && refreshToken) {
    accessToken = (await refreshEllieoAccessToken()) || null
  }

  if (!accessToken) return null

  return normalizeUserFromAccessToken(accessToken)
}
