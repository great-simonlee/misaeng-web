/**
 * Signal-only realtime (design §2): after a message is stored the server broadcasts `{ c: conversationId, k: kind }`
 * on random per-person channels. No message content goes over the socket; screens refetch through the API.
 * Topics: `support:u:<user inbox_key>` (user), `support:s:<staff inbox_key>` (staff).
 */

export type SupportSignal = { c: string; k: 'message' | 'status' | 'assign' | 'read' }

export function realtimeClientConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  const socketUrl = `${url.replace(/^http/, 'ws').replace(/\/+$/, '')}/realtime/v1/websocket`
  return { socketUrl, anonKey }
}

export const userTopic = (inboxKey: string) => `support:u:${inboxKey}`
export const staffTopic = (inboxKey: string) => `support:s:${inboxKey}`

/** Fire-and-forget broadcast through the Realtime REST API. Never throws. */
export async function broadcastSignals(topics: string[], signal: SupportSignal) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const unique = [...new Set(topics.filter(Boolean))]
  if (!url || !key || unique.length === 0) return
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: unique.map((topic) => ({ topic, event: 'support', payload: signal, private: false })),
      }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) console.error('Support broadcast failed:', res.status, (await res.text()).slice(0, 200))
  } catch (error) {
    console.error('Support broadcast error:', error)
  }
}
