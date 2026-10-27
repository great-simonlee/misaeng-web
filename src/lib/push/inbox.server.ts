import { getT } from '@lib/i18n/server'
import { LOCALES, type Locale } from '@lib/i18n/locales'
import type { Translate } from '@lib/i18n/translate'
import type { ApnsMessage } from './apns.server'

/*
 * In-app notification inbox (supabase/notifications.sql, table app_notifications), through PostgREST with the
 * service role key. Every push misaeng-web sends is also stored here, rendered in every language, so the app's
 * bell shows it even when the user has no device or turned that push off.
 * A missing table (SQL not run yet) means "empty inbox": reads return nothing and writes are skipped quietly.
 */

const TABLE = 'app_notifications'
const KEEP_DAYS = 90

type Row = {
  id: string
  user_id: string
  type: string
  content: Partial<Record<Locale, { title: string; body: string }>>
  data: Record<string, string> | null
  thread_id: string | null
  created_at: string
  read_at: string | null
}

export type InboxItem = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  threadId: string | null
  createdAt: string
  read: boolean
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

class InboxMissing extends Error {}
let warnedMissing = false

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T | null> {
  const c = config()
  if (!c) throw new InboxMissing('Supabase is not configured.')
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code
    if (code === 'PGRST205' || code === '42P01' || code === '42501') {
      if (!warnedMissing) {
        warnedMissing = true
        console.warn('Notification inbox: run supabase/notifications.sql to enable it.')
      }
      throw new InboxMissing('Notification table missing.')
    }
    throw new Error(`Notification inbox request failed (${res.status}).`)
  }
  return data as T
}

/** Stores one notification per user, rendered in every language. Never throws. */
export async function recordNotifications(input: {
  type: string
  userIds: string[]
  build: (t: Translate, locale: Locale) => ApnsMessage
}): Promise<void> {
  if (!config() || input.userIds.length === 0) return
  try {
    const content: Row['content'] = {}
    let data: Record<string, string> = {}
    let threadId: string | null = null
    for (const locale of LOCALES) {
      const message = input.build(await getT(locale), locale)
      content[locale] = { title: message.title, body: message.body }
      data = message.data ?? data
      threadId = message.threadId ?? threadId
    }
    const rows = input.userIds.map((userId) => ({
      user_id: userId,
      type: input.type,
      content,
      data: { type: input.type, ...data },
      thread_id: threadId,
    }))
    await rest(TABLE, { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(rows) })
  } catch (error) {
    if (!(error instanceof InboxMissing)) console.error('Notification inbox write failed:', error)
  }
}

function toItem(row: Row, locale: Locale): InboxItem {
  const text = row.content[locale] ?? row.content.ko ?? row.content.en ?? Object.values(row.content)[0] ?? { title: '', body: '' }
  return {
    id: row.id,
    type: row.type,
    title: text.title,
    body: text.body,
    data: row.data ?? {},
    threadId: row.thread_id,
    createdAt: row.created_at,
    read: Boolean(row.read_at),
  }
}

/** Newest first, `limit` per page; `cursor` = createdAt of the last item of the previous page. */
export async function listNotifications(uid: string, locale: Locale, cursor: string | null, limit = 30) {
  const since = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()
  let query = `${TABLE}?user_id=eq.${encodeURIComponent(uid)}&created_at=gte.${encodeURIComponent(since)}` +
    `&select=id,user_id,type,content,data,thread_id,created_at,read_at&order=created_at.desc&limit=${limit + 1}`
  if (cursor && Number.isFinite(Date.parse(cursor))) query += `&created_at=lt.${encodeURIComponent(cursor)}`
  try {
    const rows = (await rest<Row[]>(query)) ?? []
    const page = rows.slice(0, limit)
    return {
      items: page.map((row) => toItem(row, locale)),
      nextCursor: rows.length > limit ? (page[page.length - 1]?.created_at ?? null) : null,
    }
  } catch (error) {
    if (error instanceof InboxMissing) return { items: [] as InboxItem[], nextCursor: null }
    throw error
  }
}

export async function unreadCount(uid: string): Promise<number> {
  const c = config()
  if (!c) return 0
  try {
    const res = await fetch(
      `${c.url}/rest/v1/${TABLE}?user_id=eq.${encodeURIComponent(uid)}&read_at=is.null&select=id`,
      {
        method: 'HEAD',
        headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Prefer: 'count=exact', Range: '0-0' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    )
    const total = res.headers.get('content-range')?.split('/')[1]
    return res.ok && total && total !== '*' ? Number(total) || 0 : 0
  } catch {
    return 0
  }
}

/** Marks the given notifications (or all of them) as read. */
export async function markNotificationsRead(uid: string, ids: string[] | 'all'): Promise<void> {
  const filter = ids === 'all' ? '' : `&id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`
  if (ids !== 'all' && ids.length === 0) return
  try {
    await rest(`${TABLE}?user_id=eq.${encodeURIComponent(uid)}&read_at=is.null${filter}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    })
  } catch (error) {
    if (!(error instanceof InboxMissing)) throw error
  }
}
