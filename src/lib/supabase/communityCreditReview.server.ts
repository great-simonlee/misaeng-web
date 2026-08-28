import type { CommunityCreditEarnReason } from '@lib/constants/communityCredit'

export type CommunityCreditReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'

export type CommunityCreditReviewRequest = {
  id: string
  postId: string
  boardId: string
  postTitle: string
  authorUid: string
  authorEmail: string
  authorNickname: string | null
  status: CommunityCreditReviewStatus
  reason: Extract<CommunityCreditEarnReason, 'review-bonus'>
  createdAt: number
  updatedAt: number
  reviewedByUid: string | null
  reviewedByEmail: string | null
  reviewedAt: number | null
  rejectReason: string | null
}

const DEFAULT_BUCKET = 'housing'
const FALLBACK_BUCKET = 'avatars'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function getPreferredBucket() {
  return process.env.SUPABASE_HOUSING_BUCKET?.trim() || DEFAULT_BUCKET
}

export function isCreditReviewStorageConfigured() {
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
  return `community-credit-reviews/${id}.json`
}

function normalizeRequest(raw: unknown): CommunityCreditReviewRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const postId = String(data.postId || '').trim()
  const authorUid = String(data.authorUid || '').trim()
  if (!id || !postId || !authorUid) return null
  const status = data.status
  if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
    return null
  }
  return {
    id,
    postId,
    boardId: String(data.boardId || '').trim(),
    postTitle: String(data.postTitle || '').trim() || '제목 없음',
    authorUid,
    authorEmail: String(data.authorEmail || '').trim(),
    authorNickname:
      typeof data.authorNickname === 'string' && data.authorNickname.trim()
        ? data.authorNickname.trim()
        : null,
    status,
    reason: 'review-bonus',
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
    reviewedByUid:
      typeof data.reviewedByUid === 'string' && data.reviewedByUid.trim()
        ? data.reviewedByUid.trim()
        : null,
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

export async function getStoredCreditReviewRequest(
  id: string,
): Promise<CommunityCreditReviewRequest | null> {
  const reviewId = String(id || '').trim()
  if (!reviewId || !isCreditReviewStorageConfigured()) return null
  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(reviewId)}`,
    { method: 'GET', headers: storageHeaders() },
  )
  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return normalizeRequest(data)
}

export async function saveStoredCreditReviewRequest(
  request: CommunityCreditReviewRequest,
): Promise<CommunityCreditReviewRequest> {
  if (!isCreditReviewStorageConfigured()) {
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
    throw new Error(`리뷰 요청 저장 실패 (HTTP ${res?.status ?? 'unknown'})`)
  }
  return next
}

export async function listStoredCreditReviewRequests(): Promise<
  CommunityCreditReviewRequest[]
> {
  if (!isCreditReviewStorageConfigured()) return []
  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: 'community-credit-reviews/',
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
        const id = name
          .replace(/^community-credit-reviews\//, '')
          .replace(/\.json$/, '')
        return getStoredCreditReviewRequest(id)
      }),
    )
  ).filter((item): item is CommunityCreditReviewRequest => Boolean(item))

  return requests.sort((a, b) => b.createdAt - a.createdAt)
}

export async function findCreditReviewByPostId(
  postId: string,
): Promise<CommunityCreditReviewRequest | null> {
  const id = String(postId || '').trim()
  if (!id) return null
  const all = await listStoredCreditReviewRequests()
  const forPost = all.filter((item) => item.postId === id)
  if (forPost.length === 0) return null
  // 승인 > 대기 > 거절 순으로 최신 의미 있는 건
  const approved = forPost.find((item) => item.status === 'approved')
  if (approved) return approved
  const pending = forPost.find((item) => item.status === 'pending')
  if (pending) return pending
  return forPost[0] ?? null
}
