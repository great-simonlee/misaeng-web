import { getViewerBlockedUids } from '@lib/community/blocks.server'
import { isModerationHidden } from '@lib/community/moderation'
import { getCommunityPostsByIds, getStoredCommunityPost } from '@lib/supabase/community.server'
import { listProfileCache } from '@lib/supabase/listCache.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { enc, pointsRest, PointsStoreError } from '@lib/points/rest.server'
import type { CommunityPost } from '@/types/nyc'
import { notifyUsers } from '@lib/push/notify.server'

/*
 * 중고거래 문의 스레드 (supabase/marketplace_inquiries.sql). One thread per listing and buyer; both sides add
 * messages and each one is a push to the other side — no live chat. Sold or deleted listings' threads close (read only); back on sale, they open again.
 * Spam guards: 20 new threads a day, 10 messages a minute per thread, 200 messages a day (429 too_many).
 */

export const INQUIRY_MESSAGE_MAX = 1000
/** New threads a buyer may open per day (spam guard) */
export const NEW_INQUIRIES_PER_DAY = 20
/** Messages one person may send in one thread per minute, and across all threads per day (429 too_many) */
export const MESSAGES_PER_THREAD_PER_MINUTE = 10
export const MESSAGES_PER_DAY = 200

export class InquiryError extends Error {
  constructor(
    readonly code: 'not_found' | 'own_listing' | 'closed' | 'blocked' | 'too_many' | 'empty' | 'forbidden' | 'not_marketplace',
    readonly status = 400,
  ) {
    super(code)
  }
}

type InquiryRow = {
  id: string
  post_id: string
  city: string | null
  seller_id: string
  buyer_id: string
  status: 'open' | 'closed'
  created_at: string
  last_message_at: string
  last_message: string | null
  last_sender_id: string | null
  seller_unread: number
  buyer_unread: number
}

type MessageRow = { id: string; inquiry_id: string; sender_id: string; body: string; created_at: string }

const clean = (value: unknown) => String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, INQUIRY_MESSAGE_MAX)

/** A listing people can still talk about: open, not hidden by moderation, on the marketplace board. */
function isLiveListing(post: CommunityPost | null): post is CommunityPost {
  return Boolean(post && post.status === 'open' && !isModerationHidden(post))
}

async function listingFor(postId: string) {
  const post = await getStoredCommunityPost(postId)
  if (!isLiveListing(post)) throw new InquiryError('not_found', 404)
  if (post.categoryId !== 'marketplace') throw new InquiryError('not_marketplace')
  return post
}

async function nickname(uid: string) {
  const profile = await getSupabaseProfile(uid).catch(() => null)
  return (typeof profile?.nickname === 'string' && profile.nickname.trim()) || ''
}

/** Nickname + profile photo of the other person (conversation list and header). Profiles are cached 5 min. */
async function person(uid: string) {
  const profile = await listProfileCache.get(uid, () => getSupabaseProfile(uid)).catch(() => null)
  return {
    nickname: (typeof profile?.nickname === 'string' && profile.nickname.trim()) || '',
    photo: (typeof profile?.photoURL === 'string' && profile.photoURL.trim()) || null,
  }
}

type Person = Awaited<ReturnType<typeof person>>

/** What one side sees of a thread: the listing, the other person and the unread count. */
function toThread(row: InquiryRow, viewer: string, post: CommunityPost | null, them: Person) {
  const seller = row.seller_id === viewer
  return {
    id: row.id,
    postId: row.post_id,
    role: seller ? 'seller' : 'buyer',
    status: row.status,
    otherNickname: them.nickname,
    otherPhoto: them.photo,
    listing: post
      ? {
          title: post.title,
          price: post.price ?? null,
          photo: post.galleryPhotos?.[0]?.imageUrl || post.thumbnailUrl || null,
          marketStatus: post.marketStatus ?? 'selling',
        }
      : null,
    lastMessage: row.last_message,
    lastMessageAt: new Date(row.last_message_at).getTime(),
    lastFromMe: row.last_sender_id === viewer,
    unread: seller ? row.seller_unread : row.buyer_unread,
  }
}

