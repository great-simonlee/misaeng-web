import { createPrivateKey, sign } from 'node:crypto'

/*
 * Sign in with Apple token revocation on account deletion (App Store guideline 5.1.1(v),
 * https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens).
 *
 * Needs a Sign in with Apple key (.p8) — env: APPLE_TEAM_ID, APPLE_SIWA_KEY_ID, APPLE_SIWA_PRIVATE_KEY (PEM, "\n" allowed),
 * APPLE_CLIENT_ID (default com.misaeng.nyc). Without them everything here is a no-op.
 * Apple only revokes with a token, so the server keeps the user's Apple refresh token (table apple_siwa_tokens,
 * supabase/account_deletion.sql): on every Apple sign-in that Ellieo answered with a login (the authorization code is
 * still unused then), the code is exchanged for a refresh token. On deletion that token is revoked; a fresh
 * authorizationCode sent with the deletion request works too.
 */

const APPLE_AUTH = 'https://appleid.apple.com/auth'

function appleConfig() {
  const teamId = process.env.APPLE_TEAM_ID?.trim()
  const keyId = process.env.APPLE_SIWA_KEY_ID?.trim()
  const privateKey = process.env.APPLE_SIWA_PRIVATE_KEY?.trim().replace(/\\n/g, '\n')
  const clientId = process.env.APPLE_CLIENT_ID?.trim() || 'com.misaeng.nyc'
  return teamId && keyId && privateKey ? { teamId, keyId, privateKey, clientId } : null
}

export function isAppleRevokeConfigured() {
  return Boolean(appleConfig())
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

/** ES256 client secret JWT (valid 5 minutes). */
function clientSecret(config: NonNullable<ReturnType<typeof appleConfig>>) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: config.keyId, typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ iss: config.teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: config.clientId }),
  )
  const data = `${header}.${payload}`
  const signature = sign('sha256', Buffer.from(data), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: 'ieee-p1363',
  })
  return `${data}.${b64url(signature)}`
}

async function appleForm(path: 'token' | 'revoke', fields: Record<string, string>) {
  const config = appleConfig()
  if (!config) return null
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: clientSecret(config), ...fields })
  const res = await fetch(`${APPLE_AUTH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  })
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
  return { ok: res.ok, status: res.status, data }
}

// MARK: token store (supabase/account_deletion.sql)

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

async function tokenRest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const c = supabase()
  if (!c) return null
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`apple_siwa_tokens ${res.status}: ${text.slice(0, 200)}`)
  return text ? (JSON.parse(text) as unknown) : null
}

/**
 * After an Apple sign-in: exchange the (unused) authorization code for a refresh token and keep it for revocation.
 * Never throws. Skipped when Apple keys are not configured.
 */
export async function rememberAppleRefreshToken(uid: string, authorizationCode: string): Promise<void> {
  if (!uid || !authorizationCode || !isAppleRevokeConfigured()) return
  try {
    const result = await appleForm('token', { code: authorizationCode, grant_type: 'authorization_code' })
    const refreshToken = typeof result?.data?.refresh_token === 'string' ? result.data.refresh_token : null
    if (!refreshToken) {
      console.warn('Apple code exchange failed:', result?.status, result?.data?.error)
      return
    }
    await tokenRest('apple_siwa_tokens?on_conflict=user_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ user_id: uid, refresh_token: refreshToken, updated_at: new Date().toISOString() }),
    })
  } catch (error) {
    console.error('Apple refresh token save error:', error)
  }
}

export type AppleRevokeOutcome = 'revoked' | 'not_configured' | 'no_token' | 'failed'

/**
 * Account deletion: revoke the user's Sign in with Apple tokens. Uses the stored refresh token, or exchanges
 * `authorizationCode` (sent by the app with the deletion request) first. Removes the stored token. Never throws.
 */
export async function revokeAppleTokens(uid: string, authorizationCode?: string | null): Promise<AppleRevokeOutcome> {
  if (!isAppleRevokeConfigured()) return 'not_configured'
  try {
    const tokens: { token: string; hint: 'refresh_token' | 'access_token' }[] = []
    const rows = (await tokenRest(
      `apple_siwa_tokens?user_id=eq.${encodeURIComponent(uid)}&select=refresh_token`,
    ).catch(() => null)) as { refresh_token: string }[] | null
    for (const row of rows ?? []) tokens.push({ token: row.refresh_token, hint: 'refresh_token' })

    if (authorizationCode) {
      const exchanged = await appleForm('token', { code: authorizationCode, grant_type: 'authorization_code' })
      const refresh = exchanged?.data?.refresh_token
      const access = exchanged?.data?.access_token
      if (typeof refresh === 'string') tokens.push({ token: refresh, hint: 'refresh_token' })
      else if (typeof access === 'string') tokens.push({ token: access, hint: 'access_token' })
    }
    if (tokens.length === 0) return 'no_token'

    let revoked = false
    for (const item of tokens) {
      const result = await appleForm('revoke', { token: item.token, token_type_hint: item.hint })
      if (result?.ok) revoked = true
      else console.warn('Apple token revoke failed:', result?.status, result?.data?.error)
    }
    await tokenRest(`apple_siwa_tokens?user_id=eq.${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    }).catch(() => null)
    return revoked ? 'revoked' : 'failed'
  } catch (error) {
    console.error('Apple token revoke error:', error)
    return 'failed'
  }
}
