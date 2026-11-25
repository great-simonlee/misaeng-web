import { after } from 'next/server'

import { sendApns, type ApnsEnvironment } from '@lib/push/apns.server'
import { getSupabaseServiceClient } from '@lib/supabase/server'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'
import { listVerifiedSchools } from '@lib/verification/verifiedSchools'

/**
 * Ellieo friends + 1:1 messages (tables and functions: ellieo-app/shared/ellieo/db/messaging.sql, on top of
 * retention.sql). The functions enforce membership, blocks, audience and rate limits with the signed-in uid; this
 * file validates input, maps uids ↔ public ids (pid — uids never leave the server), sends the realtime signal and
 * the push.
 *
 * Realtime is signal-only, like Misaeng's support chat (src/lib/support/realtime.server.ts): after a write the server
 * broadcasts `{ k, r }` on `ellieo:u:<inbox_key>` (a random key per member, only ever sent to its owner); the app then
 * refetches through this API. No message text goes over the socket, so public broadcast channels are enough and no
 * Supabase user JWT has to be minted (staging signs with ES256 keys the server doesn't hold).
 */

export const MESSAGE_RULES = {
  /** Same as the app's composer (ChatRoomView.maxLength / maxLineBreaks) and the table check. */
  maxLength: 2000,
  maxLineBreaks: 15,
  pageSize: 50,
  favoritesMax: 20,
} as const

export class MessagingError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/** 'ellieo:<CODE>' raised by the SQL functions → what the app shows. */
const SQL_ERRORS: Record<string, [string, number]> = {
  SELF: ["That's you.", 400],
  YOU_BLOCKED: ['Unblock them first.', 409],
  CANT_MESSAGE: ["You can't message this person.", 403],
  NOT_ACCEPTING: ['They only get messages from friends. Send a friend request instead.', 403],
  RATE_LIMIT: ['Slow down a little and try again in a minute.', 429],
  NOT_FOUND: ['Chat not found.', 404],
  EMPTY: ['Type a message first.', 400],
}

function db() {
  return getSupabaseServiceClient()
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(name, args as never)
  if (error) {
    const code = /ellieo:([A-Z_]+)/.exec(error.message)?.[1]
    if (code && SQL_ERRORS[code]) throw new MessagingError(SQL_ERRORS[code][0], code, SQL_ERRORS[code][1])
    if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42P01') {
      throw new MessagingError('Messaging is not set up yet (run messaging.sql).', 'SETUP_REQUIRED', 503)
    }
    throw new MessagingError(`Messaging failed: ${error.message}`, 'SERVER_ERROR', 500)
  }
  return data as T
}

// MARK: - People directory

export type PersonOut = {
  /** Public id (uuid). */
  id: string
  /** Ellieo ID, e.g. "linh.cu". */
  handle: string
  name: string
  photoUrl: string | null
  /** Verified school (students); null for professionals. */
  school: string | null
  professional: boolean
}

type PersonRow = {
  pid: string
  nickname: string
  name: string
  photo_url: string | null
  school: string | null
  professional: boolean
}

function person(row: PersonRow): PersonOut {
  return {
    id: row.pid,
    handle: row.nickname,
    name: row.name,
    photoUrl: row.photo_url,
    school: row.school,
    professional: Boolean(row.professional),
  }
}

/** Lowercase, tone marks removed (đ → d), only letters / digits / spaces / dots: what search compares. */
export function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}. ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const words = (text: string) => fold(text).split(/[\s.]+/).filter(Boolean)

export type Membership = {
  /** Onboarded (name + Ellieo ID) and verified (school, or a work email under review / approved). */
  canMessage: boolean
  reason: 'PROFILE_INCOMPLETE' | 'NOT_VERIFIED' | 'SUSPENDED' | null
  me: PersonOut | null
}

/** Dev only (never on production): lets an unverified test account message (ELLIEO_MESSAGING_ALLOW_UNVERIFIED=1). */
function allowUnverified() {
  return process.env.NODE_ENV !== 'production' && process.env.ELLIEO_MESSAGING_ALLOW_UNVERIFIED === '1'
}