function pushMessage(input: { to: string; inquiryId: string; postId: string; title: string; body: string; first: boolean }) {
  notifyUsers({
    type: 'account',
    userIds: [input.to],
    build: (t) => ({
      title: t(input.first ? 'api.push.marketplace.newInquiry.title' : 'api.push.marketplace.message.title', {
        listing: input.title.slice(0, 40),
      }),
      body: input.body.slice(0, 120),
      data: { type: 'marketplace_inquiry', inquiryId: input.inquiryId, postId: input.postId },
      threadId: `marketplace-${input.inquiryId}`,
    }),
    // Bell on Home: one row per conversation (latest message), not one per message
    replaceThread: true,
  })
}

/** Buyer → seller: opens the thread on first contact, adds to it afterwards. */
export async function sendBuyerMessage(input: { uid: string; postId: string; body: string }) {
  const body = clean(input.body)
  if (!body) throw new InquiryError('empty')
  const post = await listingFor(input.postId)
  const sellerId = String(post.authorUid || '').trim()
  if (!sellerId) throw new InquiryError('not_found', 404)
  if (sellerId === input.uid) throw new InquiryError('own_listing')
  if (post.marketStatus === 'sold') throw new InquiryError('closed')
  const [blockedBySeller, blockedByMe] = await Promise.all([getViewerBlockedUids(sellerId), getViewerBlockedUids(input.uid)])
  if (blockedBySeller.has(input.uid) || blockedByMe.has(sellerId)) throw new InquiryError('blocked', 403)

  const existing = await pointsRest<InquiryRow[]>(
    `marketplace_inquiries?post_id=eq.${enc(input.postId)}&buyer_id=eq.${enc(input.uid)}&select=*&limit=1`,
  )
  let thread = existing?.[0]
  const first = !thread
  if (!thread) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const today = await pointsRest<{ id: string }[]>(
      `marketplace_inquiries?buyer_id=eq.${enc(input.uid)}&created_at=gte.${enc(since)}&select=id`,
    )
    if ((today?.length ?? 0) >= NEW_INQUIRIES_PER_DAY) throw new InquiryError('too_many', 429)
    try {
      const created = await pointsRest<InquiryRow[]>('marketplace_inquiries', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({ post_id: input.postId, city: post.city, seller_id: sellerId, buyer_id: input.uid }),
      })
      thread = created[0]
    } catch (error) {
      // Two first messages at once: the other request made the thread (unique post_id + buyer_id) — use it
      if (!(error instanceof PointsStoreError && error.code === '23505')) throw error
      const again = await pointsRest<InquiryRow[]>(
        `marketplace_inquiries?post_id=eq.${enc(input.postId)}&buyer_id=eq.${enc(input.uid)}&select=*&limit=1`,
      )
      thread = again?.[0]
      if (!thread) throw error
    }
  }
  if (thread.status === 'closed') throw new InquiryError('closed')
  if (!first) await checkSendRate(thread.id, input.uid)
  await addMessage(thread, input.uid, body)
  pushMessage({ to: sellerId, inquiryId: thread.id, postId: input.postId, title: post.title, body, first })
  return { inquiryId: thread.id }
}

/** Either side replies in a thread they belong to. */
export async function replyInThread(input: { uid: string; inquiryId: string; body: string }) {
  const body = clean(input.body)
  if (!body) throw new InquiryError('empty')
  const thread = await threadFor(input.uid, input.inquiryId)
  if (thread.status === 'closed') throw new InquiryError('closed')
  // A deleted, hidden, closed or sold listing: the conversation is over even if its thread was not closed
  const post = await getStoredCommunityPost(thread.post_id).catch(() => null)
  if (!isLiveListing(post) || post.marketStatus === 'sold') throw new InquiryError('closed')
  const other = thread.seller_id === input.uid ? thread.buyer_id : thread.seller_id
  const [blockedByOther, blockedByMe] = await Promise.all([getViewerBlockedUids(other), getViewerBlockedUids(input.uid)])
  if (blockedByOther.has(input.uid) || blockedByMe.has(other)) throw new InquiryError('blocked', 403)
  await checkSendRate(thread.id, input.uid)
  await addMessage(thread, input.uid, body)
  pushMessage({ to: other, inquiryId: thread.id, postId: thread.post_id, title: post.title, body, first: false })
}

