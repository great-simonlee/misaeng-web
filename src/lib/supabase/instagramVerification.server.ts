import { ApiMessageError } from '@lib/i18n/apiError'
import {
  INSTAGRAM_REJECT_REASON_CODES,
  type InstagramRequestStatus,
} from '@lib/verification/instagram'

/**
 * 인스타그램 DM 인증 요청 — Storage JSON `community-instagram-verifications/<id>.json` (직장인 인증 요청과 같은 버킷).
 * ERP(ellieo-erp misaeng-admin/instagram)가 같은 파일을 읽고 승인·반려한다.
 */
export type InstagramVerificationRequest = {
  id: string
  uid: string
  userEmail: string
  userNickname: string | null
  handle: string
  code: string
  status: InstagramRequestStatus
  createdAt: number
  updatedAt: number
  expiresAt: number
  sentAt: number | null
  reviewedByEmail: string | null
  reviewedAt: number | null
  rejectReasonCode: (typeof INSTAGRAM_REJECT_REASON_CODES)[number] | null
  rejectReason: string | null
}

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'
const PREFIX = 'community-instagram-verifications/'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

export function isInstagramVerificationStorageConfigured() {
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
  const preferred = process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
  if (await bucketExists(preferred)) return preferred
  if (preferred !== FALLBACK_BUCKET && (await bucketExists(FALLBACK_BUCKET))) {
    return FALLBACK_BUCKET
  }
  return preferred
}

function objectPath(id: string) {
  return `${PREFIX}${id}.json`
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function time(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeRequest(raw: unknown): InstagramVerificationRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = text(data.id)
  const uid = text(data.uid)
  const handle = text(data.handle)?.toLowerCase()
  const code = text(data.code)
  if (!id || !uid || !handle || !code) return null
  const status: InstagramRequestStatus =
    data.status === 'approved' || data.status === 'rejected' || data.status === 'cancelled'
      ? data.status
      : 'pending'
  const reasonCode = INSTAGRAM_REJECT_REASON_CODES.find((c) => c === data.rejectReasonCode) ?? null
  const createdAt = time(data.createdAt) ?? Date.now()
  return {
    id,
    uid,
    userEmail: text(data.userEmail) ?? '',
    userNickname: text(data.userNickname),
    handle,
    code,
    status,
    createdAt,
    updatedAt: time(data.updatedAt) ?? createdAt,
    expiresAt: time(data.expiresAt) ?? createdAt,
    sentAt: time(data.sentAt),
    reviewedByEmail: text(data.reviewedByEmail),
    reviewedAt: time(data.reviewedAt),
    rejectReasonCode: reasonCode,
    rejectReason: text(data.rejectReason),
  }
}

export async function getStoredInstagramVerification(
  id: string,
): Promise<InstagramVerificationRequest | null> {
  const requestId = String(id || '').trim()
  if (!requestId || !isInstagramVerificationStorageConfigured()) return null
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/${bucket}/${objectPath(requestId)}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  if (!res?.ok) return null
  return normalizeRequest(await res.json().catch(() => null))
}

export async function saveStoredInstagramVerification(
  request: InstagramVerificationRequest,
): Promise<InstagramVerificationRequest> {
  if (!isInstagramVerificationStorageConfigured()) {
    throw new ApiMessageError('Supabase is not configured.', 'common.supabaseNotConfigured')
  }
  const next = { ...request, updatedAt: Date.now() }
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/${bucket}/${objectPath(next.id)}`, {
    method: 'POST',
    headers: { ...storageHeaders('application/json'), 'x-upsert': 'true' },
    body: Buffer.from(JSON.stringify(next), 'utf8'),
  })
  if (!res?.ok) {
    throw new ApiMessageError(
      `Instagram verification save failed (HTTP ${res?.status ?? 'unknown'})`,
      'verification.instagram.saveFailed',
    )
  }
  return next
}

export async function listStoredInstagramVerifications(): Promise<InstagramVerificationRequest[]> {
  if (!isInstagramVerificationStorageConfigured()) return []
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: PREFIX,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'updated_at', order: 'desc' },
    }),
  })
  if (!res?.ok) return []
  const items = ((await res.json().catch(() => null)) as Array<{ name?: string }> | null) || []
  const ids = items
    .map((item) => String(item?.name || '').trim())
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(PREFIX, '').replace(/\.json$/, ''))
  const requests = (await Promise.all(ids.map(getStoredInstagramVerification))).filter(
    (item): item is InstagramVerificationRequest => Boolean(item),
  )
  return requests.sort((a, b) => b.createdAt - a.createdAt)
}
