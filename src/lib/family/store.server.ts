import { isPlaceholderEmail } from '@lib/auth/accounts.server'
import { enc, pointsRest, PointsStoreError } from '@lib/points/rest.server'
import { normalizeEmailForPoints } from '@lib/points/identity'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'
import { listVerifiedSchools } from '@lib/verification/verifiedSchools'

/**
 * Parent ↔ child links (supabase/parent_links.sql). PostgREST with the service role key. Missing tables (SQL not run)
 * raise FamilyError SETUP_REQUIRED (503). Errors carry an `api` message key (src/messages/{locale}/api.json family.*).
 */

export class FamilyError extends Error {
  constructor(
    readonly code: string,
    readonly key: string,
    readonly status = 400,
    readonly params?: Record<string, string | number>,
  ) {
    super(code)
    this.name = 'FamilyError'
  }
}

export async function familyRest<T>(path: string, init: Parameters<typeof pointsRest>[1] = {}) {
  try {
    return await pointsRest<T>(path, init)
  } catch (error) {
    if (error instanceof PointsStoreError && error.setupRequired) {
      throw new FamilyError('SETUP_REQUIRED', 'family.notReady', 503)
    }
    throw error
  }
}

export { enc }

export const DAY_MS = 86_400_000
export const REQUEST_TTL_DAYS = 14

export type LinkRow = {
  id: string
  parent_uid: string
  child_uid: string
  source: 'invite' | 'email'
  status: 'active' | 'ended'
  invite_code: string | null
  request_id: string | null
  created_at: string
  ended_at: string | null
  ended_by: string | null
}
export const LINK_SELECT = 'id,parent_uid,child_uid,source,status,invite_code,request_id,created_at,ended_at,ended_by'

export type RequestRow = {
  id: string
  parent_uid: string
  email: string | null
  email_norm: string | null
  child_uid: string | null
  token: string
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'canceled'
  created_at: string
  expires_at: string
  decided_at: string | null
}
export const REQUEST_SELECT = 'id,parent_uid,email,email_norm,child_uid,token,status,created_at,expires_at,decided_at'

/** family_notices marker: true = first time for this key (send now); false = already sent. */
export async function claimNotice(key: string, uid: string | null) {
  const rows = await familyRest<{ key: string }[]>('family_notices?on_conflict=key', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: JSON.stringify({ key, uid }),
  })
  return rows.length > 0
}

export function isRequestOpen(row: RequestRow, now = Date.now()) {
  return row.status === 'pending' && Date.parse(row.expires_at) > now
}

export async function linksOf(input: { parentUid?: string; childUid?: string; activeOnly?: boolean }) {
  const filters = [`select=${LINK_SELECT}`, 'order=created_at.asc']
  if (input.parentUid) filters.push(`parent_uid=eq.${enc(input.parentUid)}`)
  if (input.childUid) filters.push(`child_uid=eq.${enc(input.childUid)}`)
  if (input.activeOnly) filters.push('status=eq.active')
  return familyRest<LinkRow[]>(`parent_links?${filters.join('&')}`)
}

export async function activeLink(parentUid: string, childUid: string) {
  const rows = await familyRest<LinkRow[]>(
    `parent_links?parent_uid=eq.${enc(parentUid)}&child_uid=eq.${enc(childUid)}&status=eq.active&select=${LINK_SELECT}&limit=1`,
  )
  return rows[0] ?? null
}

/** Insert an active link; an existing active link for the pair is returned instead (unique index). */
export async function createLink(input: {
  parentUid: string
  childUid: string
  source: 'invite' | 'email'
  inviteCode?: string | null
  requestId?: string | null
  createdAt?: string
}) {
  try {
    const rows = await familyRest<LinkRow[]>('parent_links', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        parent_uid: input.parentUid,
        child_uid: input.childUid,
        source: input.source,
        status: 'active',
        invite_code: input.inviteCode ?? null,
        request_id: input.requestId ?? null,
        ...(input.createdAt ? { created_at: input.createdAt } : {}),
      }),
    })
    return rows[0]
  } catch (error) {
    if (error instanceof PointsStoreError && error.code === '23505') {
      return (await activeLink(input.parentUid, input.childUid))!
    }
    throw error
  }
}

/** Normalized emails that identify a member for an email request: account email + verified school emails. */
export function memberEmails(profile: SupabaseProfileRecord | null, accountEmail: string | null | undefined) {
  const out = new Set<string>()
  const add = (value: string | null | undefined) => {
    const norm = normalizeEmailForPoints(value)
    if (norm) out.add(norm)
  }
  add(accountEmail)
  add(profile?.email)
  if (profile?.schoolEmailVerified) {
    add(profile.schoolEmail)
    for (const entry of listVerifiedSchools(profile)) add(entry.email)
  }
  return [...out]
}

/** Login email of a member (auth_accounts), falling back to the profile. */
export async function accountEmailOf(uid: string, profile?: SupabaseProfileRecord | null): Promise<string | null> {
  const fromProfile = String(profile?.email || '').trim()
  try {
    const rows = await pointsRest<{ email: string | null }[]>(`auth_accounts?uid=eq.${enc(uid)}&select=email&limit=1`)
    const email = rows[0]?.email?.trim()
    if (email && email.includes('@') && !isPlaceholderEmail(email)) return email
  } catch {
    // table missing / unreachable: profile email
  }
  return fromProfile.includes('@') && !isPlaceholderEmail(fromProfile) ? fromProfile : null
}

const nicknameCache = new Map<string, { at: number; value: string | null }>()

export async function nicknameOf(uid: string | null | undefined): Promise<string | null> {
  if (!uid) return null
  const hit = nicknameCache.get(uid)
  if (hit && Date.now() - hit.at < 60_000) return hit.value
  const profile = await getSupabaseProfile(uid).catch(() => null)
  const value = profile?.status === 'deleted' ? null : profile?.nickname?.trim() || null
  nicknameCache.set(uid, { at: Date.now(), value })
  return value
}

export function maskEmail(email: string | null | undefined) {
  const value = String(email || '')
  const at = value.lastIndexOf('@')
  if (at <= 0) return null
  const local = value.slice(0, at)
  return `${local.slice(0, Math.min(2, local.length))}${'*'.repeat(Math.max(1, Math.min(6, local.length - 2)))}${value.slice(at)}`
}
