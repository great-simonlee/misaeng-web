import type { CommunityPost } from '@/types/nyc'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import {
  getMockCommunityPost,
  listMockCommunityPosts,
} from '@lib/constants/communityMock'
import { applyLocalViewCount } from '@lib/community/engagement.client'
import { listLocalBeenThere } from '@lib/community/engagement.local'

function withLocalCounts(post: CommunityPost): CommunityPost {
  const localBeenThere = listLocalBeenThere(post.id).length
  return {
    ...post,
    viewCount: applyLocalViewCount(post.viewCount, post.id),
    beenThereCount: Math.max(post.beenThereCount || 0, localBeenThere),
    thumbnailUrl: post.thumbnailUrl ?? null,
    partySize: post.partySize ?? null,
    totalSpend: post.totalSpend ?? null,
    waitMinutes: post.waitMinutes ?? null,
    foodCategory: post.foodCategory ?? null,
    menuItems: Array.isArray(post.menuItems) ? post.menuItems : [],
    placeId: post.placeId ?? null,
    placeName: post.placeName ?? null,
    latitude: post.latitude ?? null,
    longitude: post.longitude ?? null,
  }
}

export async function fetchCommunityPosts(
  boardId: NycCommunityBoardId,
): Promise<CommunityPost[]> {
  try {
    const res = await fetch(
      `/api/community?board=${encodeURIComponent(boardId)}`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const data = (await res.json()) as { posts?: CommunityPost[] }
      const posts = Array.isArray(data.posts) ? data.posts : []
      if (posts.length > 0) return posts.map(withLocalCounts)
    }
  } catch {
    // 목 데이터로 폴백
  }
  return listMockCommunityPosts(boardId).map(withLocalCounts)
}

export async function fetchCommunityPost(
  id: string,
): Promise<CommunityPost | null> {
  try {
    const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { post?: CommunityPost }
      if (data.post) return withLocalCounts(data.post)
    }
  } catch {
    // 목 데이터로 폴백
  }
  const mock = getMockCommunityPost(id)
  return mock ? withLocalCounts(mock) : null
}

export async function createCommunityPostRequest(input: {
  categoryId: NycCommunityBoardId
  title: string
  contentHtml: string
  location: string
  detail: string
  authorSchoolId: string | null
  authorSchoolName: string | null
  thumbnailUrl?: string | null
  partySize?: number | null
  totalSpend?: number | null
  waitMinutes?: number | null
  foodCategory?: CommunityPost['foodCategory']
  menuItems?: CommunityPost['menuItems']
  placeId?: string | null
  placeName?: string | null
  latitude?: number | null
  longitude?: number | null
}): Promise<CommunityPost> {
  const res = await fetch('/api/community', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => null)) as
    | { post?: CommunityPost; error?: string }
    | null
  if (!res.ok || !data?.post) {
    throw new Error(data?.error || '등록에 실패했어요')
  }
  return data.post
}

export async function fetchMyCommunityPosts(): Promise<CommunityPost[]> {
  const res = await fetch('/api/community?mine=1', { cache: 'no-store' })
  const data = (await res.json().catch(() => null)) as
    | { posts?: CommunityPost[]; error?: string }
    | null
  if (!res.ok) {
    throw new Error(data?.error || '내 글을 불러오지 못했어요')
  }
  return (Array.isArray(data?.posts) ? data.posts : []).map(withLocalCounts)
}

export async function updateCommunityPostRequest(
  id: string,
  input: {
    title: string
    contentHtml: string
    location: string
    detail: string
    thumbnailUrl?: string | null
    partySize?: number | null
    totalSpend?: number | null
    waitMinutes?: number | null
    foodCategory?: CommunityPost['foodCategory']
    menuItems?: CommunityPost['menuItems']
    placeId?: string | null
    placeName?: string | null
    latitude?: number | null
    longitude?: number | null
  },
): Promise<CommunityPost> {
  if (id.startsWith('mock-')) {
    throw new Error('예시 글은 수정할 수 없어요')
  }
  const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => null)) as
    | { post?: CommunityPost; error?: string }
    | null
  if (!res.ok || !data?.post) {
    throw new Error(data?.error || '수정에 실패했어요')
  }
  return data.post
}

export async function deleteCommunityPostRequest(id: string): Promise<void> {
  if (id.startsWith('mock-')) {
    throw new Error('예시 글은 삭제할 수 없어요')
  }
  const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || '삭제에 실패했어요')
  }
}

export async function closeCommunityPostRequest(
  id: string,
): Promise<CommunityPost> {
  if (id.startsWith('mock-')) {
    throw new Error('예시 글은 마감할 수 없어요')
  }
  const res = await fetch(`/api/community/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'closed' }),
  })
  const data = (await res.json().catch(() => null)) as
    | { post?: CommunityPost; error?: string }
    | null
  if (!res.ok || !data?.post) {
    throw new Error(data?.error || '마감에 실패했어요')
  }
  return data.post
}
