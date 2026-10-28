import { createHash } from 'node:crypto'

import { cookies } from 'next/headers'

import { resolveUid, sessionFromEllieoMember, uidForAuthUser } from './accounts.server'
import { AuthApiError, getUserForToken, isSupabaseToken, refreshSession, type AuthSession } from './supabaseAuth.server'

/*
 * Web session cookies for Misaeng's own login (Supabase Auth). The app keeps the same tokens in the Keychain and
 * sends `Authorization: Bearer`. The old Ellieo cookies (ellieo_app_*) are only read during the switch-over.
 */

export const MISAENG_ACCESS_COOKIE = 'misaeng_access'
export const MISAENG_REFRESH_COOKIE = 'misaeng_refresh'
const REFRESH_MAX_AGE = 60 * 60 * 24 * 60

/** The signed-in user as the rest of the app sees it (same shape the Ellieo helpers returned). */
export type SessionUser = {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  phoneNumber: string | null
  /** Supabase Auth user id (account deletion). */
  authUserId: string
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge }
}

export async function setMisaengSession(session: Pick<AuthSession, 'accessToken' | 'refreshToken' | 'expiresIn'>) {
  const jar = await cookies()
  jar.set(MISAENG_ACCESS_COOKIE, session.accessToken, cookieOptions(Math.max(60, session.expiresIn - 30)))
  jar.set(MISAENG_REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE))
}

export async function clearMisaengSession() {
  const jar = await cookies()
  jar.set(MISAENG_ACCESS_COOKIE, '', cookieOptions(0))
  jar.set(MISAENG_REFRESH_COOKIE, '', cookieOptions(0))
}

/** Tokens Supabase accepted (sha256 → user + until). Saves a Supabase round trip per request. */
const verified = new Map<string, { user: SessionUser; until: number }>()
const VERIFIED_TTL_MS = 5 * 60_000

function expiryMs(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** The user behind a Supabase access token, or null (expired, revoked, not ours). */
export async function userForMisaengToken(accessToken: string): Promise<SessionUser | null> {
  if (!isSupabaseToken(accessToken)) return null
  const now = Date.now()
  const exp = expiryMs(accessToken)
  if (exp !== null && exp <= now) return null
  const key = createHash('sha256').update(accessToken).digest('hex')
  const hit = verified.get(key)
  if (hit && hit.until > now) return hit.user

  let authUser
  try {
    authUser = await getUserForToken(accessToken)
  } catch (error) {
    if (error instanceof AuthApiError && error.status < 500) return null
    throw error
  }
  const uid = (await uidForAuthUser(authUser.id)) ?? (await resolveUid(authUser)).uid
  const meta = authUser.metadata
  const user: SessionUser = {
    uid,
    email: authUser.email || `${uid}@misaeng.user`,
    displayName: (typeof meta.name === 'string' && meta.name) || (typeof meta.full_name === 'string' && meta.full_name) || null,
    photoURL: (typeof meta.avatar_url === 'string' && meta.avatar_url) || null,
    phoneNumber: null,
    authUserId: authUser.id,
  }
  if (verified.size > 5000) verified.clear()
  verified.set(key, { user, until: Math.min(now + VERIFIED_TTL_MS, exp ?? Infinity) })
  return user
}

/** Web: the cookie session, refreshed when the access token expired. */
export async function resolveMisaengCookieSession(): Promise<{ user: SessionUser; accessToken: string } | null> {
  const jar = await cookies()
  const access = jar.get(MISAENG_ACCESS_COOKIE)?.value?.trim() || null
  if (access) {
    const user = await userForMisaengToken(access)
    if (user) return { user, accessToken: access }
  }
  const refresh = jar.get(MISAENG_REFRESH_COOKIE)?.value?.trim() || null
  if (!refresh) return null
  try {
    const session = await refreshSession(refresh)
    await setMisaengSession(session).catch(() => null) // read-only contexts (server components) can't set cookies
    const user = await userForMisaengToken(session.accessToken)
    return user ? { user, accessToken: session.accessToken } : null
  } catch (error) {
    if (error instanceof AuthApiError && error.status < 500) {
      await clearMisaengSession().catch(() => null)
      return null
    }
    throw error
  }
}

/**
 * Switch-over: a web visitor still holding a valid Ellieo session gets a Misaeng session for the same uid,
 * without signing in again. The Ellieo cookies are dropped afterwards.
 */
export async function upgradeEllieoWebSession(member: { uid: string; email: string; displayName?: string | null }) {
  const session = await sessionFromEllieoMember({ uid: member.uid, email: member.email, name: member.displayName })
  await setMisaengSession(session)
  const user = await userForMisaengToken(session.accessToken)
  return user ? { user, accessToken: session.accessToken } : null
}
