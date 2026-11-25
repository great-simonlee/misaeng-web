import { BRAND } from '@lib/brand'

import type { ApnsEnvironment } from './apns.server'

/**
 * Device table: the Ellieo server (same codebase, shared database) keeps the Ellieo app's devices apart from Misaeng's
 * (ellieo_push_devices, topic com.misaeng.ellieo), so a push sent from ellieo.com never reaches a Misaeng phone and
 * Misaeng's broadcasts never reach an Ellieo phone.
 */
const DEVICES = BRAND === 'ellieo' ? 'ellieo_push_devices' : 'push_devices'

/*
 * Push devices, preferences and company follows (supabase/push.sql), through PostgREST with the service role key.
 * Missing tables (SQL not run yet) behave like "nothing stored": reads return empty, writes report not configured.
 */

/**
 * post_recommend / post_save: someone recommended / saved my community post (columns added by supabase/post_saves.sql)
 * job_review: a new interview / job review was posted — to every app user (supabase/push_job_review.sql)
 * posting: new job postings — since 2026-11-17 the Mon / Wed / Fri digest to every app user (was: followed companies)
 * visa_news: visa news digest + Visa Bulletin — to every app user (supabase/push_visa_news.sql)
 */
export const PUSH_TYPES = [
  'comment',
  'reply',
  'posting',
  'credit',
  'post_recommend',
  'post_save',
  'job_review',
  'visa_news',
] as const
/** Columns before push_visa_news.sql, for databases where it has not run yet */
const PRE_VISA_NEWS_TYPES: readonly PushType[] = ['comment', 'reply', 'posting', 'credit', 'post_recommend', 'post_save', 'job_review']
/** Columns before push_job_review.sql, for databases where it has not run yet */
const PRE_JOB_REVIEW_TYPES: readonly PushType[] = ['comment', 'reply', 'posting', 'credit', 'post_recommend', 'post_save']
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
  job_review: true,
  visa_news: true,
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
  await rest(`${DEVICES}?on_conflict=token`, {
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
  await rest(`${DEVICES}?token=eq.${encodeURIComponent(token)}${owner}`, { method: 'DELETE', prefer: 'return=minimal' })
}

export async function deletePushDevices(tokens: string[]) {
  if (tokens.length === 0) return
  await rest(`${DEVICES}?token=in.${encodeURIComponent(inList(tokens))}`, { method: 'DELETE', prefer: 'return=minimal' })
}

export async function listPushDevices(userIds: string[]): Promise<PushDevice[]> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return []
  const rows = await rest<PushDevice[]>(
    `${DEVICES}?user_id=in.${encodeURIComponent(inList(ids))}&select=token,user_id,platform,environment,locale`,
  ).catch(() => null)
  return rows ?? []
}

/** Everyone with at least one app device (broadcasts such as a new job review), paged through PostgREST. */
export async function listPushUserIds(): Promise<string[]> {
  const ids = new Set<string>()
  const page = 1000
  for (let offset = 0; offset < 200_000; offset += page) {
    const rows = await rest<{ user_id: string }[]>(
      // user_id is not unique: order by token too, or rows shift between pages and users are skipped
      `${DEVICES}?select=user_id&user_id=not.is.null&order=user_id,token&limit=${page}&offset=${offset}`,
    ).catch(() => null)
    for (const row of rows ?? []) if (row.user_id) ids.add(row.user_id)
    if (!rows || rows.length < page) break
  }
  return [...ids]
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
  const unknownColumn = (error: unknown) =>
    error instanceof PushStoreError && (error.code === 'PGRST204' || error.code === '42703')
  try {
    await save(next)
  } catch (error) {
    // Unknown column (push_visa_news.sql / push_job_review.sql / post_saves.sql not run yet): save the switches the
    // table has.
    if (!unknownColumn(error)) throw error
    let saved = false
    for (const types of [PRE_VISA_NEWS_TYPES, PRE_JOB_REVIEW_TYPES]) {
      try {
        await save(Object.fromEntries(types.map((type) => [type, next[type]])))
        saved = true
        break
      } catch (again) {
        if (!unknownColumn(again)) throw again
      }
    }
    if (!saved) await save(Object.fromEntries(LEGACY_PUSH_TYPES.map((type) => [type, next[type]])))
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
  for (const table of [DEVICES, 'push_preferences', 'company_follows']) {
    try {
      await rest(`${table}?user_id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' })
    } catch (error) {
      if (!(error instanceof PushStoreError && error.setupRequired)) throw error
    }
  }
}
