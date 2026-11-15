import { ApiMessageError } from '@lib/i18n/apiError'
import {
  isWorkplaceKind,
  normalizeWorkplaceStatus,
  type WorkplaceKind,
  type WorkplaceMethod,
  type WorkplaceVerificationStatus,
} from '@lib/constants/workplace'

export type WorkplaceVerificationRequest = {
  id: string
  uid: string
  userEmail: string
  userNickname: string | null
  workEmail: string
  companyName: string
  status: Exclude<WorkplaceVerificationStatus, 'none'>
  createdAt: number
  updatedAt: number
  reviewedByEmail: string | null
  reviewedAt: number | null
  rejectReason: string | null
  /** 1.0.7: 'documents' = 서류 제출 (workEmail 없음, submissionId = verification_submissions.id). 없으면 'email' */
  method?: WorkplaceMethod
  workplaceKind?: WorkplaceKind
  submissionId?: string | null
  /** 24시간 넘게 처리 안 된 요청 알림을 보낸 시각 */
  reminderSentAt?: number | null
  /** 웹이 승인·거절 후속 처리(보류 글 공개, 포인트, 알림)를 끝낸 시각과 그때 상태 (/api/internal/workplace/decision) */
  decisionHandledAt?: number | null
  decisionHandledStatus?: 'approved' | 'rejected' | null
}

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'
const PREFIX = 'community-workplace-verifications/'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function getPreferredBucket() {
  return process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
}

export function isWorkplaceVerificationStorageConfigured() {
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

function objectPath(id: string) {
  return `${PREFIX}${id}.json`
}

function normalizeRequest(raw: unknown): WorkplaceVerificationRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const uid = String(data.uid || '').trim()
  const workEmail = String(data.workEmail || '').trim().toLowerCase()
  const companyName = String(data.companyName || '').trim()
  const status = normalizeWorkplaceStatus(data.status)
  const method: WorkplaceMethod = data.method === 'documents' ? 'documents' : 'email'
  // 서류 요청은 회사 이메일이 없다
  if (!id || !uid || (!workEmail && method === 'email') || !companyName) return null
  if (status === 'none') return null
  return {
    id,
    uid,
    userEmail: String(data.userEmail || '').trim(),
    userNickname:
      typeof data.userNickname === 'string' && data.userNickname.trim()
        ? data.userNickname.trim()
        : null,
    workEmail,
    companyName,
    status,
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
    reviewedByEmail:
      typeof data.reviewedByEmail === 'string' && data.reviewedByEmail.trim()
        ? data.reviewedByEmail.trim()
        : null,
    reviewedAt:
      typeof data.reviewedAt === 'number' && Number.isFinite(data.reviewedAt)
        ? data.reviewedAt
        : null,
    rejectReason:
      typeof data.rejectReason === 'string' && data.rejectReason.trim()
        ? data.rejectReason.trim()
        : null,
    method,
    workplaceKind: isWorkplaceKind(data.workplaceKind) ? data.workplaceKind : 'current',
    submissionId:
      typeof data.submissionId === 'string' && data.submissionId.trim() ? data.submissionId.trim() : null,
    reminderSentAt: Number(data.reminderSentAt) > 0 ? Number(data.reminderSentAt) : null,
    decisionHandledAt: Number(data.decisionHandledAt) > 0 ? Number(data.decisionHandledAt) : null,
    decisionHandledStatus:
      data.decisionHandledStatus === 'approved' || data.decisionHandledStatus === 'rejected'
        ? data.decisionHandledStatus
        : null,
  }
}

export async function getStoredWorkplaceVerification(
  id: string,
): Promise<WorkplaceVerificationRequest | null> {
  const requestId = String(id || '').trim()
  if (!requestId || !isWorkplaceVerificationStorageConfigured()) return null
  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(requestId)}`,
    { method: 'GET', headers: storageHeaders() },
  )
  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return normalizeRequest(data)
}

export async function saveStoredWorkplaceVerification(
  request: WorkplaceVerificationRequest,
): Promise<WorkplaceVerificationRequest> {
  if (!isWorkplaceVerificationStorageConfigured()) {
    throw new ApiMessageError('Supabase is not configured.', 'common.supabaseNotConfigured')
  }
  const next = { ...request, updatedAt: Date.now() }
  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify(next), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(next.id)}`,
    {
      method: 'POST',
      headers: {
        ...storageHeaders('application/json'),
        'x-upsert': 'true',
      },
      body,
    },
  )
  if (!res?.ok) {
    throw new ApiMessageError(
      `Workplace verification save failed (HTTP ${res?.status ?? 'unknown'})`,
      'verification.workplaceSaveFailed',
      { status: res?.status ?? 'unknown' },
    )
  }
  return next
}

export async function listStoredWorkplaceVerifications(): Promise<
  WorkplaceVerificationRequest[]
> {
  if (!isWorkplaceVerificationStorageConfigured()) return []
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: PREFIX,
      limit: 500,
      offset: 0,
      sortBy: { column: 'updated_at', order: 'desc' },
    }),
  })
  if (!res?.ok) return []
  const items = (await res.json().catch(() => null)) as
    | Array<{ name?: string }>
    | null
  const names = (items || [])
    .map((item) => String(item?.name || '').trim())
    .filter((name) => name.endsWith('.json'))

  const requests = (
    await Promise.all(
      names.map(async (name) => {
        const id = name.replace(PREFIX, '').replace(/\.json$/, '')
        return getStoredWorkplaceVerification(id)
      }),
    )
  ).filter((item): item is WorkplaceVerificationRequest => Boolean(item))

  return requests.sort((a, b) => b.createdAt - a.createdAt)
}

export async function findLatestWorkplaceVerificationByUid(
  uid: string,
): Promise<WorkplaceVerificationRequest | null> {
  const id = String(uid || '').trim()
  if (!id) return null
  const all = await listStoredWorkplaceVerifications()
  const forUser = all.filter((item) => item.uid === id)
  if (forUser.length === 0) return null
  const pending = forUser.find((item) => item.status === 'pending')
  if (pending) return pending
  const approved = forUser.find((item) => item.status === 'approved')
  if (approved) return approved
  return forUser[0] ?? null
}
