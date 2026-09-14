import {
  normalizeWorkplaceStatus,
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
  if (!id || !uid || !workEmail || !companyName) return null
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
    throw new Error('Supabase 설정이 필요해요.')
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
    throw new Error(`직장인 인증 요청 저장 실패 (HTTP ${res?.status ?? 'unknown'})`)
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
