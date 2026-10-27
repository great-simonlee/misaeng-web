import {
  BUILTIN_VERIFIED_SCHOOLS,
  findSchoolByEmail,
  getVerifiedSchools,
  setVerifiedSchools,
  type VerifiedSchool,
} from '@lib/constants/schools'
import { TtlCache } from '@lib/supabase/listCache.server'
import { normalizeSchoolDomain } from '@lib/utils/schoolDomain'

/**
 * 인증 학교 목록 — ERP(Misaeng → Schools)가 Storage에 저장한다.
 * - school-registry/schools.json: [{ id, shortName, fullName, domains, enabled, createdAt, updatedAt }]
 * - school-registration-requests/<id>.json: "학교가 목록에 없어요" 요청 (ERP가 보여 준다)
 * 파일이 아직 없으면 기본 목록(BUILTIN_VERIFIED_SCHOOLS)을 쓴다. ERP twin: ellieo-erp
 * src/app/api/misaeng-admin/lib/adminStorage.js (school registry section).
 */

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'
const REGISTRY_PATH = 'school-registry/schools.json'
const REQUEST_PREFIX = 'school-registration-requests/'
const REGISTRY_TTL_MS = 60_000

export type SchoolRegistryEntry = VerifiedSchool & {
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export type SchoolRegistrationRequest = {
  id: string
  uid: string | null
  requesterEmail: string
  schoolName: string
  emailDomain: string
  status: 'open' | 'added' | 'dismissed'
  createdAt: number
  updatedAt: number
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function isConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

function storageHeaders(contentType?: string) {
  const secretKey = getSupabaseSecretKey() || ''
  const headers: Record<string, string> = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
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
      cache: 'no-store',
      signal: init.signal ?? AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }
}

let bucketPromise: Promise<string> | null = null

/** 직장 인증 요청과 같은 버킷 (housing, 없으면 avatars) */
function resolveBucket(): Promise<string> {
  if (bucketPromise) return bucketPromise
  const preferred = process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
  bucketPromise = (async () => {
    const exists = async (bucket: string) => {
      const res = await storageFetch(`/storage/v1/bucket/${bucket}`, {
        method: 'GET',
        headers: storageHeaders(),
      })
      if (!res) throw new Error('Storage unreachable')
      return res.ok
    }
    if (await exists(preferred)) return preferred
    if (preferred !== FALLBACK_BUCKET && (await exists(FALLBACK_BUCKET))) return FALLBACK_BUCKET
    return preferred
  })()
  bucketPromise.catch(() => {
    bucketPromise = null
  })
  return bucketPromise
}

function normalizeDomains(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const domains = value
    .map((item) => normalizeSchoolDomain(String(item ?? '')).replace(/\s+/g, ''))
    .filter(Boolean)
  return [...new Set(domains)]
}

function normalizeEntry(raw: unknown): SchoolRegistryEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id ?? '').trim().toLowerCase()
  const shortName = String(data.shortName ?? '').trim()
  const fullName = String(data.fullName ?? '').trim()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || !shortName || !fullName) return null
  return {
    id,
    shortName,
    fullName,
    domains: normalizeDomains(data.domains),
    enabled: data.enabled !== false,
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
  }
}

function builtinEntries(): SchoolRegistryEntry[] {
  return BUILTIN_VERIFIED_SCHOOLS.map((school) => ({
    ...school,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  }))
}

/** null = 아직 저장된 목록이 없음 (기본 목록 사용). 읽기 실패는 throw (캐시하지 않음) */
async function loadRegistryFile(): Promise<SchoolRegistryEntry[] | null> {
  if (!isConfigured()) return null
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/${bucket}/${REGISTRY_PATH}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  if (!res) throw new Error('School registry fetch failed')
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 404 || /not.?found/i.test(text)) return null
    throw new Error(`School registry fetch failed (HTTP ${res.status})`)
  }
  const data = (await res.json().catch(() => null)) as unknown
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { schools?: unknown }).schools)
      ? (data as { schools: unknown[] }).schools
      : null
  if (!list) throw new Error('School registry is not a list')
  const seen = new Set<string>()
  const entries: SchoolRegistryEntry[] = []
  for (const item of list) {
    const entry = normalizeEntry(item)
    if (!entry || seen.has(entry.id)) continue
    seen.add(entry.id)
    entries.push(entry)
  }
  return entries.length > 0 ? entries : null
}

const registryCache = new TtlCache<SchoolRegistryEntry[]>(REGISTRY_TTL_MS, 1)

/**
 * 학교 목록 전부 (사용 중지 포함). 60초 메모리 캐시. 저장된 목록이 없으면 기본 목록,
 * 불러오지 못하면 마지막으로 받은 목록(없으면 기본 목록)을 돌려준다.
 * 받은 목록은 constants/schools의 동기 함수(getVerifiedSchool 등)에도 넣어 둔다.
 */
export async function getSchoolRegistry(): Promise<SchoolRegistryEntry[]> {
  try {
    const entries = await registryCache.get('all', async () => (await loadRegistryFile()) ?? builtinEntries())
    setVerifiedSchools(entries)
    return entries
  } catch (error) {
    console.error('School registry load error:', error)
    const current = getVerifiedSchools()
    return current.map((school) => ({
      ...school,
      enabled: school.enabled !== false,
      createdAt: 0,
      updatedAt: 0,
    }))
  }
}

/** 지금 인증받는 학교 */
export async function getEnabledSchoolRegistry(): Promise<SchoolRegistryEntry[]> {
  return (await getSchoolRegistry()).filter((school) => school.enabled)
}

/** 이메일 도메인 → 학교 (ERP 목록, 사용 중인 학교만) */
export async function resolveManagedSchoolFromEmail(email: string): Promise<VerifiedSchool | null> {
  return findSchoolByEmail(email, await getEnabledSchoolRegistry())
}

/** id → 학교 (사용 중지된 학교 포함 — 예전 인증 표시용) */
export async function getManagedSchool(id: string | null | undefined): Promise<VerifiedSchool | null> {
  const key = String(id || '').trim()
  if (!key) return null
  return (await getSchoolRegistry()).find((school) => school.id === key) ?? null
}

/** Ellieo 백엔드의 학교 인증 엔드포인트가 아는 도메인인지 (= 기본 목록에 있는 도메인) */
export function isBuiltinSchoolEmail(email: string): boolean {
  return Boolean(findSchoolByEmail(email, BUILTIN_VERIFIED_SCHOOLS))
}

/** "학교가 목록에 없어요" 요청을 저장한다 (ERP → Schools → Registration requests) */
export async function saveSchoolRegistrationRequest(input: {
  uid: string | null
  requesterEmail: string
  schoolName: string
  emailDomain: string
}): Promise<SchoolRegistrationRequest> {
  if (!isConfigured()) throw new Error('Supabase is not configured.')
  const now = Date.now()
  const request: SchoolRegistrationRequest = {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    uid: input.uid?.trim() || null,
    requesterEmail: input.requesterEmail.trim().toLowerCase(),
    schoolName: input.schoolName.trim().slice(0, 120),
    emailDomain: normalizeSchoolDomain(input.emailDomain),
    status: 'open',
    createdAt: now,
    updatedAt: now,
  }
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/${bucket}/${REQUEST_PREFIX}${request.id}.json`, {
    method: 'POST',
    headers: { ...storageHeaders('application/json'), 'x-upsert': 'true' },
    body: Buffer.from(JSON.stringify(request), 'utf8'),
  })
  if (!res?.ok) {
    throw new Error(`School registration request save failed (HTTP ${res?.status ?? 'unknown'})`)
  }
  return request
}
