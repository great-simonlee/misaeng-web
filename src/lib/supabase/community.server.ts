import {
  normalizeFoodCategory,
  normalizeFoodGalleryPhotos,
  normalizeFoodMenuItems,
  normalizeWaitMinutes,
} from '@lib/community/food'
import {
  normalizeCptOptTimeline,
  normalizeCptOptTips,
  normalizeCptOptType,
} from '@lib/community/cptOpt'
import {
  normalizeJobReviewTimeline,
  normalizeJobReviewTips,
  normalizeJobReviewType,
} from '@lib/community/jobReview'
import {
  normalizeRoommateBudgetMax,
  normalizeRoommateLookingFor,
  normalizeRoommateMoveInDate,
  normalizeRoommateMoveOutDate,
} from '@lib/community/roommate'
import { isAnonymousBoard, isCommunityBoardId, isStatusCommunityBoard } from '@lib/constants/nyc'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import type { CommunityPost } from '@/types/nyc'
import { listStoredCommunityComments } from '@lib/supabase/communityComments.server'
import { listStoredRecommends } from '@lib/supabase/communityEngagement.server'

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

export function isCommunityStorageConfigured() {
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
  return `community/${id}.json`
}

function normalizeCommunityPost(raw: unknown): CommunityPost | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const id = String(data.id || '').trim()
  const categoryId = String(data.categoryId || '').trim()
  if (!id || !isCommunityBoardId(categoryId)) return null

  const title = String(data.title || '').trim()
  if (!title) return null

  const contentHtml = String(data.contentHtml || data.description || '').trim()
  const description = String(
    data.description || stripHtml(contentHtml),
  ).trim()

  return {
    id,
    categoryId,
    title,
    description,
    contentHtml: contentHtml || `<p>${escapeHtml(description)}</p>`,
    location: String(data.location || '').trim(),
    detail: String(data.detail || '').trim(),
    authorUid: String(data.authorUid || '').trim(),
    authorEmail: String(data.authorEmail || '').trim(),
    authorNickname:
      typeof data.authorNickname === 'string' && data.authorNickname.trim()
        ? data.authorNickname.trim()
        : null,
    authorPhotoURL:
      typeof data.authorPhotoURL === 'string' && data.authorPhotoURL.trim()
        ? data.authorPhotoURL.trim()
        : null,
    authorSchoolId:
      typeof data.authorSchoolId === 'string' ? data.authorSchoolId : null,
    authorSchoolName:
      typeof data.authorSchoolName === 'string' ? data.authorSchoolName : null,
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
    status: data.status === 'closed' ? 'closed' : 'open',
    viewCount: Math.max(0, Math.floor(Number(data.viewCount) || 0)),
    recommendCount: Math.max(0, Math.floor(Number(data.recommendCount) || 0)),
    commentCount: Math.max(0, Math.floor(Number(data.commentCount) || 0)),
    beenThereCount: Math.max(0, Math.floor(Number(data.beenThereCount) || 0)),
    thumbnailUrl:
      typeof data.thumbnailUrl === 'string' && data.thumbnailUrl.trim()
        ? data.thumbnailUrl.trim()
        : null,
    partySize: (() => {
      const n = Number(data.partySize)
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    })(),
    totalSpend: (() => {
      const n = Number(data.totalSpend)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    })(),
    waitMinutes: normalizeWaitMinutes(data.waitMinutes),
    foodCategory: normalizeFoodCategory(data.foodCategory),
    menuItems: normalizeFoodMenuItems(data.menuItems),
    galleryPhotos: normalizeFoodGalleryPhotos(data.galleryPhotos),
    placeId:
      typeof data.placeId === 'string' && data.placeId.trim()
        ? data.placeId.trim()
        : null,
    placeName:
      typeof data.placeName === 'string' && data.placeName.trim()
        ? data.placeName.trim()
        : null,
    latitude: (() => {
      const n = Number(data.latitude)
      return Number.isFinite(n) && Math.abs(n) <= 90 ? n : null
    })(),
    longitude: (() => {
      const n = Number(data.longitude)
      return Number.isFinite(n) && Math.abs(n) <= 180 ? n : null
    })(),
    cptOptType: normalizeCptOptType(
      data.cptOptType,
      String(data.detail || '').trim(),
    ),
    cptOptTimeline: normalizeCptOptTimeline(data.cptOptTimeline),
    cptOptTips: (() => {
      const tips = normalizeCptOptTips(data.cptOptTips)
      return tips || null
    })(),
    jobReviewType: normalizeJobReviewType(
      data.jobReviewType,
      String(data.detail || '').trim(),
    ),
    jobReviewTimeline: normalizeJobReviewTimeline(data.jobReviewTimeline),
    jobReviewTips: (() => {
      const tips = normalizeJobReviewTips(data.jobReviewTips)
      return tips || null
    })(),
    jobReviewIndustry:
      typeof data.jobReviewIndustry === 'string' &&
      data.jobReviewIndustry.trim()
        ? data.jobReviewIndustry.trim()
        : null,
    roommateLookingFor: normalizeRoommateLookingFor(
      data.roommateLookingFor,
      String(data.detail || '').trim(),
    ),
    roommateBudgetMax: normalizeRoommateBudgetMax(
      data.roommateBudgetMax ?? data.detail,
    ),
    roommateMoveInDate: normalizeRoommateMoveInDate(data.roommateMoveInDate),
    roommateMoveOutDate: normalizeRoommateMoveOutDate(
      data.roommateMoveOutDate,
      normalizeRoommateMoveInDate(data.roommateMoveInDate),
    ),
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function fetchPostJson(
  bucket: string,
  path: string,
): Promise<CommunityPost | null> {
  const res = await storageFetch(`/storage/v1/object/${bucket}/${path}`, {
    method: 'GET',
    headers: storageHeaders(),
  })
  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return normalizeCommunityPost(data)
}

async function listAllStoredCommunityPosts(): Promise<CommunityPost[]> {
  if (!isCommunityStorageConfigured()) return []

  const bucket = await resolveBucket()
  const res = await storageFetch(`/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: storageHeaders('application/json'),
    body: JSON.stringify({
      prefix: 'community/',
      limit: 1000,
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

  const posts = (
    await Promise.all(
      names.map((name) => {
        const path = name.startsWith('community/')
          ? name
          : `community/${name}`
        return fetchPostJson(bucket, path)
      }),
    )
  ).filter((post): post is CommunityPost => Boolean(post))

  return posts.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
}

export async function enrichStoredCommunityPostCounts(
  post: CommunityPost,
): Promise<CommunityPost> {
  const [recommends, comments] = await Promise.all([
    listStoredRecommends(post.id),
    listStoredCommunityComments(post.id),
  ])
  const recommendCount = recommends.filter(
    (item) => item.targetType === 'post' && item.targetId === post.id,
  ).length
  const commentCount = comments.filter((item) => item.status === 'open').length
  return { ...post, recommendCount, commentCount }
}

export async function listStoredCommunityPosts(
  boardId?: string,
): Promise<CommunityPost[]> {
  const posts = await listAllStoredCommunityPosts()
  const filtered = posts
    .filter((post) => post.status === 'open')
    .filter((post) => {
      if (!boardId) return true
      if (isStatusCommunityBoard(boardId)) {
        return isStatusCommunityBoard(post.categoryId)
      }
      return post.categoryId === boardId
    })

  const withCounts =
    boardId === 'food'
      ? await Promise.all(filtered.map(enrichStoredCommunityPostCounts))
      : filtered

  // 목록에서도 최신 프로필 사진·닉네임 반영 (저장은 상세 조회 시)
  return Promise.all(
    withCounts.map((item) =>
      enrichCommunityPostAuthor(item, { persist: false }),
    ),
  )
}

/** 내 글 관리용 — open/closed 모두 포함 */
export async function listStoredCommunityPostsByAuthor(
  authorUid: string,
): Promise<CommunityPost[]> {
  const uid = String(authorUid || '').trim()
  if (!uid) return []
  const posts = await listAllStoredCommunityPosts()
  return posts.filter((post) => post.authorUid === uid)
}

async function enrichCommunityPostAuthor(
  post: CommunityPost,
  options?: { persist?: boolean },
): Promise<CommunityPost> {
  if (isAnonymousBoard(post.categoryId)) return post

  const profile = await getSupabaseProfile(post.authorUid)
  const profileNickname = profile?.nickname?.trim() || null
  const profilePhoto =
    typeof profile?.photoURL === 'string' && profile.photoURL.trim()
      ? profile.photoURL.trim()
      : null

  const storedNickname = post.authorNickname?.trim() || null
  const storedPhoto = post.authorPhotoURL?.trim() || null
  const safeStoredPhoto =
    storedPhoto && !storedPhoto.startsWith('blob:') ? storedPhoto : null

  const authorNickname = storedNickname || profileNickname
  // 목록·상세 모두 최신 프로필 사진을 우선 사용
  const authorPhotoURL = profilePhoto || safeStoredPhoto

  if (
    authorNickname === storedNickname &&
    authorPhotoURL === storedPhoto
  ) {
    return post
  }

  const enriched: CommunityPost = {
    ...post,
    authorNickname,
    authorPhotoURL,
  }
  if (options?.persist !== false) {
    try {
      await saveStoredCommunityPost(enriched)
    } catch {
      // 표시만 보강
    }
  }
  return enriched
}

export async function getStoredCommunityPost(
  id: string,
): Promise<CommunityPost | null> {
  if (!isCommunityStorageConfigured()) return null
  const postId = String(id || '').trim()
  if (!postId) return null
  const bucket = await resolveBucket()
  const post = await fetchPostJson(bucket, objectPath(postId))
  if (!post) return null
  return enrichCommunityPostAuthor(post)
}

export async function saveStoredCommunityPost(
  post: CommunityPost,
): Promise<CommunityPost> {
  if (!isCommunityStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }

  const bucket = await resolveBucket()
  const body = Buffer.from(JSON.stringify(post), 'utf8')
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(post.id)}`,
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
        '게시글 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
    )
  }

  return post
}

export async function incrementStoredCommunityViewCount(
  id: string,
): Promise<CommunityPost | null> {
  const existing = await getStoredCommunityPost(id)
  if (!existing || existing.status === 'closed') return null
  return saveStoredCommunityPost({
    ...existing,
    viewCount: (existing.viewCount || 0) + 1,
  })
}

export async function setStoredCommunityBeenThereCount(
  id: string,
  count: number,
): Promise<CommunityPost | null> {
  const existing = await getStoredCommunityPost(id)
  if (!existing) return null
  return saveStoredCommunityPost({
    ...existing,
    beenThereCount: Math.max(0, Math.floor(count)),
  })
}

export async function deleteStoredCommunityPost(id: string): Promise<boolean> {
  if (!isCommunityStorageConfigured()) {
    throw new Error(
      'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
    )
  }
  const postId = String(id || '').trim()
  if (!postId) return false

  const bucket = await resolveBucket()
  const res = await storageFetch(
    `/storage/v1/object/${bucket}/${objectPath(postId)}`,
    {
      method: 'DELETE',
      headers: storageHeaders(),
    },
  )
  if (!res) return false
  if (res.status === 404) return true
  return res.ok
}
