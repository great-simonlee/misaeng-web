import { createHash } from 'node:crypto'

import { after } from 'next/server'

import { getViewerBlockedUids } from '@lib/community/blocks.server'
import { getStoredCommunityPost, isCommunityStorageConfigured } from '@lib/supabase/community.server'
import { hasRecentUnreadForPost } from './inbox.server'
import { notifyUsers, previewText } from './notify.server'

/*
 * "Someone recommended / saved your post" — to the author of a community post (roommate/sublet included; never for
 * housing listings, never to yourself, never naming who did it).
 *
 * Anti-spam (supabase/post_saves.sql, table notification_dedupe):
 *  - first time only: a user's recommend / save of a post notifies once, ever (un-toggle + re-toggle stays silent)
 *  - collapse: an UNREAD notification of the same type for the same post from the last 24h → nothing new
 *  - push throttle: at most one push per post per type every 6 hours (the inbox row is still recorded)
 * A missing dedupe table means these notifications are off (without it, toggling could spam the author).
 */

export type PostEngagementType = 'post_recommend' | 'post_save'

const DEDUPE_TABLE = 'notification_dedupe'
const COLLAPSE_MS = 24 * 3_600_000
const PUSH_THROTTLE_MS = 6 * 3_600_000

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T | null> {
  const c = config()
  if (!c) throw new Error('Supabase is not configured.')
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
  if (!res.ok) throw new Error(`Notification dedupe request failed (${res.status}).`)
  return data as T
}

/** Inserts `key`; true only when it did not exist yet (first time). Errors / missing table → false. */
async function claimFirstTime(key: string): Promise<boolean> {
  try {
    const rows = await rest<{ key: string }[]>(`${DEDUPE_TABLE}?on_conflict=key&select=key`, {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=representation',
      body: JSON.stringify([{ key }]),
    })
    return Boolean(rows?.length)
  } catch {
    return false
  }
}

/** True when no push of this type for this post went out in the last 6 hours; records this one. */
async function claimPushSlot(type: PostEngagementType, postId: string): Promise<boolean> {
  const key = `push:${type}:${postId}`
  try {
    const rows = await rest<{ created_at: string }[]>(
      `${DEDUPE_TABLE}?key=eq.${encodeURIComponent(key)}&select=created_at`,
    )
    const last = Date.parse(rows?.[0]?.created_at ?? '')
    if (Number.isFinite(last) && Date.now() - last < PUSH_THROTTLE_MS) return false
    await rest(`${DEDUPE_TABLE}?on_conflict=key`, {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify([{ key, created_at: new Date().toISOString() }]),
    })
    return true
  } catch {
    return false
  }
}

async function run(input: { type: PostEngagementType; postId: string; actorUid: string }) {
  const { type, postId, actorUid } = input
  if (!postId || !actorUid || postId.startsWith('mock-') || !isCommunityStorageConfigured()) return
  const post = await getStoredCommunityPost(postId)
  const author = post?.authorUid?.trim()
  if (!post || !author || author === actorUid || post.authorDeleted) return
  if ((await getViewerBlockedUids(author)).has(actorUid)) return

  // Hashed so the table holds no user ids
  const firstKey = createHash('sha256').update(`${type}|${actorUid}|${postId}`).digest('hex')
  if (!(await claimFirstTime(firstKey))) return
  if (await hasRecentUnreadForPost(author, type, postId, COLLAPSE_MS)) return

  const push = await claimPushSlot(type, postId)
  const key = type === 'post_recommend' ? 'postRecommend' : 'postSave'
  const snippet = previewText(post.title || post.description || '', 60)
  notifyUsers({
    type,
    userIds: [author],
    push,
    build: (t) => ({
      title: t(`api.push.${key}.title`),
      body: snippet ? t(`api.push.${key}.body`, { title: snippet }) : t(`api.push.${key}.bodyNoTitle`),
      data: { type, postId, boardId: post.categoryId ?? '', board: post.categoryId ?? '' },
      threadId: `post-${postId}`,
    }),
  })
}

/** Fire-and-forget after a recommend / save is added. Never throws, never blocks the response. */
export function notifyPostEngagement(input: { type: PostEngagementType; postId: string; actorUid: string }) {
  const task = () =>
    run(input).catch((error) => {
      console.error('Post engagement notify error:', error)
    })
  try {
    after(task)
  } catch {
    void task()
  }
}
