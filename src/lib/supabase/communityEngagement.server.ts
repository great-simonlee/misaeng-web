import type {
  CommunityBeenThere,
  CommunityRecommend,
  CommunityReport,
} from '@/types/nyc'

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

export function isCommunityEngagementStorageConfigured() {
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

function recommendPath(postId: string) {
  return `community-engagement/${postId}/recommends.json`
}

function beenTherePath(postId: string) {
  return `community-engagement/${postId}/been-there.json`
}

/** ERP에서 전체 신고 목록을 조회할 때 쓰는 단일 인덱스 */
function reportsIndexPath() {
  return 'community-reports/index.json'
}

function normalizeRecommend(raw: unknown): CommunityRecommend | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const targetId = String(data.targetId || '').trim()
  const postId = String(data.postId || '').trim()
  const authorUid = String(data.authorUid || '').trim()
  if (!id || !targetId || !postId || !authorUid) return null

  return {
    id,
    targetType: data.targetType === 'comment' ? 'comment' : 'post',
    targetId,
    postId,
    boardId: String(data.boardId || '').trim(),
    authorUid,
    createdAt: Number(data.createdAt) || Date.now(),
  }
}

function normalizeReport(raw: unknown): CommunityReport | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const targetId = String(data.targetId || '').trim()
  const postId = String(data.postId || '').trim()
  const reporterUid = String(data.reporterUid || '').trim()
  const reason = String(data.reason || '').trim()
  if (!id || !targetId || !postId || !reporterUid || !reason) return null

  const statusRaw = String(data.status || 'open')
  const status =
    statusRaw === 'reviewed' ||
    statusRaw === 'resolved' ||
    statusRaw === 'dismissed'
      ? statusRaw
      : 'open'

  return {
    id,
    targetType: data.targetType === 'comment' ? 'comment' : 'post',
    targetId,
    postId,
    boardId: String(data.boardId || '').trim(),
    reason: reason as CommunityReport['reason'],
    detail: typeof data.detail === 'string' ? data.detail : null,
    reporterUid,
    reporterEmail: String(data.reporterEmail || '').trim(),
    status,
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
    reviewedAt:
      data.reviewedAt == null || data.reviewedAt === ''
        ? null
        : Number(data.reviewedAt) || null,
    reviewedBy:
      typeof data.reviewedBy === 'string' ? data.reviewedBy : null,
    resolutionNote:
      typeof data.resolutionNote === 'string' ? data.resolutionNote : null,
  }
}

export async function listStoredRecommends(
  postId: string,
): Promise<CommunityRecommend[]> {
  if (!isCommunityEngagementStorageConfigured()) return []
  const id = String(postId || '').trim()
  if (!id) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${recommendPath(id)}`,
    {
      method: 'GET',
      headers: storageHeaders(),
    },
  )
  if (!res?.ok) return []

  const data = await res.json().catch(() => null)
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { recommends?: unknown }).recommends)
      ? (data as { recommends: unknown[] }).recommends
      : []

  return list
    .map((item) => normalizeRecommend(item))
    .filter((item): item is CommunityRecommend => Boolean(item))
}

export async function saveStoredRecommends(
  postId: string,
  recommends: CommunityRecommend[],
): Promise<CommunityRecommend[]> {
  if (!isCommunityEngagementStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  const id = String(postId || '').trim()
  if (!id) throw new Error('잘못된 게시글이에요.')

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify({ recommends }), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${recommendPath(id)}`,
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
    const payload = (await res?.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    throw new Error(
      payload?.message ||
        payload?.error ||
        '추천 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
    )
  }

  return recommends
}

function normalizeBeenThere(raw: unknown): CommunityBeenThere | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const postId = String(data.postId || '').trim()
  const authorUid = String(data.authorUid || '').trim()
  if (!id || !postId || !authorUid) return null

  return {
    id,
    postId,
    boardId: String(data.boardId || 'food').trim() || 'food',
    authorUid,
    createdAt: Number(data.createdAt) || Date.now(),
  }
}

export async function listStoredBeenThere(
  postId: string,
): Promise<CommunityBeenThere[]> {
  if (!isCommunityEngagementStorageConfigured()) return []
  const id = String(postId || '').trim()
  if (!id) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${beenTherePath(id)}`,
    {
      method: 'GET',
      headers: storageHeaders(),
    },
  )
  if (!res?.ok) return []

  const data = await res.json().catch(() => null)
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { visits?: unknown }).visits)
      ? (data as { visits: unknown[] }).visits
      : []

  return list
    .map((item) => normalizeBeenThere(item))
    .filter((item): item is CommunityBeenThere => Boolean(item))
}

export async function saveStoredBeenThere(
  postId: string,
  visits: CommunityBeenThere[],
): Promise<CommunityBeenThere[]> {
  if (!isCommunityEngagementStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  const id = String(postId || '').trim()
  if (!id) throw new Error('잘못된 게시글이에요.')

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify({ visits }), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${beenTherePath(id)}`,
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
    const payload = (await res?.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    throw new Error(
      payload?.message ||
        payload?.error ||
        '가봤어요 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
    )
  }

  return visits
}

export async function listStoredReports(): Promise<CommunityReport[]> {
  if (!isCommunityEngagementStorageConfigured()) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${reportsIndexPath()}`,
    {
      method: 'GET',
      headers: storageHeaders(),
    },
  )
  if (!res?.ok) return []

  const data = await res.json().catch(() => null)
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { reports?: unknown }).reports)
      ? (data as { reports: unknown[] }).reports
      : []

  return list
    .map((item) => normalizeReport(item))
    .filter((item): item is CommunityReport => Boolean(item))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveStoredReports(
  reports: CommunityReport[],
): Promise<CommunityReport[]> {
  if (!isCommunityEngagementStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify({ reports }), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${reportsIndexPath()}`,
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
    const payload = (await res?.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null
    throw new Error(
      payload?.message ||
        payload?.error ||
        '신고 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
    )
  }

  return reports
}