function directoryRow(uid: string, profile: SupabaseProfileRecord | null) {
  const nickname = profile?.nickname?.trim() ?? ''
  const name = [profile?.firstName, profile?.lastName].map((p) => p?.trim()).filter(Boolean).join(' ') || nickname
  const schools = listVerifiedSchools(profile)
  const workStatus = profile?.workplaceStatus ?? null
  const schoolVerified = schools.length > 0 || Boolean(profile?.verifiedSchoolId)
  const workVerified = workStatus === 'pending' || workStatus === 'approved'
  const status = profile?.status ?? 'active'

  let reason: Membership['reason'] = null
  if (status === 'suspended' || status === 'deleted') reason = 'SUSPENDED'
  else if (!nickname || !profile?.firstName?.trim()) reason = 'PROFILE_INCOMPLETE'
  else if (!schoolVerified && !workVerified && !allowUnverified()) reason = 'NOT_VERIFIED'

  const school = schoolVerified ? (schools[0]?.name ?? profile?.verifiedSchoolName ?? null) : null
  const schoolId = schools[0]?.id ?? profile?.verifiedSchoolId ?? ''
  const initials = (school ?? '')
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .map((w) => w[0])
    .join('')
  const schoolKeys = school ? [...words(school), ...words(schoolId), fold(initials)].filter(Boolean) : []

  return {
    reason,
    row: {
      uid,
      nickname: nickname || uid.slice(0, 20),
      name: name.slice(0, 80) || 'Ellieo member',
      photo_url: profile?.photoURL?.trim() || null,
      school,
      professional: !school && workVerified,
      name_key: ` ${words(name).join(' ')} `,
      nick_key: fold(nickname).replace(/\s/g, ''),
      school_key: schoolKeys.length ? ` ${[...new Set(schoolKeys)].join(' ')} ` : '',
      active: reason === null,
      updated_at: new Date().toISOString(),
    },
  }
}

/** uid → last sync (ms). The profile is copied into the directory at most every few minutes per instance. */
const synced = new Map<string, { at: number; membership: Membership }>()
const SYNC_TTL_MS = 5 * 60_000

/**
 * Copies the member's profile into the people directory (search, names on chats) and says whether they may message.
 * `force` re-reads the profile (GET /api/ellieo/me after the app changed it).
 */
export async function syncMember(uid: string, force = false): Promise<Membership> {
  const hit = synced.get(uid)
  if (!force && hit && Date.now() - hit.at < SYNC_TTL_MS) return hit.membership
  const profile = await getSupabaseProfile(uid)
  const { reason, row } = directoryRow(uid, profile)
  const { data, error } = await db()
    .from('ellieo_people')
    .upsert(row as never, { onConflict: 'uid' })
    .select('pid, nickname, name, photo_url, school, professional')
    .single()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new MessagingError('Messaging is not set up yet (run messaging.sql).', 'SETUP_REQUIRED', 503)
    }
    throw new MessagingError(`Messaging failed: ${error.message}`, 'SERVER_ERROR', 500)
  }
  const membership: Membership = { canMessage: reason === null, reason, me: person(data as PersonRow) }
  if (synced.size > 5000) synced.clear()
  synced.set(uid, { at: Date.now(), membership })
  return membership
}

const REASON_TEXT: Record<NonNullable<Membership['reason']>, string> = {
  PROFILE_INCOMPLETE: 'Add your name and Ellieo ID first.',
  NOT_VERIFIED: 'Verify your school or work email to message people.',
  SUSPENDED: 'Your account is suspended.',
}

/** Writes (send, requests, open a chat) need a complete, verified account. */
export async function requireMember(uid: string) {
  const membership = await syncMember(uid)
  if (!membership.canMessage) {
    throw new MessagingError(REASON_TEXT[membership.reason ?? 'NOT_VERIFIED'], membership.reason ?? 'NOT_VERIFIED', 403)
  }
  return membership
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

/** An ISO timestamp as the API returned it (kept as text: Postgres keeps microseconds). */
const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value))

