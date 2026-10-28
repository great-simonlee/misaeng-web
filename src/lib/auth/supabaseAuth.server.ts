/*
 * Supabase Auth (GoTrue) over REST — Misaeng's own login, replacing Ellieo. Same direct-fetch style as
 * src/lib/points/rest.server.ts. Public calls use the anon key; admin calls use the service role key (server only).
 * Dashboard setup (providers, SMTP, email templates) is in docs/AUTH_SUPABASE.md.
 */

export type AuthSession = {
  accessToken: string
  refreshToken: string
  /** seconds */
  expiresIn: number
  user: AuthUser
}

export type AuthUser = {
  id: string
  email: string | null
  emailConfirmed: boolean
  /** google | apple | email … */
  providers: string[]
  metadata: Record<string, unknown>
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** GoTrue error_code, e.g. invalid_credentials, email_exists, otp_expired, user_already_exists */
    readonly code: string | null,
  ) {
    super(message)
    this.name = 'AuthApiError'
  }
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && anon && service ? { url, anon, service } : null
}

export function isSupabaseAuthConfigured() {
  return Boolean(config())
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; bearer?: string | null; admin?: boolean } = {},
): Promise<T> {
  const c = config()
  if (!c) throw new AuthApiError('Supabase Auth is not configured.', 503, 'not_configured')
  const key = init.admin ? c.service : c.anon
  let res: Response
  try {
    res = await fetch(`${c.url}/auth/v1/${path}`, {
      method: init.method || (init.body === undefined ? 'GET' : 'POST'),
      headers: {
        apikey: key,
        Authorization: `Bearer ${init.bearer ?? key}`,
        'Content-Type': 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    throw new AuthApiError(`Supabase Auth unreachable: ${(error as Error)?.message || 'network error'}`, 503, 'unreachable')
  }
  const text = await res.text()
  let data: Record<string, unknown> | null = null
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const code = (data?.error_code ?? data?.code ?? data?.error ?? null) as string | null
    const message = String(data?.msg ?? data?.message ?? data?.error_description ?? data?.error ?? `HTTP ${res.status}`)
    throw new AuthApiError(message, res.status, typeof code === 'string' ? code : null)
  }
  return data as T
}

function toUser(raw: Record<string, unknown> | null | undefined): AuthUser {
  const r = raw ?? {}
  const appMeta = (r.app_metadata ?? {}) as { providers?: string[]; provider?: string }
  return {
    id: String(r.id ?? ''),
    email: typeof r.email === 'string' && r.email ? r.email.toLowerCase() : null,
    emailConfirmed: Boolean(r.email_confirmed_at || r.confirmed_at),
    providers: appMeta.providers ?? (appMeta.provider ? [appMeta.provider] : []),
    metadata: (r.user_metadata ?? {}) as Record<string, unknown>,
  }
}

function toSession(raw: Record<string, unknown>): AuthSession {
  return {
    accessToken: String(raw.access_token ?? ''),
    refreshToken: String(raw.refresh_token ?? ''),
    expiresIn: Number(raw.expires_in ?? 3600),
    user: toUser(raw.user as Record<string, unknown>),
  }
}

// MARK: sign-in

export async function signInWithPassword(email: string, password: string) {
  return toSession(await call('token?grant_type=password', { body: { email, password } }))
}

/** Native Google / Apple sign-in: Supabase checks the token against the provider's client IDs (dashboard). */
export async function signInWithIdToken(provider: 'google' | 'apple', idToken: string, nonce?: string | null) {
  return toSession(
    await call('token?grant_type=id_token', { body: { provider, id_token: idToken, ...(nonce ? { nonce } : {}) } }),
  )
}

export async function refreshSession(refreshToken: string) {
  return toSession(await call('token?grant_type=refresh_token', { body: { refresh_token: refreshToken } }))
}

/** Email sign-up. With "Confirm email" on, Supabase emails a 6-digit code and returns no session yet. */
export async function signUpWithEmail(email: string, password: string, metadata: Record<string, unknown> = {}) {
  const data = await call<Record<string, unknown>>('signup', { body: { email, password, data: metadata } })
  // with confirmation on the body is the user; with it off it is a session
  return data.access_token ? { session: toSession(data), user: toUser(data.user as Record<string, unknown>) } : { session: null, user: toUser(data) }
}

/** Emails a 6-digit code: type signup (resend the sign-up code) or recovery (password reset). */
export async function sendEmailCode(type: 'signup' | 'recovery', email: string) {
  if (type === 'recovery') await call('recover', { body: { email } })
  else await call('resend', { body: { type: 'signup', email } })
}

/** Checks an emailed code → session (signup confirms the address, recovery lets the user set a new password). */
export async function verifyEmailCode(type: 'signup' | 'recovery' | 'email', email: string, token: string) {
  return toSession(await call('verify', { body: { type, email, token } }))
}

/** The user behind an access token (Supabase rejects expired or forged ones). */
export async function getUserForToken(accessToken: string) {
  return toUser(await call('user', { bearer: accessToken }))
}

export async function updatePasswordWithToken(accessToken: string, password: string) {
  return toUser(await call('user', { method: 'PUT', bearer: accessToken, body: { password } }))
}

export async function signOut(accessToken: string) {
  await call('logout', { bearer: accessToken, body: {} }).catch(() => null)
}

// MARK: admin (service role)

/** Creates a confirmed user (legacy members whose identity was already proven another way). */
export async function adminCreateUser(email: string, options: { password?: string; metadata?: Record<string, unknown> } = {}) {
  return toUser(
    await call('admin/users', {
      admin: true,
      body: {
        email,
        email_confirm: true,
        ...(options.password ? { password: options.password } : {}),
        user_metadata: options.metadata ?? {},
      },
    }),
  )
}

export async function adminSetPassword(userId: string, password: string) {
  return toUser(await call(`admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', admin: true, body: { password } }))
}

export async function adminDeleteUser(userId: string) {
  await call(`admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE', admin: true })
}

/** The Supabase user with this email, or null (generate_link returns the user without sending anything). */
export async function adminFindUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const data = await call<Record<string, unknown>>('admin/generate_link', { admin: true, body: { type: 'magiclink', email } })
    return data?.id ? toUser(data) : null
  } catch (error) {
    if (error instanceof AuthApiError && (error.status === 404 || error.code === 'user_not_found')) return null
    throw error
  }
}

/**
 * A session for a user without their password — only after the server proved who they are another way
 * (a valid Ellieo session during the switch-over). Nothing is emailed.
 */
export async function adminCreateSession(email: string) {
  const link = await call<Record<string, unknown>>('admin/generate_link', { admin: true, body: { type: 'magiclink', email } })
  const tokenHash = String(link.hashed_token ?? (link.properties as { hashed_token?: string } | undefined)?.hashed_token ?? '')
  if (!tokenHash) throw new AuthApiError('generate_link returned no token', 500, 'no_token')
  return toSession(await call('verify', { body: { type: 'magiclink', token_hash: tokenHash } }))
}

/** True when the JWT looks like one Supabase issued for this project (cheap check before calling Supabase). */
export function isSupabaseToken(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { iss?: string }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    return Boolean(url && payload.iss && payload.iss.startsWith(`${url.replace(/\/$/, '')}/auth/v1`))
  } catch {
    return false
  }
}
