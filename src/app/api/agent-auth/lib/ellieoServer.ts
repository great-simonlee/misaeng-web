import { cookies } from 'next/headers'

export const ELLIEO_ACCESS_COOKIE = 'ellieo_app_access'
export const ELLIEO_REFRESH_COOKIE = 'ellieo_app_refresh'
export const ELLIEO_DEVICE_COOKIE = 'ellieo_app_device'

const ACCESS_MAX_AGE = 60 * 25
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

export function getEllieoBaseUrl() {
  return (process.env.APP_CONNECT_API_BASE_URL || '').trim().replace(/\/$/, '')
}

export function getDefaultDeviceId() {
  return (process.env.APP_CONNECT_DEVICE_ID || '').trim()
}

export async function getEllieoAccessToken() {
  const jar = await cookies()
  const fromCookie = jar.get(ELLIEO_ACCESS_COOKIE)?.value?.trim()
  if (fromCookie) return fromCookie
  return (process.env.APP_CONNECT_API_KEY || '').trim() || null
}

export async function getEllieoRefreshToken() {
  const jar = await cookies()
  return jar.get(ELLIEO_REFRESH_COOKIE)?.value?.trim() || null
}

export function extractEllieoTokens(payload: unknown) {
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload

  if (!data || typeof data !== 'object') {
    return { accessToken: null, refreshToken: null }
  }

  const accessToken =
    ('accessToken' in data && data.accessToken) ||
    ('access_token' in data && data.access_token) ||
    ('token' in data && data.token) ||
    ('tokens' in data &&
      data.tokens &&
      typeof data.tokens === 'object' &&
      (('accessToken' in data.tokens && data.tokens.accessToken) ||
        ('access' in data.tokens && data.tokens.access))) ||
    null

  const refreshToken =
    ('refreshToken' in data && data.refreshToken) ||
    ('refresh_token' in data && data.refresh_token) ||
    ('tokens' in data &&
      data.tokens &&
      typeof data.tokens === 'object' &&
      (('refreshToken' in data.tokens && data.tokens.refreshToken) ||
        ('refresh' in data.tokens && data.tokens.refresh))) ||
    null

  return {
    accessToken: accessToken ? String(accessToken) : null,
    refreshToken: refreshToken ? String(refreshToken) : null,
  }
}

export async function getOrCreateDeviceId() {
  const jar = await cookies()
  let deviceId = jar.get(ELLIEO_DEVICE_COOKIE)?.value?.trim()

  if (!deviceId) {
    deviceId =
      getDefaultDeviceId() ||
      `erp-${crypto.randomUUID()}`
  }

  return deviceId
}

export async function setEllieoSession(args: {
  accessToken: string | null
  refreshToken: string | null
  deviceId: string | null
}) {
  const jar = await cookies()
  const secure = process.env.NODE_ENV === 'production'

  if (args.deviceId) {
    jar.set(ELLIEO_DEVICE_COOKIE, args.deviceId, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    })
  }

  if (args.accessToken) {
    jar.set(ELLIEO_ACCESS_COOKIE, args.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    })
  }

  if (args.refreshToken) {
    jar.set(ELLIEO_REFRESH_COOKIE, args.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    })
  }
}

export async function clearEllieoSession() {
  const jar = await cookies()
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }

  jar.set(ELLIEO_ACCESS_COOKIE, '', opts)
  jar.set(ELLIEO_REFRESH_COOKIE, '', opts)
}

async function buildHeaders(options: {
  includeJsonBody?: boolean
  accessToken?: string | null
  deviceId?: string | null
}) {
  const token =
    options.accessToken === undefined
      ? await getEllieoAccessToken()
      : options.accessToken
  const deviceId = options.deviceId || (await getOrCreateDeviceId())

  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.includeJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(deviceId ? { 'x-device-id': deviceId } : {}),
  }
}

export async function ellieoUpstreamFetch(
  path: string,
  options: {
    method?: string
    body?: unknown
    deviceId?: string | null
  } = {},
) {
  const baseUrl = getEllieoBaseUrl()

  if (!baseUrl) {
    throw new Error('APP_CONNECT_API_BASE_URL is not configured')
  }

  const cleanPath = path.replace(/^\/+/, '')
  const url = `${baseUrl}/${cleanPath}`
  const deviceId = options.deviceId || (await getOrCreateDeviceId())
  const hasBody =
    options.body != null &&
    options.method !== 'GET' &&
    options.method !== 'HEAD'

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: await buildHeaders({
      includeJsonBody: hasBody,
      accessToken: null,
      deviceId,
    }),
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  let data: unknown = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text ? { raw: text } : null
  }

  return {
    res: response,
    data,
  }
}

export async function refreshEllieoAccessToken() {
  const refreshToken = await getEllieoRefreshToken()
  if (!refreshToken) return null

  const deviceId = await getOrCreateDeviceId()
  const attempts = [{ refreshToken }, { token: refreshToken }]

  for (const body of attempts) {
    const { res, data } = await ellieoUpstreamFetch('auth/refresh', {
      method: 'POST',
      body,
      deviceId,
    })

    if (!res.ok) continue
    const tokens = extractEllieoTokens(data)
    if (!tokens.accessToken) continue

    await setEllieoSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || refreshToken,
      deviceId,
    })

    return tokens.accessToken
  }

  return null
}

export async function ellieoAuthorizedFetch(
  path: string,
  options: {
    method?: string
    body?: unknown
    retryOn401?: boolean
  } = {},
) {
  const baseUrl = getEllieoBaseUrl()
  if (!baseUrl) {
    throw new Error('APP_CONNECT_API_BASE_URL is not configured')
  }

  const method = (options.method || 'GET').toUpperCase()
  const hasBody = options.body != null && method !== 'GET' && method !== 'HEAD'
  const cleanPath = path.replace(/^\/+/, '')
  const url = `${baseUrl}/${cleanPath}`
  const deviceId = await getOrCreateDeviceId()

  const doFetch = async () => {
    const response = await fetch(url, {
      method,
      headers: await buildHeaders({
        includeJsonBody: hasBody,
        deviceId,
      }),
      body: hasBody ? JSON.stringify(options.body) : undefined,
    })

    const text = await response.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text ? { raw: text } : null
    }

    return { res: response, data }
  }

  let result = await doFetch()
  if (result.res.status === 401 && options.retryOn401 !== false) {
    const refreshed = await refreshEllieoAccessToken()
    if (refreshed) {
      result = await doFetch()
    }
  }

  return result
}
