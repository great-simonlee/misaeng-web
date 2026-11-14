import { getViewerBlockedUids } from '@lib/community/blocks.server'
import { getStoredCommunityPost } from '@lib/supabase/community.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { enc, pointsRest } from '@lib/points/rest.server'
import { notifyUsers } from '@lib/push/notify.server'

/*
 * 중고거래 문의 스레드 (supabase/marketplace_inquiries.sql). One thread per listing and buyer; both sides add
 * messages and each one is a push to the other side — no live chat. Sold listings' threads close (read only).
 */

export const INQUIRY_MESSAGE_MAX = 1000
/** New threads a buyer may open per day (spam guard; replies are not limited) */
export const NEW_INQUIRIES_PER_DAY = 20

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

async function listingFor(postId: string) {
  const post = await getStoredCommunityPost(postId)
  if (!post || post.status !== 'open') throw new InquiryError('not_found', 404)
  if (post.categoryId !== 'marketplace') throw new InquiryError('not_marketplace')
  return post
}

async function nickname(uid: string) {
  const profile = await getSupabaseProfile(uid).catch(() => null)
  return (typeof profile?.nickname === 'string' && profile.nickname.trim()) || ''
}

/** What one side sees of a thread: the listing, the other person and the unread count. */
async function toThread(row: InquiryRow, viewer: string) {
  const seller = row.seller_id === viewer
  const post = await getStoredCommunityPost(row.post_id).catch(() => null)
  const other = seller ? row.buyer_id : row.seller_id
  return {
    id: row.id,
    postId: row.post_id,
    role: seller ? 'seller' : 'buyer',
    status: row.status,
    otherNickname: await nickname(other),
    listing: post
      ? {
          title: post.title,
          price: (post as { price?: number | null }).price ?? null,
          photo: post.galleryPhotos?.[0]?.imageUrl || post.thumbnailUrl || null,
          marketStatus: (post as { marketStatus?: string }).marketStatus ?? 'selling',
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
  if ((post as { marketStatus?: string }).marketStatus === 'sold') throw new InquiryError('closed')
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
    const created = await pointsRest<InquiryRow[]>('marketplace_inquiries', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({ post_id: input.postId, city: post.city, seller_id: sellerId, buyer_id: input.uid }),
    })
    thread = created[0]
  }
  if (thread.status === 'closed') throw new InquiryError('closed')
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
  const other = thread.seller_id === input.uid ? thread.buyer_id : thread.seller_id
  const blocked = await getViewerBlockedUids(other)
  if (blocked.has(input.uid)) throw new InquiryError('blocked', 403)
  await addMessage(thread, input.uid, body)
  const post = await getStoredCommunityPost(thread.post_id).catch(() => null)
  pushMessage({ to: other, inquiryId: thread.id, postId: thread.post_id, title: post?.title ?? '', body, first: false })
}

async function addMessage(thread: InquiryRow, sender: string, body: string) {
  await pointsRest('marketplace_inquiry_messages', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({ inquiry_id: thread.id, sender_id: sender, body }),
  })
  const fromSeller = sender === thread.seller_id
  await pointsRest(`marketplace_inquiries?id=eq.${enc(thread.id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      last_message: body.slice(0, 200),
      last_message_at: new Date().toISOString(),
      last_sender_id: sender,
      ...(fromSeller ? { buyer_unread: thread.buyer_unread + 1 } : { seller_unread: thread.seller_unread + 1 }),
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
  return {
    thread: await toThread({ ...thread, ...(seller ? { seller_unread: 0 } : { buyer_unread: 0 }) }, uid),
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
  return Promise.all((rows ?? []).map((row) => toThread(row, uid)))
}

/** Unread messages across all the viewer's threads (the tab badge). */
export async function unreadCount(uid: string) {
  const [selling, buying] = await Promise.all([
    pointsRest<{ seller_unread: number }[]>(`marketplace_inquiries?seller_id=eq.${enc(uid)}&seller_unread=gt.0&select=seller_unread`),
    pointsRest<{ buyer_unread: number }[]>(`marketplace_inquiries?buyer_id=eq.${enc(uid)}&buyer_unread=gt.0&select=buyer_unread`),
  ])
  return (selling ?? []).reduce((n, r) => n + r.seller_unread, 0) + (buying ?? []).reduce((n, r) => n + r.buyer_unread, 0)
}

/** A listing marked sold (or deleted): its threads become read only. */
export async function closeThreadsForPost(postId: string) {
  await pointsRest(`marketplace_inquiries?post_id=eq.${enc(postId)}&status=eq.open`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'closed' }),
  }).catch(() => null)
}