/** Public id → uid. `activeOnly`: only people who can be found / messaged now. */
async function uidFor(pid: unknown, activeOnly: boolean) {
  if (!isUuid(pid)) throw new MessagingError('Person not found.', 'NOT_FOUND', 404)
  let query = db().from('ellieo_people').select('uid').eq('pid', pid)
  if (activeOnly) query = query.eq('active', true)
  const { data } = await query.maybeSingle()
  const uid = (data as { uid?: string } | null)?.uid
  if (!uid) throw new MessagingError('Person not found.', 'NOT_FOUND', 404)
  return uid
}

export async function searchPeople(uid: string, query: string) {
  const q = fold(query.replace(/^@/, '')).replace(/[%_\\]/g, '').slice(0, 40)
  if (!q) return []
  await syncMember(uid)
  const rows = await rpc<(PersonRow & { relation: string | null })[]>('ellieo_people_search', {
    p_me: uid,
    p_q: q,
    p_limit: 30,
  })
  return rows.map((row) => ({ ...person(row), relation: row.relation }))
}

// MARK: - Settings

export type ChatSettings = {
  audience: 'friends' | 'verified' | 'everyone'
  readReceipts: boolean
  notifications: boolean
  preview: boolean
}

type SettingsRow = {
  audience: ChatSettings['audience']
  read_receipts: boolean
  notifications: boolean
  preview: boolean
  inbox_key: string
}

async function settingsRow(uid: string): Promise<SettingsRow> {
  return rpc<SettingsRow>('ellieo_settings', { p_user: uid })
}

const settingsOut = (row: SettingsRow): ChatSettings => ({
  audience: row.audience,
  readReceipts: row.read_receipts,
  notifications: row.notifications,
  preview: row.preview,
})

export async function updateSettings(uid: string, patch: Partial<ChatSettings>) {
  await settingsRow(uid)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.audience !== undefined) {
    if (!['friends', 'verified', 'everyone'].includes(patch.audience)) throw new MessagingError('Pick who can message you.', 'INVALID')
    update.audience = patch.audience
  }
  for (const [key, column] of [
    ['readReceipts', 'read_receipts'],
    ['notifications', 'notifications'],
    ['preview', 'preview'],
  ] as const) {
    if (patch[key] !== undefined) update[column] = Boolean(patch[key])
  }
  const { data, error } = await db().from('ellieo_chat_settings').update(update as never).eq('user_id', uid).select('*').single()
  if (error) throw new MessagingError(`Saving failed: ${error.message}`, 'SERVER_ERROR', 500)
  return settingsOut(data as SettingsRow)
}

function realtimeConfig(inboxKey: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return {
    socketUrl: `${url.replace(/^http/, 'ws').replace(/\/+$/, '')}/realtime/v1/websocket`,
    anonKey,
    topic: inboxTopic(inboxKey),
  }
}

const inboxTopic = (inboxKey: string) => `ellieo:u:${inboxKey}`

/** GET /api/ellieo/me: who I am on Ellieo, whether I can message, my chat settings and my realtime channel. */
export async function messagingMe(uid: string) {
  const membership = await syncMember(uid, true)
  const settings = await settingsRow(uid)
  return {
    me: membership.me,
    canMessage: membership.canMessage,
    reason: membership.reason,
    settings: settingsOut(settings),
    realtime: realtimeConfig(settings.inbox_key),
    rules: MESSAGE_RULES,
  }
}

// MARK: - Friends

type SocialRow = PersonRow & { relation: 'friend' | 'incoming' | 'sent' | 'blocked'; starred_at: string | null; since: string }

export async function socialState(uid: string) {
  await syncMember(uid)
  const rows = await rpc<SocialRow[]>('ellieo_social_people', { p_me: uid })
  const pick = (relation: SocialRow['relation']) => rows.filter((r) => r.relation === relation)
  const byName = (a: SocialRow, b: SocialRow) => a.name.localeCompare(b.name)
  const newest = (a: SocialRow, b: SocialRow) => b.since.localeCompare(a.since)
  return {
    friends: pick('friend')
      .sort(byName)
      .map((r) => ({ ...person(r), favoriteAt: r.starred_at })),
    incoming: pick('incoming').sort(newest).map((r) => ({ ...person(r), at: r.since })),
    sent: pick('sent').sort(newest).map((r) => ({ ...person(r), at: r.since })),
    blocked: pick('blocked').sort(newest).map(person),
  }
}

