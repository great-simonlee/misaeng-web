/** Browser calls for parent ↔ child links (server: src/app/api/family/*). */

import type { PremiumPlanId } from '@lib/premium/client'

export type FamilyChild = {
  uid: string
  nickname: string | null
  avatarUrl: string | null
  linkedAt: string
  premium: {
    premium: boolean
    plan: string | null
    source: string | null
    until: string | null
    status: string | null
    cancelAtPeriodEnd: boolean
    paidByMe: boolean
    paidByOtherParent: boolean
    ownPaid: boolean
    channel: 'stripe' | 'apple' | 'google' | null
  }
  canBuy: boolean
  buyBlockedReason: 'OWN_SUBSCRIPTION' | 'OTHER_PARENT' | 'ALREADY_PAID_BY_YOU' | null
  inAppAllowed: boolean
}

export type FamilyOverview = {
  role: 'parent' | 'member'
  children: FamilyChild[]
  parents: { uid: string; nickname: string | null; linkedAt: string; paying?: boolean }[]
  outgoing: { id: string; email: string | null; status: string; createdAt: string; expiresAt: string }[]
  incoming: { id: string; parentNickname: string | null; createdAt: string; expiresAt: string }[]
  parentPremium: { until: string | null }
  digest: { optedOut: boolean }
}

export class FamilyRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message)
  }
}

async function call<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: init.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string }
  if (!res.ok) throw new FamilyRequestError(data.error || '', res.status, data.code || '')
  return data
}

export const fetchFamily = () => call<FamilyOverview>('/api/family')
export const sendFamilyRequest = (email: string) => call<{ request: FamilyOverview['outgoing'][number] }>('/api/family/requests', { method: 'POST', json: { email } })
export const cancelFamilyRequest = (id: string) => call<{ ok: true }>(`/api/family/requests/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const acceptFamilyRequest = (id: string) => call<{ ok: true }>(`/api/family/requests/${encodeURIComponent(id)}/accept`, { method: 'POST', json: {} })
export const declineFamilyRequest = (id: string) => call<{ ok: true }>(`/api/family/requests/${encodeURIComponent(id)}/decline`, { method: 'POST', json: {} })
export const unlinkFamily = (uid: string) =>
  call<{ ok: true; renewalStopped: 'stripe' | 'google' | 'apple_manual' | null }>(`/api/family/links/${encodeURIComponent(uid)}`, { method: 'DELETE' })
export const setDigestOptOut = (optedOut: boolean) => call<{ optedOut: boolean }>('/api/family/digest', { method: 'PUT', json: { optedOut } })
export const fetchRequestByToken = (token: string) =>
  call<{ id: string; parentNickname: string | null; status: string; expiresAt: string }>(`/api/family/requests/by-token/${encodeURIComponent(token)}`)

export const startChildCheckout = (plan: PremiumPlanId, forUid: string, city: string, locale: string) =>
  call<{ url: string }>('/api/premium/checkout', { method: 'POST', json: { plan, forUid, city, locale } })
export const openFamilyPortal = (city: string, locale: string) =>
  call<{ url: string }>('/api/premium/portal', { method: 'POST', json: { city, locale, returnTo: 'family' } })
