'use client'

import type { CommunityPost } from '@/types/nyc'
import type { CityId } from '@lib/constants/cities'

/**
 * Ellieo web marketplace: thin fetch helpers over the same endpoints the iOS/Android Market uses
 * (/api/community board=marketplace, /api/marketplace/inquiries, /api/marketplace/zip).
 */

export class MarketRequestError extends Error {
  code: string | null
  status: number
  constructor(message: string, code: string | null, status: number) {
    super(message)
    this.name = 'MarketRequestError'
    this.code = code
    this.status = status
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null
  if (!res.ok || !data) {
    throw new MarketRequestError(data?.error || `HTTP ${res.status}`, data?.code ?? null, res.status)
  }
  return data
}

export type MarketPage = { posts: CommunityPost[]; nextCursor: string | null; total: number }

export function fetchMarketPage(city: CityId, category: string, cursor: string | null): Promise<MarketPage> {
  const params = new URLSearchParams({ board: 'marketplace', city, active: '1', limit: '20' })
  if (category !== 'all') params.set('category', category)
  if (cursor) params.set('cursor', cursor)
  return request<Partial<MarketPage>>(`/api/community?${params}`).then((data) => ({
    posts: Array.isArray(data.posts) ? data.posts : [],
    nextCursor: data.nextCursor ?? null,
    total: data.total ?? 0,
  }))
}

export async function fetchMarketPost(id: string): Promise<CommunityPost | null> {
  try {
    const data = await request<{ post?: CommunityPost }>(`/api/community/${encodeURIComponent(id)}`)
    return data.post ?? null
  } catch (err) {
    if (err instanceof MarketRequestError && (err.status === 404 || err.status === 403)) return null
    throw err
  }
}

export function pingMarketView(id: string) {
  fetch(`/api/community/${encodeURIComponent(id)}/view`, { method: 'POST' }).catch(() => {})
}

export type MarketListingInput = {
  title: string
  contentHtml: string
  location: string
  price: number
  marketCategory: string
  marketPayments: string[]
  thumbnailUrl: string | null
  galleryPhotos: { id: string; imageUrl: string; caption: string }[]
}

export function createMarketListing(city: CityId, input: MarketListingInput) {
  return request<{ post: CommunityPost }>('/api/community', {
    method: 'POST',
    body: JSON.stringify({ categoryId: 'marketplace', city, detail: '', ...input }),
  }).then((data) => data.post)
}

export function updateMarketListing(id: string, input: MarketListingInput) {
  return request<{ post: CommunityPost }>(`/api/community/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ categoryId: null, city: null, detail: '', ...input }),
  }).then((data) => data.post)
}

export function setMarketStatus(id: string, marketStatus: 'selling' | 'reserved' | 'sold') {
  return request<{ post: CommunityPost }>(`/api/community/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ marketStatus }),
  }).then((data) => data.post)
}

export function deleteMarketListing(id: string) {
  return request<{ ok?: boolean }>(`/api/community/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** true = ZIP exists, false = not found, null = couldn't check (don't block the form) */
export async function lookupMarketZip(zip: string): Promise<boolean | null> {
  try {
    const res = await fetch(`/api/marketplace/zip/${encodeURIComponent(zip)}`, { cache: 'no-store' })
    if (res.status === 404) return false
    return res.ok ? true : null
  } catch {
    return null
  }
}

export type MarketThreadSummary = {
  id: string
  postId: string
  role: 'buyer' | 'seller'
  status: 'open' | 'closed'
  otherNickname: string | null
  otherPhoto?: string | null
  lastMessage?: string | null
  lastMessageAt?: number | null
  lastFromMe?: boolean
  unread?: number
}

export type MarketMessage = { id: string; fromMe: boolean; body: string; createdAt: number }

export function fetchMarketThreads(box: 'buying' | 'selling', postId: string) {
  const params = new URLSearchParams({ box, postId })
  return request<{ threads?: MarketThreadSummary[] }>(`/api/marketplace/inquiries?${params}`).then(
    (data) => data.threads ?? [],
  )
}

export function fetchMarketThread(id: string) {
  return request<{ thread: MarketThreadSummary; messages?: MarketMessage[] }>(
    `/api/marketplace/inquiries/${encodeURIComponent(id)}`,
  ).then((data) => ({ thread: data.thread, messages: data.messages ?? [] }))
}

export function askMarketSeller(postId: string, body: string) {
  return request<{ inquiryId: string }>('/api/marketplace/inquiries', {
    method: 'POST',
    body: JSON.stringify({ postId, body }),
  }).then((data) => data.inquiryId)
}

export function replyMarketThread(id: string, body: string) {
  return request<{ ok?: boolean }>(`/api/marketplace/inquiries/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function reportMarketThread(id: string, reason: string) {
  return request<{ ok?: boolean }>(`/api/marketplace/inquiries/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'other', detail: reason.slice(0, 500) }),
  })
}
