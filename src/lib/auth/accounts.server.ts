/*
 * Supabase Auth user ↔ Misaeng uid (supabase/misaeng_auth.sql). Existing members keep their Ellieo-era uid, so posts,
 * points, saves and profiles stay where they are. A uid is linked once (auth_accounts.uid is unique):
 *   1. proven through Ellieo (password or a live Ellieo session, during the switch-over)  → that Ellieo uid
 *   2. a confirmed email that matches an unclaimed legacy member (legacy_users)           → that member's uid
 *   3. otherwise a new member                                                             → uid = Supabase user id
 */

import { authRest as rest, enc } from './store.server'
import { adminCreateSession, adminCreateUser, adminFindUserByEmail, type AuthUser } from './supabaseAuth.server'

/** `MISAENG_AUTH_PROVIDER=supabase` switches sign-in to Supabase; anything else keeps Ellieo (until set up). */
export function isSupabaseAuthMode() {
  return (process.env.MISAENG_AUTH_PROVIDER || '').trim().toLowerCase() === 'supabase'
}

/**
 * Switch-over window: an existing member's first email sign-in is checked once against Ellieo, then the password
 * lives in Supabase. `ELLIEO_LEGACY_LOGIN=off` ends it (members without a Supabase password then reset by email).
 */
export function isEllieoLegacyLoginOn() {
  return (process.env.ELLIEO_LEGACY_LOGIN || 'on').trim().toLowerCase() !== 'off'
}

type AccountRow = { auth_user_id: string; uid: string; email: string | null; linked_via: string }

/** Ellieo filled in `<id>@ellieo.user` for accounts without an email; those can't be matched or emailed. */
export function isPlaceholderEmail(email: string | null | undefined) {
  return !email || /@ellieo\.user$/i.test(email)
}

async function accountForAuthUser(authUserId: string) {
  const rows = await rest<AccountRow[]>(`auth_accounts?auth_user_id=eq.${enc(authUserId)}&select=*`)
  return rows[0] ?? null
}

async function accountForUid(uid: string) {
  const rows = await rest<AccountRow[]>(`auth_accounts?uid=eq.${enc(uid)}&select=*`)
  return rows[0] ?? null
}

/** Unclaimed legacy uids for a confirmed email; real ids before uids that are the email itself. */
async function legacyUidsForEmail(email: string) {
  const rows = await rest<{ uid: string }[]>(
    `legacy_users?email=ilike.${enc(email.replace(/[%_]/g, '\\$&'))}&select=uid&order=imported_at.asc`,
  )
  const uids = rows.map((row) => row.uid).sort((a, b) => Number(a.includes('@')) - Number(b.includes('@')))
  for (const uid of uids) {
    if (!(await accountForUid(uid))) return uid
  }
  return null
}

async function insertAccount(row: AccountRow) {
  // a race (two sign-ins at once) or an already-claimed uid ends in a conflict: the read below decides
  await rest('auth_accounts?on_conflict=auth_user_id', {
    method: 'POST',
    body: row,
    prefer: 'resolution=ignore-duplicates,return=minimal',
  }).catch((error) => console.error('auth_accounts insert:', error))
  return accountForAuthUser(row.auth_user_id)
}

export class UidConflictError extends Error {
  constructor(readonly uid: string) {
    super(`uid ${uid} is already linked to another sign-in`)
    this.name = 'UidConflictError'
  }
}

/**
 * The Misaeng uid of a signed-in Supabase user (links it on the first sign-in). `ellieoUid`: proven through Ellieo.
 * `isNew` = a brand-new member (no legacy data) — the caller asks for terms consent then.
 */
export async function resolveUid(
  user: AuthUser,
  proof: { ellieoUid?: string | null; via?: 'ellieo_password' | 'ellieo_session'; createNew?: boolean } = {},
): Promise<{ uid: string; isNew: boolean; created: boolean; linkedVia: string }> {
  const existing = await accountForAuthUser(user.id)
  if (existing) return { uid: existing.uid, isNew: false, created: false, linkedVia: existing.linked_via }

  let uid = user.id
  let linkedVia = 'new'
  if (proof.ellieoUid) {
    const owner = await accountForUid(proof.ellieoUid)
    if (owner && owner.auth_user_id !== user.id) throw new UidConflictError(proof.ellieoUid)
    uid = proof.ellieoUid
    linkedVia = proof.via ?? 'ellieo_password'
  } else if (user.emailConfirmed && user.email && !isPlaceholderEmail(user.email)) {
    const legacy = await legacyUidsForEmail(user.email)
    if (legacy) {
      uid = legacy
      linkedVia = 'email'
    }
  }

  // a brand-new member is linked only once they accepted the terms (the caller asks first)
  if (linkedVia === 'new' && proof.createNew === false) return { uid: '', isNew: true, created: false, linkedVia }

  const row = await insertAccount({ auth_user_id: user.id, uid, email: user.email, linked_via: linkedVia })
  if (!row) throw new Error('Could not link the account.')
  if (row.uid !== uid && proof.ellieoUid) throw new UidConflictError(proof.ellieoUid)
  return { uid: row.uid, isNew: row.linked_via === 'new', created: row.uid === uid, linkedVia: row.linked_via }
}

/** Read-only: the uid for a Supabase user that already signed in once (null before the first link). */
export async function uidForAuthUser(authUserId: string) {
  return (await accountForAuthUser(authUserId))?.uid ?? null
}

/** The Supabase user id linked to a uid (account deletion, ERP). */
export async function authUserIdForUid(uid: string) {
  return (await accountForUid(uid))?.auth_user_id ?? null
}

/**
 * The Supabase user for a member proven through Ellieo (their email + uid), created if needed and linked to the uid.
 * Used by the Ellieo password check and by the silent switch of a live Ellieo session.
 */
export async function ensureAuthUserForEllieoMember(
  member: { uid: string; email: string | null; name?: string | null },
  via: 'ellieo_password' | 'ellieo_session',
  password?: string,
) {
  const email = (member.email || '').trim().toLowerCase()
  if (!email) throw new Error('This Ellieo account has no email.')
  const owner = await accountForUid(member.uid)
  let user: AuthUser | null = owner ? null : await adminFindUserByEmail(email)
  if (owner) {
    user = { id: owner.auth_user_id, email: owner.email, emailConfirmed: true, providers: [], metadata: {} }
  } else if (!user) {
    user = await adminCreateUser(email, { password, metadata: member.name ? { name: member.name } : {} })
  }
  await resolveUid(user, { ellieoUid: member.uid, via })
  return user
}

/** A Supabase session for a member whose live Ellieo session proved who they are (no password needed). */
export async function sessionFromEllieoMember(member: { uid: string; email: string | null; name?: string | null }) {
  const user = await ensureAuthUserForEllieoMember(member, 'ellieo_session')
  return adminCreateSession(user.email || String(member.email))
}
