'use client'

import { useEffect, useRef, useState } from 'react'

import { getSupabaseBrowserClient, isSupabaseConfigured } from '@lib/supabase/client'

/** Browser calls to /api/support/* (cookie session). */

export type SupportConfig = { housingChat: boolean; inquiries: boolean; kakaoUrl: string | null }
export type SupportConversation = {
  id: string
  kind: 'housing' | 'question' | 'suggestion'
  status: 'open' | 'waiting_user' | 'closed'
  title: string | null
  listingId?: string | null
  listing: { title?: string; address?: string; area?: string; price?: number | null; photo?: string | null } | null
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

/** i18n key under me.support for a thread kind. */
export const supportKindKey = (kind: SupportConversation['kind']) =>
  kind === 'suggestion' ? 'suggestion' : kind === 'housing' ? 'housing' : 'question'

/** A thread's heading: its subject, or the listing it is about. */
export const supportThreadTitle = (item: Pick<SupportConversation, 'title' | 'listing'>) =>
  item.title || item.listing?.title || item.listing?.address || ''

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

/** Every thread of this brand (Ellieo board: inquiries, suggestions and listing inquiries together). */
export const listAllConversations = () => call<{ items: SupportConversation[] }>('/api/support/conversations').then((r) => r.items)

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

/**
 * Ellieo board: "Ask about this listing" → a housing thread (the server sets the brand). Details are optional.
 * An open thread about the same listing continues instead of starting a second one.
 */
export const startListingInquiry = (input: {
  listingId: string
  message: string
  city?: string | null
  profile?: { phone?: string; moveIn?: string; name?: string; email?: string }
}) =>
  call<{ conversation: SupportConversation }>('/api/support/conversations', {
    method: 'POST',
    body: JSON.stringify({ kind: 'housing', listingId: input.listingId, message: input.message, city: input.city, profile: input.profile ?? {} }),
  }).then((r) => r.conversation)

/**
 * While a thread is on screen: listen to its signal-only broadcast (no content over the socket) and call `onSignal`
 * so the screen refetches. Quietly does nothing when realtime is not available (the screen still polls).
 */
export function useSupportSignals(conversationId: string | null, onSignal: () => void) {
  const handler = useRef(onSignal)
  useEffect(() => {
    handler.current = onSignal
  }, [onSignal])

  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured()) return
    let alive = true
    let cleanup: (() => void) | null = null
    void call<{ topic: string | null }>(`/api/support/realtime?conversation=${encodeURIComponent(conversationId)}`)
      .then(({ topic }) => {
        if (!alive || !topic) return
        const client = getSupabaseBrowserClient()
        const channel = client
          .channel(topic, { config: { broadcast: { self: false } } })
          .on('broadcast', { event: 'support' }, ({ payload }) => {
            if ((payload as { c?: string } | undefined)?.c === conversationId) handler.current()
          })
          .subscribe()
        cleanup = () => void client.removeChannel(channel)
      })
      .catch(() => undefined)
    return () => {
      alive = false
      cleanup?.()
    }
  }, [conversationId])
}