export type FriendAction = 'request' | 'accept' | 'decline' | 'cancel' | 'remove' | 'star' | 'unstar' | 'block' | 'unblock'

/** One endpoint for every friend / block change. Returns what the app needs to update its row. */
export async function friendAction(uid: string, action: FriendAction, pid: unknown) {
  // Removing, declining, unstarring and (un)blocking work on anyone; the rest need both sides to be real members.
  const needsMember = action === 'request' || action === 'accept'
  if (needsMember) await requireMember(uid)
  else await syncMember(uid)
  const other = await uidFor(pid, needsMember)
  let result: unknown = true
  switch (action) {
    case 'request':
      result = await rpc<string>('ellieo_friend_request', { p_me: uid, p_other: other })
      break
    case 'accept':
      result = await rpc<boolean>('ellieo_friend_accept', { p_me: uid, p_other: other })
      if (!result) throw new MessagingError('That request is gone.', 'NOT_FOUND', 404)
      break
    case 'decline':
      await rpc('ellieo_friend_decline', { p_me: uid, p_other: other })
      break
    case 'cancel':
      await rpc('ellieo_friend_cancel', { p_me: uid, p_other: other })
      break
    case 'remove':
      await rpc('ellieo_friend_remove', { p_me: uid, p_other: other })
      break
    case 'star':
    case 'unstar':
      result = await rpc<boolean>('ellieo_friend_star', { p_me: uid, p_other: other, p_on: action === 'star' })
      if (!result) {
        throw new MessagingError(`You can have up to ${MESSAGE_RULES.favoritesMax} favorites. Unstar someone first.`, 'FAVORITES_FULL', 409)
      }
      break
    case 'block':
      await rpc('ellieo_block', { p_me: uid, p_other: other })
      break
    case 'unblock':
      await rpc('ellieo_unblock', { p_me: uid, p_other: other })
      break
    default:
      throw new MessagingError('Unknown action.', 'INVALID')
  }
  // Their friends list / requests changed too (not for block: they're never told).
  if (action === 'request' || action === 'accept') signalUsers([uid, other], { k: 'social' })
  else signalUsers([uid], { k: 'social' })
  return { status: typeof result === 'string' ? result : 'ok' }
}

// MARK: - Conversations

type ListRow = {
  room_id: string
  accepted: boolean
  muted: boolean
  joined_at: string
  last_at: string | null
  last_body: string | null
  last_from_me: boolean | null
  unread: number
  peer_read_at: string | null
  receipts: boolean
  peer_pid: string | null
  peer_nickname: string | null
  peer_name: string | null
  peer_photo_url: string | null
  peer_school: string | null
  peer_professional: boolean | null
  friends: boolean
}

function peerOf(row: Pick<ListRow, 'peer_pid' | 'peer_nickname' | 'peer_name' | 'peer_photo_url' | 'peer_school' | 'peer_professional'>): PersonOut | null {
  if (!row.peer_pid) return null
  return person({
    pid: row.peer_pid,
    nickname: row.peer_nickname ?? '',
    name: row.peer_name ?? 'Ellieo member',
    photo_url: row.peer_photo_url,
    school: row.peer_school,
    professional: Boolean(row.peer_professional),
  })
}

function conversationOut(row: ListRow) {
  return {
    id: row.room_id,
    peer: peerOf(row),
    /** false = a message request (shown under Requests until accepted). */
    accepted: row.accepted,
    muted: row.muted,
    friends: row.friends,
    unread: row.unread,
    /** Read receipts apply (both have them on and both accepted the chat): then peerReadAt is how far they've read. */
    receipts: row.receipts,
    peerReadAt: row.peer_read_at,
    lastMessage: row.last_at ? { body: row.last_body ?? '', fromMe: Boolean(row.last_from_me), at: row.last_at } : null,
    updatedAt: row.last_at ?? row.joined_at,
  }
}

