'use client'

import { useEffect, useState } from 'react'

/** Browser calls to /api/support/* (cookie session). */

export type SupportConfig = { housingChat: boolean; inquiries: boolean; kakaoUrl: string | null }
export type SupportConversation = {
  id: string
  kind: 'housing' | 'question' | 'suggestion'
  status: 'open' | 'waiting_user' | 'closed'
  title: string | null
  listing: { title?: string } | null
  lastMessageAt: string
  lastMessagePreview: string | null
  lastSender: string | null
  unread: number
  staffLastReadAt: string | null
}
export type SupportMessage = {
  id: string
  sender: 'user' | 'staff' | 'system'
  senderName: string | null
  body: string
  redactions: number
  createdAt: string
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

let configPromise: Promise<SupportConfig> | null = null

export function fetchSupportConfig(): Promise<SupportConfig> {
  configPromise ??= call<SupportConfig>('/api/support/config').catch(() => {
    configPromise = null
    return { housingChat: false, inquiries: false, kakaoUrl: null }
  })
  return configPromise
}

/** Server switches (support.enabled / inquiry.enabled). null while loading. */
export function useSupportConfig() {
  const [config, setConfig] = useState<SupportConfig | null>(null)
  useEffect(() => {
    let alive = true
    void fetchSupportConfig().then((value) => alive && setConfig(value))
    return () => {
      alive = false
    }
  }, [])
  return config
}

export const listInquiries = () => call<{ items: SupportConversation[] }>('/api/support/conversations?kind=inquiry').then((r) => r.items)

export const fetchThread = (id: string) =>
  call<{ conversation: SupportConversation; messages: SupportMessage[] }>(`/api/support/conversations/${encodeURIComponent(id)}`)

export const sendReply = (id: string, body: string) =>
  call<{ message: SupportMessage }>(`/api/support/conversations/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })

export const startInquiry = (kind: 'question' | 'suggestion', title: string, message: string) =>
  call<{ conversation: SupportConversation }>('/api/support/conversations', {
    method: 'POST',
    body: JSON.stringify({ kind, title, message }),
  }).then((r) => r.conversation)
