/** 중고거래 문의 on the web (same API and threads as the app: src/app/api/marketplace/inquiries). */

import { track } from '@lib/analytics/client'

export type MarketThread = {
  id: string
  postId: string
  role: 'seller' | 'buyer'
  status: 'open' | 'closed'
  otherNickname: string
  otherPhoto: string | null
  listing: { title: string; price: number | null; photo: string | null; marketStatus: 'selling' | 'reserved' | 'sold' } | null
  lastMessage: string | null
  lastMessageAt: number
  lastFromMe: boolean
  unread: number
}

export type MarketMessage = { id: string; fromMe: boolean; body: string; createdAt: number }

/** Server error codes (InquiryError) → community.market.errors.* keys the app uses */
export class MarketInquiryError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code)
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = (await res.json().catch(() => null)) as (T & { code?: string; error?: string }) | null
  if (!res.ok) throw new MarketInquiryError(data?.code || data?.error || 'generic', res.status)
  return data as T
}

export const listMarketThreads = (box: 'all' | 'buying' | 'selling', postId?: string) =>
  call<{ threads: MarketThread[] }>(`/api/marketplace/inquiries?box=${box}${postId ? `&postId=${encodeURIComponent(postId)}` : ''}`).then((d) => d.threads)

export const marketUnreadCount = () => call<{ unread: number }>('/api/marketplace/inquiries?unread=1').then((d) => d.unread)

export const openMarketThread = (id: string) =>
  call<{ thread: MarketThread; messages: MarketMessage[] }>(`/api/marketplace/inquiries/${encodeURIComponent(id)}`)

/** First message to a seller: opens the thread (or reuses the buyer's open one) */
export const sendFirstInquiry = async (postId: string, body: string) => {
  const result = await call<{ inquiryId: string }>('/api/marketplace/inquiries', { method: 'POST', body: JSON.stringify({ postId, body }) })
  track('listing_inquiry_sent', { listing_id: postId, listing_type: 'market' })
  return result
}

export const replyInMarketThread = (id: string, body: string) =>
  call<{ ok: true }>(`/api/marketplace/inquiries/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ body }) })

export const reportMarketThread = (id: string, reason: string) =>
  call<{ ok: true }>(`/api/marketplace/inquiries/${encodeURIComponent(id)}/report`, { method: 'POST', body: JSON.stringify({ reason }) })

export const blockMarketCounterpart = (inquiryId: string) =>
  call<unknown>('/api/community/blocks', { method: 'POST', body: JSON.stringify({ marketInquiryId: inquiryId }) })