/** Spam guard for messages in an existing thread: 10 a minute in one thread, 200 a day in all threads. */
async function checkSendRate(inquiryId: string, sender: string) {
  const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [inThread, today] = await Promise.all([
    pointsRest<{ id: string }[]>(
      `marketplace_inquiry_messages?inquiry_id=eq.${enc(inquiryId)}&sender_id=eq.${enc(sender)}` +
        `&created_at=gte.${enc(minuteAgo)}&select=id&limit=${MESSAGES_PER_THREAD_PER_MINUTE}`,
    ),
    pointsRest<{ id: string }[]>(
      `marketplace_inquiry_messages?sender_id=eq.${enc(sender)}&created_at=gte.${enc(dayAgo)}&select=id&limit=${MESSAGES_PER_DAY}`,
    ),
  ])
  if ((inThread?.length ?? 0) >= MESSAGES_PER_THREAD_PER_MINUTE || (today?.length ?? 0) >= MESSAGES_PER_DAY) {
    throw new InquiryError('too_many', 429)
  }
}

async function addMessage(thread: InquiryRow, sender: string, body: string) {
  await pointsRest('marketplace_inquiry_messages', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({ inquiry_id: thread.id, sender_id: sender, body }),
  })
  const fromSeller = sender === thread.seller_id
  // Read the counter again right before writing (the row we hold may be stale) — no SQL function for an atomic +1
  const current = await pointsRest<Pick<InquiryRow, 'seller_unread' | 'buyer_unread'>[]>(
    `marketplace_inquiries?id=eq.${enc(thread.id)}&select=seller_unread,buyer_unread&limit=1`,
  ).catch(() => null)
  const counts = current?.[0] ?? thread
  await pointsRest(`marketplace_inquiries?id=eq.${enc(thread.id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      last_message: body.slice(0, 200),
      last_message_at: new Date().toISOString(),
      last_sender_id: sender,
      ...(fromSeller ? { buyer_unread: (counts.buyer_unread ?? 0) + 1 } : { seller_unread: (counts.seller_unread ?? 0) + 1 }),
    }),
  })
}

async function threadFor(uid: string, inquiryId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) throw new InquiryError('not_found', 404)
  const rows = await pointsRest<InquiryRow[]>(`marketplace_inquiries?id=eq.${enc(inquiryId)}&select=*&limit=1`)
  const thread = rows?.[0]
  if (!thread) throw new InquiryError('not_found', 404)
  if (thread.seller_id !== uid && thread.buyer_id !== uid) throw new InquiryError('forbidden', 403)
  return thread
}

/** One thread with its messages (oldest first); opening it clears the viewer's unread count. */
export async function openThread(uid: string, inquiryId: string) {
  const thread = await threadFor(uid, inquiryId)
  const messages = await pointsRest<MessageRow[]>(
    `marketplace_inquiry_messages?inquiry_id=eq.${enc(inquiryId)}&select=*&order=created_at.asc&limit=500`,
  )
  const seller = thread.seller_id === uid
  if ((seller ? thread.seller_unread : thread.buyer_unread) > 0) {
    await pointsRest(`marketplace_inquiries?id=eq.${enc(inquiryId)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify(seller ? { seller_unread: 0 } : { buyer_unread: 0 }),
    }).catch(() => null)
  }
  const [post, them] = await Promise.all([
    getStoredCommunityPost(thread.post_id).catch(() => null),
    person(seller ? thread.buyer_id : thread.seller_id),
  ])
  return {
    thread: toThread({ ...thread, ...(seller ? { seller_unread: 0 } : { buyer_unread: 0 }) }, uid, post, them),
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      fromMe: m.sender_id === uid,
      body: m.body,
      createdAt: new Date(m.created_at).getTime(),
    })),
  }
}

