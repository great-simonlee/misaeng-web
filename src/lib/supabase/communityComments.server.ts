import type { CommunityComment } from '@/types/nyc'

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

export function isCommunityCommentStorageConfigured() {
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

function objectPath(postId: string) {
  return `community-comments/${postId}.json`
}

function normalizeComment(raw: unknown): CommunityComment | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const postId = String(data.postId || '').trim()
  const body = String(data.body || '').trim()
  if (!id || !postId || !body) return null

  const parentRaw = data.parentId
  const parentId =
    parentRaw == null || parentRaw === ''
      ? null
      : String(parentRaw).trim() || null

  return {
    id,
    postId,
    parentId,
    body,
    authorUid: String(data.authorUid || '').trim(),
    authorEmail: String(data.authorEmail || '').trim(),
    authorNickname:
      typeof data.authorNickname === 'string' ? data.authorNickname : null,
    authorSchoolId:
      typeof data.authorSchoolId === 'string' ? data.authorSchoolId : null,
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
    status: data.status === 'deleted' ? 'deleted' : 'open',
  }
}

export async function listStoredCommunityComments(
  postId: string,
): Promise<CommunityComment[]> {
  if (!isCommunityCommentStorageConfigured()) return []
  const id = String(postId || '').trim()
  if (!id) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(id)}`,
    {
      method: 'GET',
      headers: storageHeaders(),
    },
  )
  if (!res?.ok) return []

  const data = await res.json().catch(() => null)
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { comments?: unknown }).comments)
      ? (data as { comments: unknown[] }).comments
      : []

  return list
    .map((item) => normalizeComment(item))
    .filter((item): item is CommunityComment => Boolean(item))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function saveStoredCommunityComments(
  postId: string,
  comments: CommunityComment[],
): Promise<CommunityComment[]> {
  if (!isCommunityCommentStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  const id = String(postId || '').trim()
  if (!id) throw new Error('잘못된 게시글이에요.')

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify({ comments }), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(id)}`,
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
        '댓글 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
    )
  }

  return comments
}