export async function listConversations(uid: string) {
  await syncMember(uid)
  const rows = await rpc<ListRow[]>('ellieo_dm_list', { p_me: uid, p_limit: 200 })
  return rows.map(conversationOut)
}

/** Opens (or creates) the 1:1 chat with a person and returns it. */
export async function openConversation(uid: string, pid: unknown) {
  await requireMember(uid)
  const other = await uidFor(pid, true)
  const roomId = await rpc<string>('ellieo_dm_open', { p_me: uid, p_other: other })
  return conversation(uid, roomId)
}

type RoomRow = Omit<ListRow, 'joined_at' | 'last_at' | 'last_body' | 'last_from_me' | 'unread'> & {
  cleared_at: string | null
  blocked: boolean
}

export async function conversation(uid: string, roomId: string) {
  if (!isUuid(roomId)) throw new MessagingError('Chat not found.', 'NOT_FOUND', 404)
  const rows = await rpc<RoomRow[]>('ellieo_dm_room', { p_me: uid, p_room: roomId })
  const row = rows[0]
  if (!row) throw new MessagingError('Chat not found.', 'NOT_FOUND', 404)
  return {
    id: row.room_id,
    peer: peerOf(row),
    accepted: row.accepted,
    muted: row.muted,
    friends: row.friends,
    blocked: row.blocked,
    receipts: row.receipts,
    peerReadAt: row.peer_read_at,
  }
}

type MessageRow = { id: string; client_id: string | null; from_me: boolean; body: string; kind: string; created_at: string }

const messageOut = (row: MessageRow) => ({
  id: row.id,
  clientId: row.client_id,
  fromMe: row.from_me,
  body: row.body,
  kind: row.kind,
  at: row.created_at,
})

/** Oldest first. `before`: an older page; `after`: everything newer (catch-up after a signal or while polling). */
export async function listMessages(uid: string, roomId: string, opts: { before?: string | null; after?: string | null; limit?: number }) {
  const chat = await conversation(uid, roomId)
  // Cursors go to Postgres as sent: timestamps have microseconds, a JS Date would round them to milliseconds.
  const time = (value?: string | null) => {
    if (!value) return null
    if (!isTimestamp(value)) throw new MessagingError('Bad cursor.', 'INVALID')
    return value
  }
  const limit = Math.min(Math.max(Number(opts.limit) || MESSAGE_RULES.pageSize, 1), 100)
  const rows = await rpc<MessageRow[]>('ellieo_dm_messages', {
    p_me: uid,
    p_room: roomId,
    p_before: time(opts.before),
    p_after: time(opts.after),
    p_limit: limit,
  })
  const messages = rows.map(messageOut).reverse()
  return { conversation: chat, messages, hasMore: !opts.after && rows.length === limit }
}

/** The composer's rules, checked again here: trimmed, ≤ 2,000 characters, ≤ 15 line breaks, at most one blank line. */
export function cleanBody(raw: unknown) {
  if (typeof raw !== 'string') throw new MessagingError('Type a message first.', 'EMPTY')
  const body = raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!body) throw new MessagingError('Type a message first.', 'EMPTY')
  if ([...body].length > MESSAGE_RULES.maxLength) {
    throw new MessagingError(`Messages can be up to ${MESSAGE_RULES.maxLength.toLocaleString('en-US')} characters.`, 'TOO_LONG')
  }
  if ((body.match(/\n/g)?.length ?? 0) > MESSAGE_RULES.maxLineBreaks) {
    throw new MessagingError(`Messages can have up to ${MESSAGE_RULES.maxLineBreaks} line breaks.`, 'TOO_MANY_LINES')
  }
  return body
}

type SendRow = { message_id: string; created_at: string; duplicate: boolean; peer_id: string; peer_muted: boolean; peer_accepted: boolean }

