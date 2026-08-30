import { DEFAULT_POLICY } from '@lib/consent/copy'
import type {
  ConsentLog,
  ConsentMethod,
  ConsentStatus,
  ConsentUiLanguage,
  LegalChangeType,
  LegalPolicy,
} from '@lib/consent/types'
import { isConsentUiLanguage } from '@lib/consent/copy'

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'
const POLICY_PATH = 'legal/policy.json'
const LOG_PREFIX = 'legal/consent-logs/'
const LATEST_PREFIX = 'legal/consent-latest/'

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

export function isLegalConsentStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey())
}

function storageHeaders(contentType?: string, { upsert = false } = {}) {
  const secretKey = getSupabaseSecretKey()
  const headers: Record<string, string> = {
    apikey: secretKey || '',
    Authorization: `Bearer ${secretKey || ''}`,
  }
  if (upsert) headers['x-upsert'] = 'true'
  if (contentType) headers['Content-Type'] = contentType
  return headers
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const url = getSupabaseUrl()
  if (!url || !getSupabaseSecretKey()) return null
  try {
    return await fetch(`${url}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(20000),
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

function safeSegment(value: string) {
  return encodeURIComponent(String(value || '').trim()).replace(/[.]{2,}/g, '_')
}

function logObjectPath(id: string) {
  return `${LOG_PREFIX}${id}.json`
}

function latestObjectPath(userId: string) {
  return `${LATEST_PREFIX}${safeSegment(userId)}.json`
}

function asChangeType(value: unknown, fallback: LegalChangeType): LegalChangeType {
  return value === 'minor' || value === 'material' ? value : fallback
}

function normalizePolicy(raw: unknown): LegalPolicy {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    termsVersion:
      String(data.termsVersion || '').trim() || DEFAULT_POLICY.termsVersion,
    privacyVersion:
      String(data.privacyVersion || '').trim() || DEFAULT_POLICY.privacyVersion,
    termsChangeType: asChangeType(data.termsChangeType, DEFAULT_POLICY.termsChangeType),
    privacyChangeType: asChangeType(
      data.privacyChangeType,
      DEFAULT_POLICY.privacyChangeType,
    ),
    summaryEn: String(data.summaryEn || '').trim() || DEFAULT_POLICY.summaryEn,
    summaryKo: String(data.summaryKo || '').trim() || DEFAULT_POLICY.summaryKo,
    publishedAt:
      String(data.publishedAt || '').trim() || DEFAULT_POLICY.publishedAt,
    publishedBy:
      typeof data.publishedBy === 'string' && data.publishedBy.trim()
        ? data.publishedBy.trim()
        : null,
  }
}

function normalizeLog(raw: unknown): ConsentLog | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const userId = String(data.user_id || data.userId || '').trim()
  const termsVersion = String(data.terms_version || data.termsVersion || '').trim()
  const privacyVersion = String(
    data.privacy_version || data.privacyVersion || '',
  ).trim()
  const consentedAt = String(data.consented_at || data.consentedAt || '').trim()
  if (!id || !userId || !termsVersion || !privacyVersion || !consentedAt) {
    return null
  }
  const method = String(data.consent_method || data.consentMethod || '').trim()
  const uiLanguage = data.ui_language || data.uiLanguage
  return {
    id,
    user_id: userId,
    email:
      typeof data.email === 'string' && data.email.trim()
        ? data.email.trim()
        : null,
    terms_version: termsVersion,
    privacy_version: privacyVersion,
    consented_at: consentedAt,
    ip_address:
      typeof data.ip_address === 'string'
        ? data.ip_address
        : typeof data.ipAddress === 'string'
          ? data.ipAddress
          : null,
    user_agent:
      typeof data.user_agent === 'string'
        ? data.user_agent
        : typeof data.userAgent === 'string'
          ? data.userAgent
          : null,
    consent_method: (method || 'signup_checkbox') as ConsentMethod,
    ui_language: isConsentUiLanguage(uiLanguage) ? uiLanguage : 'en',
  }
}

async function fetchJsonObject(bucket: string, path: string) {
  const res = await storageFetch(`/storage/v1/object/${bucket}/${path}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  if (!res?.ok) return null
  return res.json().catch(() => null)
}

async function upsertJsonObject(bucket: string, path: string, payload: unknown) {
  const res = await storageFetch(`/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: storageHeaders('application/json', { upsert: true }),
    body: Buffer.from(JSON.stringify(payload), 'utf8'),
  })
  if (!res?.ok) {
    const data = (await res?.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    throw new Error(data?.message || data?.error || `Failed to save ${path}`)
  }
}

export async function getLegalPolicy(): Promise<LegalPolicy> {
  if (!isLegalConsentStorageConfigured()) return DEFAULT_POLICY
  const bucket = await resolveBucket()
  const stored = await fetchJsonObject(bucket, POLICY_PATH)
  return stored ? normalizePolicy(stored) : DEFAULT_POLICY
}

export async function saveLegalPolicy(policy: LegalPolicy): Promise<LegalPolicy> {
  if (!isLegalConsentStorageConfigured()) {
    throw new Error(
      'Legal storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
  const next = normalizePolicy({
    ...policy,
    publishedAt: new Date().toISOString(),
  })
  const bucket = await resolveBucket()
  await upsertJsonObject(bucket, POLICY_PATH, next)
  return next
}

export async function getLatestConsent(userId: string): Promise<ConsentLog | null> {
  const id = String(userId || '').trim()
  if (!id || !isLegalConsentStorageConfigured()) return null
  const bucket = await resolveBucket()
  return normalizeLog(await fetchJsonObject(bucket, latestObjectPath(id)))
}

export function needsReconsent(
  policy: LegalPolicy,
  latest: Pick<ConsentLog, 'terms_version' | 'privacy_version'> | null,
): ConsentStatus['reason'] {
  if (!latest) return 'never'
  if (
    policy.termsChangeType === 'material' &&
    latest.terms_version !== policy.termsVersion
  ) {
    return 'material_terms'
  }
  if (
    policy.privacyChangeType === 'material' &&
    latest.privacy_version !== policy.privacyVersion
  ) {
    return 'material_privacy'
  }
  return 'none'
}

export async function getConsentStatus(userId: string): Promise<ConsentStatus> {
  const policy = await getLegalPolicy()
  const latest = await getLatestConsent(userId)
  const reason = needsReconsent(policy, latest)
  return {
    required: reason !== 'none',
    reason,
    policy,
    current: {
      termsVersion: latest?.terms_version ?? null,
      privacyVersion: latest?.privacy_version ?? null,
      consentedAt: latest?.consented_at ?? null,
      uiLanguage: latest?.ui_language ?? null,
    },
  }
}

export async function appendConsentLog(input: {
  userId: string
  email?: string | null
  termsVersion: string
  privacyVersion: string
  ipAddress?: string | null
  userAgent?: string | null
  consentMethod: ConsentMethod
  uiLanguage: ConsentUiLanguage
}): Promise<ConsentLog> {
  if (!isLegalConsentStorageConfigured()) {
    throw new Error(
      'Legal storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  const consentedAt = new Date().toISOString()
  const id = `${consentedAt.replace(/[:.]/g, '-')}_${Math.random()
    .toString(36)
    .slice(2, 10)}`

  const log: ConsentLog = {
    id,
    user_id: String(input.userId).trim(),
    email: input.email?.trim() || null,
    terms_version: input.termsVersion,
    privacy_version: input.privacyVersion,
    consented_at: consentedAt,
    ip_address: input.ipAddress || null,
    user_agent: input.userAgent || null,
    consent_method: input.consentMethod,
    ui_language: input.uiLanguage,
  }

  const bucket = await resolveBucket()
  await upsertJsonObject(bucket, logObjectPath(id), log)
  await upsertJsonObject(bucket, latestObjectPath(log.user_id), log)
  return log
}

export async function listConsentLogs(options?: {
  userId?: string
  limit?: number
}): Promise<ConsentLog[]> {
  if (!isLegalConsentStorageConfigured()) return []
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: LOG_PREFIX,
      limit: Math.min(Math.max(options?.limit || 500, 1), 1000),
      offset: 0,
      sortBy: { column: 'updated_at', order: 'desc' },
    }),
  })
  if (!res?.ok) return []
  const items = (await res.json().catch(() => null)) || []
  const names = (Array.isArray(items) ? items : [])
    .map((item: { name?: string }) => String(item?.name || '').trim())
    .filter((name: string) => name.endsWith('.json'))

  const logs = (
    await Promise.all(
      names.map((name: string) => {
        const path = name.startsWith('legal/') ? name : `${LOG_PREFIX}${name}`
        return fetchJsonObject(bucket, path).then(normalizeLog)
      }),
    )
  ).filter((item): item is ConsentLog => Boolean(item))

  const userId = String(options?.userId || '').trim()
  const filtered = userId
    ? logs.filter((item) => item.user_id === userId)
    : logs

  return filtered.sort((a, b) =>
    String(b.consented_at).localeCompare(String(a.consented_at)),
  )
}

export async function listLatestConsents(): Promise<ConsentLog[]> {
  if (!isLegalConsentStorageConfigured()) return []
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: LATEST_PREFIX,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'updated_at', order: 'desc' },
    }),
  })
  if (!res?.ok) return []
  const items = (await res.json().catch(() => null)) || []
  const names = (Array.isArray(items) ? items : [])
    .map((item: { name?: string }) => String(item?.name || '').trim())
    .filter((name: string) => name.endsWith('.json'))

  const logs = (
    await Promise.all(
      names.map((name: string) => {
        const path = name.startsWith('legal/') ? name : `${LATEST_PREFIX}${name}`
        return fetchJsonObject(bucket, path).then(normalizeLog)
      }),
    )
  ).filter((item): item is ConsentLog => Boolean(item))

  return logs
}

export function bilingualError(en: string, ko: string) {
  return {
    error: `${en} / ${ko}`,
    errorEn: en,
    errorKo: ko,
  }
}