/** The viewer's threads: as a buyer (보낸 문의) or as a seller (받은 문의), newest message first. */
export async function listThreads(uid: string, box: 'buying' | 'selling' | 'all', postId?: string) {
  // all: 보낸 문의와 받은 문의를 한 목록으로 (카톡 대화 목록처럼 최근 메시지 순)
  const who =
    box === 'all' ? `or=(seller_id.eq.${enc(uid)},buyer_id.eq.${enc(uid)})` : `${box === 'selling' ? 'seller_id' : 'buyer_id'}=eq.${enc(uid)}`
  const rows = await pointsRest<InquiryRow[]>(
    `marketplace_inquiries?${who}${postId ? `&post_id=eq.${enc(postId)}` : ''}` +
      '&select=*&order=last_message_at.desc&limit=100',
  )
  // Conversations with someone the viewer blocked leave the list
  const blocked = await getViewerBlockedUids(uid)
  const visible = (rows ?? []).filter((row) => !blocked.has(row.seller_id === uid ? row.buyer_id : row.seller_id))
  // Listings from the cached all-posts list (one Storage read at most), each other person read once (5 min cache)
  const others = [...new Set(visible.map((row) => (row.seller_id === uid ? row.buyer_id : row.seller_id)))]
  const [posts, people] = await Promise.all([
    getCommunityPostsByIds(visible.map((row) => row.post_id)).catch(() => new Map<string, CommunityPost>()),
    Promise.all(others.map(async (other) => [other, await person(other)] as const)).then((pairs) => new Map(pairs)),
  ])
  return visible.map((row) => {
    const other = row.seller_id === uid ? row.buyer_id : row.seller_id
    return toThread(row, uid, posts.get(row.post_id) ?? null, people.get(other) ?? { nickname: '', photo: null })
  })
}

/** Unread messages across the viewer's threads (the tab badge) — not counting people the viewer blocked, like the list. */
export async function unreadCount(uid: string) {
  const [selling, buying, blocked] = await Promise.all([
    pointsRest<{ buyer_id: string; seller_unread: number }[]>(
      `marketplace_inquiries?seller_id=eq.${enc(uid)}&seller_unread=gt.0&select=buyer_id,seller_unread`,
    ),
    pointsRest<{ seller_id: string; buyer_unread: number }[]>(
      `marketplace_inquiries?buyer_id=eq.${enc(uid)}&buyer_unread=gt.0&select=seller_id,buyer_unread`,
    ),
    getViewerBlockedUids(uid),
  ])
  return (
    (selling ?? []).reduce((n, r) => (blocked.has(r.buyer_id) ? n : n + r.seller_unread), 0) +
    (buying ?? []).reduce((n, r) => (blocked.has(r.seller_id) ? n : n + r.buyer_unread), 0)
  )
}

/** A listing marked sold (or deleted): its threads become read only. */
export async function closeThreadsForPost(postId: string) {
  await pointsRest(`marketplace_inquiries?post_id=eq.${enc(postId)}&status=eq.open`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'closed' }),
  }).catch(() => null)
}

/** A listing back on sale (판매완료 → 판매중 / 예약중): its threads open again so buyers can talk. */
export async function reopenThreadsForPost(postId: string) {
  await pointsRest(`marketplace_inquiries?post_id=eq.${enc(postId)}&status=eq.closed`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'open' }),
  }).catch(() => null)
}

/** Report on a conversation: kept on the thread too (who reported last, why). */
export async function markInquiryReported(inquiryId: string, reason: string) {
  await pointsRest(`marketplace_inquiries?id=eq.${enc(inquiryId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ reported_at: new Date().toISOString(), report_reason: reason.slice(0, 200) }),
  }).catch(() => null)
}

/** The other person in one of the viewer's threads (block / report from the conversation). */
export async function inquiryCounterpart(uid: string, inquiryId: string) {
  const thread = await threadFor(uid, inquiryId)
  const other = thread.seller_id === uid ? thread.buyer_id : thread.seller_id
  return { thread, uid: other, nickname: await nickname(other) }
}

/** Last few messages of a thread, oldest first (what the team sees with a report). */
export async function recentInquiryMessages(inquiryId: string, limit = 6) {
  const rows = await pointsRest<MessageRow[]>(
    `marketplace_inquiry_messages?inquiry_id=eq.${enc(inquiryId)}&select=*&order=created_at.desc&limit=${limit}`,
  )
  return (rows ?? []).reverse()
}