export async function sendMessage(uid: string, roomId: string, input: { clientId?: unknown; body?: unknown }) {
  const { me } = await requireMember(uid)
  if (!isUuid(roomId)) throw new MessagingError('Chat not found.', 'NOT_FOUND', 404)
  if (input.clientId != null && !isUuid(input.clientId)) throw new MessagingError('Bad message id.', 'INVALID')
  const body = cleanBody(input.body)
  const rows = await rpc<SendRow[]>('ellieo_dm_send', {
    p_me: uid,
    p_room: roomId,
    p_client: input.clientId ?? null,
    p_body: body,
  })
  const sent = rows[0]
  if (!sent) throw new MessagingError('Chat not found.', 'NOT_FOUND', 404)
  if (!sent.duplicate) {
    signalUsers([uid, sent.peer_id], { k: 'message', r: roomId })
    if (!sent.peer_muted) pushMessage({ to: sent.peer_id, roomId, from: me, body, request: !sent.peer_accepted })
  }
  return {
    id: sent.message_id,
    clientId: (input.clientId as string | undefined) ?? null,
    fromMe: true,
    body,
    kind: 'text',
    at: sent.created_at,
  }
}

export type ConversationAction = 'read' | 'accept' | 'leave' | 'mute' | 'unmute' | 'report'

export async function conversationAction(
  uid: string,
  roomId: string,
  action: ConversationAction,
  input: { at?: unknown; messageId?: unknown; reason?: unknown },
) {
  if (!isUuid(roomId)) throw new MessagingError('Chat not found.', 'NOT_FOUND', 404)
  const done = (ok: boolean) => {
    if (!ok) throw new MessagingError('Chat not found.', 'NOT_FOUND', 404)
    return { ok: true }
  }
  switch (action) {
    case 'read': {
      const at = isTimestamp(input.at) ? input.at : null
      const rows = await rpc<{ read_at: string; peer_id: string; share: boolean }[]>('ellieo_dm_read', { p_me: uid, p_room: roomId, p_at: at })
      const row = rows[0]
      if (!row) return done(false)
      signalUsers(row.share ? [uid, row.peer_id] : [uid], { k: 'read', r: roomId })
      return { ok: true, readAt: row.read_at }
    }
    case 'accept':
      done(await rpc<boolean>('ellieo_dm_accept', { p_me: uid, p_room: roomId }))
      signalUsers([uid], { k: 'message', r: roomId })
      return { ok: true }
    case 'leave':
      done(await rpc<boolean>('ellieo_dm_leave', { p_me: uid, p_room: roomId }))
      signalUsers([uid], { k: 'message', r: roomId })
      return { ok: true }
    case 'mute':
    case 'unmute':
      return done(await rpc<boolean>('ellieo_dm_mute', { p_me: uid, p_room: roomId, p_on: action === 'mute' }))
    case 'report': {
      if (!isUuid(input.messageId)) throw new MessagingError('Message not found.', 'NOT_FOUND', 404)
      const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : null
      const ok = await rpc<boolean>('ellieo_dm_report', { p_me: uid, p_room: roomId, p_message: input.messageId, p_reason: reason })
      if (!ok) throw new MessagingError('Message not found.', 'NOT_FOUND', 404)
      return { ok: true }
    }
    default:
      throw new MessagingError('Unknown action.', 'INVALID')
  }
}

export async function readAll(uid: string) {
  const rooms = await rpc<string[]>('ellieo_dm_read_all', { p_me: uid })
  if (rooms.length) signalUsers([uid], { k: 'read' })
  return { ok: true, count: rooms.length }
}

// MARK: - Realtime signals

type Signal = { k: 'message' | 'read' | 'social'; r?: string }

