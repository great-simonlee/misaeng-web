import {
  DEFAULT_ABOUT_TEAM,
  type AboutTeamMember,
} from '@lib/about/team'

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'
const TEAM_PATH = 'about/team.json'

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    null
  )
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function getPreferredBucket() {
  return process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
}

export function isAboutTeamStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

function storageHeaders(contentType?: string) {
  const secretKey = getSupabaseSecretKey()
  const headers: Record<string, string> = {
    apikey: secretKey || '',
    Authorization: `Bearer ${secretKey || ''}`,
  }
  if (contentType) headers['Content-Type'] = contentType
  return headers
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return null
  try {
    return await fetch(`${url}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
    })
  } catch {
    return null
  }
}

async function bucketExists(bucket: string) {
  const res = await storageFetch(`/storage/v1/bucket/${bucket}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  return Boolean(res?.ok)
}

async function resolveBucket() {
  const preferred = getPreferredBucket()
  if (await bucketExists(preferred)) return preferred
  if (preferred !== FALLBACK_BUCKET && (await bucketExists(FALLBACK_BUCKET))) {
    return FALLBACK_BUCKET
  }
  return preferred
}

function asTrimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMember(raw: unknown, index: number): AboutTeamMember | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const name = asTrimmed(data.name)
  if (!name) return null
  const sortRaw = Number(data.sortOrder)
  return {
    id: asTrimmed(data.id) || `member-${index}`,
    name,
    position: asTrimmed(data.position),
    role: asTrimmed(data.role),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    email: asTrimmed(data.email).toLowerCase(),
    photoURL: asTrimmed(data.photoURL),
    agentId: asTrimmed(data.agentId) || null,
    sortOrder: Number.isFinite(sortRaw) ? sortRaw : index,
  }
}

export async function getAboutTeamMembers(): Promise<AboutTeamMember[]> {
  if (!isAboutTeamStorageConfigured()) return DEFAULT_ABOUT_TEAM
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/${bucket}/${TEAM_PATH}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  if (!res?.ok) return DEFAULT_ABOUT_TEAM
  const stored: unknown = await res.json().catch(() => null)
  const rawList: unknown[] | null = Array.isArray(stored)
    ? stored
    : stored &&
        typeof stored === 'object' &&
        Array.isArray((stored as { members?: unknown }).members)
      ? (stored as { members: unknown[] }).members
      : null
  if (!rawList) return DEFAULT_ABOUT_TEAM
  return rawList
    .map((item: unknown, index: number) => normalizeMember(item, index))
    .filter((item): item is AboutTeamMember => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((member, index) => ({ ...member, sortOrder: index }))
}
