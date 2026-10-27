import type { ApnsEnvironment } from './apns.server'

/*
 * Push devices, preferences and company follows (supabase/push.sql), through PostgREST with the service role key.
 * Missing tables (SQL not run yet) behave like "nothing stored": reads return empty, writes report not configured.
 */

/** post_recommend / post_save: someone recommended / saved my community post (columns added by supabase/post_saves.sql) */
export const PUSH_TYPES = ['comment', 'reply', 'posting', 'credit', 'post_recommend', 'post_save'] as const
/** The columns of the original push.sql, for databases where post_saves.sql has not run yet */
const LEGACY_PUSH_TYPES: readonly PushType[] = ['comment', 'reply', 'posting', 'credit']
export type PushType = (typeof PUSH_TYPES)[number]
export type PushPreferences = Record<PushType, boolean>

export type PushDevice = {
  token: string
  user_id: string
  platform: string
  environment: ApnsEnvironment
  locale: string
}

const ALL_ON: PushPreferences = {
  comment: true,
  reply: true,
  posting: true,
  credit: true,
  post_recommend: true,
  post_save: true,
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

export class PushStoreError extends Error {
  constructor(
    message: string,
    readonly setupRequired = false,
    readonly code?: string,
  ) {
    super(message)
  }
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T | null> {
  const c = config()
  if (!c) throw new PushStoreError('Supabase is not configured.')
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
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code
    if (code === 'PGRST205' || code === '42P01' || code === '42501') {
      throw new PushStoreError('Run supabase/push.sql in the Supabase SQL Editor.', true)
    }
    throw new PushStoreError(`Push store request failed (${res.status}).`, false, code)
  }
  return data as T
}

const inList = (values: string[]) => `(${values.map((v) => `"${v.replace(/"/g, '')}"`).join(',')})`

// MARK: devices

export async function savePushDevice(input: {
  token: string
  userId: string
  platform: 'ios' | 'android'
  environment: ApnsEnvironment
  locale: string
}) {
  await rest('push_devices?on_conflict=token', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({
      token: input.token,
      user_id: input.userId,
      platform: input.platform,
      environment: input.environment,
      locale: input.locale,
      updated_at: new Date().toISOString(),
    }),
  })
}

export async function deletePushDevice(token: string, userId?: string) {
  const owner = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : ''
  await rest(`push_devices?token=eq.${encodeURIComponent(token)}${owner}`, { method: 'DELETE', prefer: 'return=minimal' })
}

export async function deletePushDevices(tokens: string[]) {
  if (tokens.length === 0) return
  await rest(`push_devices?token=in.${encodeURIComponent(inList(tokens))}`, { method: 'DELETE', prefer: 'return=minimal' })
}

export async function listPushDevices(userIds: string[]): Promise<PushDevice[]> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return []
  const rows = await rest<PushDevice[]>(
    `push_devices?user_id=in.${encodeURIComponent(inList(ids))}&select=token,user_id,platform,environment,locale`,
  ).catch(() => null)
  return rows ?? []
}

// MARK: preferences

export async function getPushPreferences(userId: string): Promise<PushPreferences> {
  const rows = await rest<(PushPreferences & { user_id: string })[]>(
    // select=* so a table without the newer columns (post_saves.sql not run) still returns the saved switches
    `push_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*`,
  ).catch(() => null)
  return { ...ALL_ON, ...pickPreferences(rows?.[0]) }
}

/** Users (of `userIds`) who turned `type` off. */
export async function usersWithTypeOff(userIds: string[], type: PushType): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return new Set()
  const rows = await rest<{ user_id: string }[]>(
    `push_preferences?user_id=in.${encodeURIComponent(inList(ids))}&${type}=eq.false&select=user_id`,
  ).catch(() => null)
  return new Set((rows ?? []).map((r) => r.user_id))
}

export async function savePushPreferences(userId: string, patch: Partial<PushPreferences>) {
  const next = { ...(await getPushPreferences(userId)), ...pickPreferences(patch) }
  const save = (prefs: Partial<PushPreferences>) =>
    rest('push_preferences?on_conflict=user_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }),
    })
  try {
    await save(next)
  } catch (error) {
    // Unknown column (post_saves.sql not run yet): save the original switches only.
    if (!(error instanceof PushStoreError && (error.code === 'PGRST204' || error.code === '42703'))) throw error
    await save(Object.fromEntries(LEGACY_PUSH_TYPES.map((type) => [type, next[type]])))
  }
  return next
}

function pickPreferences(value: unknown): Partial<PushPreferences> {
  const out: Partial<PushPreferences> = {}
  if (!value || typeof value !== 'object') return out
  for (const type of PUSH_TYPES) {
    const v = (value as Record<string, unknown>)[type]
    if (typeof v === 'boolean') out[type] = v
  }
  return out
}

// MARK: company follows

export async function isFollowingCompany(userId: string, companyId: string): Promise<boolean> {
  const rows = await rest<unknown[]>(
    `company_follows?user_id=eq.${encodeURIComponent(userId)}&company_id=eq.${encodeURIComponent(companyId)}&select=company_id`,
  ).catch(() => null)
  return Boolean(rows?.length)
}

export async function setCompanyFollow(userId: string, companyId: string, follow: boolean) {
  if (follow) {
    await rest('company_follows?on_conflict=user_id,company_id', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: JSON.stringify({ user_id: userId, company_id: companyId }),
    })
  } else {
    await rest(
      `company_follows?user_id=eq.${encodeURIComponent(userId)}&company_id=eq.${encodeURIComponent(companyId)}`,
      { method: 'DELETE', prefer: 'return=minimal' },
    )
  }
}

export async function listCompanyFollowers(companyId: string): Promise<string[]> {
  const rows = await rest<{ user_id: string }[]>(
    `company_follows?company_id=eq.${encodeURIComponent(companyId)}&select=user_id`,
  ).catch(() => null)
  return (rows ?? []).map((r) => r.user_id)
}

// MARK: account deletion

/** Removes the user's devices, preferences and company follows. Missing tables (push.sql not run) = nothing to delete. */
export async function deletePushDataForUser(userId: string) {
  if (!userId) return
  const id = encodeURIComponent(userId)
  for (const table of ['push_devices', 'push_preferences', 'company_follows']) {
    try {
      await rest(`${table}?user_id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' })
    } catch (error) {
      if (!(error instanceof PushStoreError && error.setupRequired)) throw error
    }
  }
}