/** Fire-and-forget after the response: one broadcast per member's inbox channel. Never throws. */
function signalUsers(uids: string[], signal: Signal) {
  const run = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    const unique = [...new Set(uids.filter(Boolean))]
    if (!url || !key || unique.length === 0) return
    try {
      const { data } = await db().from('ellieo_chat_settings').select('inbox_key').in('user_id', unique)
      const topics = ((data ?? []) as { inbox_key: string }[]).map((row) => inboxTopic(row.inbox_key))
      if (topics.length === 0) return
      const res = await fetch(`${url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: topics.map((topic) => ({ topic, event: 'ellieo', payload: signal, private: false })) }),
        signal: AbortSignal.timeout(4000),
      })
      if (!res.ok) console.error('Ellieo broadcast failed:', res.status, (await res.text()).slice(0, 200))
    } catch (error) {
      console.error('Ellieo broadcast error:', error)
    }
  }
  try {
    after(run)
  } catch {
    void run()
  }
}

// MARK: - Push (Ellieo app devices)

/** The Ellieo iOS app (same team key as Misaeng: APNS_KEY / APNS_TEAM_ID). */
const ELLIEO_TOPIC = () => process.env.ELLIEO_APNS_BUNDLE_ID?.trim() || 'com.misaeng.ellieo'
const TOKEN_PATTERN = /^[0-9a-f]{64,200}$/i

export async function savePushDevice(uid: string, input: { token?: unknown; environment?: unknown; locale?: unknown }) {
  const token = String(input.token ?? '').trim()
  if (!TOKEN_PATTERN.test(token)) throw new MessagingError('Invalid device token.', 'INVALID')
  const locale = input.locale === 'vi' ? 'vi' : 'en'
  const { error } = await db()
    .from('ellieo_push_devices')
    .upsert(
      {
        token,
        user_id: uid,
        platform: 'ios',
        environment: input.environment === 'sandbox' ? 'sandbox' : 'production',
        locale,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'token' },
    )
  if (error) throw new MessagingError(`Push registration failed: ${error.message}`, 'SERVER_ERROR', 500)
}

export async function deletePushDevice(token: unknown, uid: string | null) {
  const value = String(token ?? '').trim()
  if (!TOKEN_PATTERN.test(value)) return
  let query = db().from('ellieo_push_devices').delete().eq('token', value)
  if (uid) query = query.eq('user_id', uid)
  await query
}

const PUSH_TEXT = {
  en: { hidden: 'New message', request: 'Message request' },
  vi: { hidden: 'Tin nhắn mới', request: 'Tin nhắn chờ' },
} as const

/**
 * New 1:1 message → the receiver's Ellieo devices, after the response. Skipped when they muted the chat (checked by
 * the caller) or turned message notifications off; "Show message preview" off hides the text. Blocked senders never
 * get this far (the send is refused).
 */
function pushMessage(input: { to: string; roomId: string; from: PersonOut | null; body: string; request: boolean }) {
  const run = async () => {
    try {
      const settings = await settingsRow(input.to)
      if (!settings.notifications) return
      const { data } = await db().from('ellieo_push_devices').select('token, environment, locale').eq('user_id', input.to)
      const devices = (data ?? []) as { token: string; environment: ApnsEnvironment; locale: string }[]
      if (devices.length === 0) return
      const dead: string[] = []
      for (const locale of ['en', 'vi'] as const) {
        const group = devices.filter((d) => (d.locale === 'vi' ? 'vi' : 'en') === locale)
        if (group.length === 0) continue
        const text = PUSH_TEXT[locale]
        const name = input.from?.name ?? 'Ellieo'
        const results = await sendApns(
          group,
          {
            title: name,
            ...(input.request ? { subtitle: text.request } : {}),
            body: settings.preview ? previewLine(input.body) : text.hidden,
            threadId: `ellieo-dm-${input.roomId}`,
            data: { type: 'ellieo_dm', room: input.roomId },
          },
          { topic: ELLIEO_TOPIC() },
        )
        dead.push(...results.filter((r) => r.unregistered).map((r) => r.token))
        const failed = results.filter((r) => !r.ok && !r.unregistered)
        if (failed.length) console.error('Ellieo push failed:', failed.map((r) => `${r.status} ${r.reason}`).join(', '))
      }
      if (dead.length) await db().from('ellieo_push_devices').delete().in('token', dead)
    } catch (error) {
      console.error('Ellieo push error:', error)
    }
  }
  try {
    after(run)
  } catch {
    void run()
  }
}

function previewLine(text: string, max = 120) {
  const plain = text.replace(/\s+/g, ' ').trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}
