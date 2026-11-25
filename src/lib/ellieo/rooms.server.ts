import {
  afterResponse,
  broadcast,
  cleanBody,
  inboxTopic,
  isTimestamp,
  isUuid,
  MESSAGE_RULES,
  MessagingError,
  person,
  previewLine,
  PUSH_TEXT,
  pushToMembers,
  requireMember,
  rpc,
  signalUsers,
  syncMember,
  uidFor,
  type PersonOut,
  type PushLocale,
} from './messaging.server'

/**
 * Ellieo group rooms: official NYC rooms, "Your school" rooms and Young Professionals (tables and functions:
 * ellieo-app/shared/ellieo/db/rooms.sql, on top of retention.sql + messaging.sql). The SQL functions check access with
 * the signed-in uid; this file validates input, creates a school's room the first time one of its students lists
 * rooms, and tells members about new messages (signal-only realtime + push), like the 1:1 chats in
 * messaging.server.ts.
 */

export const ROOM_RULES = {
  /** Members see this many days of history; non-members see `previewCount` messages. */
  visibleDays: 30,
  previewCount: 3,
  /** The server keeps group messages this long (retention.sql), then deletes them. */
  serverDays: 90,
  perMinute: 20,
  maxLength: MESSAGE_RULES.maxLength,
  membersPage: 50,
  /** Signals beyond this many members are skipped (the apps poll); pushes stop at `pushCap`. Fine for staging scale. */
  signalCap: 5000,
  pushCap: 1000,
  /** At most one push per room per member in this window; the next one says "N new messages". */
  pushWindowSeconds: 180,
} as const

type RoomRow = {
  room_id: string
  slug: string
  room_type: 'official' | 'school' | 'professional'
  name: string
  name_vi: string | null
  summary: string | null
  summary_vi: string | null
  topic: string | null
  icon: string | null
  school_id: string | null
  member_count: number
  sort: number
  joined: boolean
  role: 'admin' | 'manager' | 'member' | null
  muted: boolean
  can_join: boolean
  banned_until: string | null
  unread: number
  last_at: string | null
  last_body: string | null
  last_sender: string | null
  last_from_me: boolean | null
  last_deleted: boolean | null
}

function roomOut(row: RoomRow) {
  return {
    id: row.room_id,
    /** Stable app id: housing, market, jobs, visa, newcomers, food, events, young-pros, school-<id>. */
    slug: row.slug,
    type: row.room_type,
    name: row.name,
    nameVi: row.name_vi,
    summary: row.summary ?? '',
    summaryVi: row.summary_vi,
    topic: row.topic ?? 'social',
    icon: row.icon,
    schoolId: row.school_id,
    members: row.member_count,
    joined: row.joined,
    /** My role: admin | manager | member (Ellieo staff are admins of official rooms), null when not a member. */
    role: row.role,
    muted: row.muted,
    /** Whether I may join (verified, the right school, a verified work email). */
    canJoin: row.can_join,
    /** Removed by an admin: can't rejoin until then. */
    removedUntil: row.banned_until,
    unread: row.unread,
    /** Run by Ellieo: official rooms and Young Professionals ("Ellieo Team" admins). */
    team: row.room_type !== 'school',
    lastMessage: row.last_at
      ? {
          body: row.last_body ?? '',
          sender: row.last_sender ?? '',
          fromMe: Boolean(row.last_from_me),
          removed: Boolean(row.last_deleted),
          at: row.last_at,
        }
      : null,
  }
}

export type RoomOut = ReturnType<typeof roomOut>

/** School rooms already created (per server instance), so listing doesn't upsert every time. */
const ensuredSchools = new Set<string>()

async function ensureSchoolRooms(schools: { id: string; name: string; shortName: string }[]) {
  for (const school of schools) {
    if (ensuredSchools.has(school.id)) continue
    const short = school.shortName || school.name
    // Vietnamese-student rooms (owner 11-24): "NYU Vietnamese Students" / "Sinh viên Việt Nam NYU".
    await rpc<string>('ellieo_room_ensure_school', {
      p_school: school.id,
      p_name: `${short} Vietnamese Students`,
      p_name_vi: `Sinh viên Việt Nam ${short}`,
      p_summary: `Vietnamese students at ${school.name}, verified only: classes, housing, Tết and rides home`,
      p_summary_vi: `Sinh viên Việt Nam tại ${school.name}, đã xác minh: lớp học, nhà ở, Tết và đi chung xe`,
    })
    ensuredSchools.add(school.id)
  }
}

/**
 * GET /api/ellieo/rooms: rooms I'm in and the ones I can find in Explore (official rooms for everyone, my school's
 * room and Young Professionals only for those who may join). Creates my school's room on first use.
 */
export async function listRooms(uid: string) {
  const membership = await syncMember(uid)
  if (membership.schools.length) await ensureSchoolRooms(membership.schools)
  const rows = await rpc<RoomRow[]>('ellieo_room_list', { p_me: uid, p_room: null })
  return {
    rooms: rows.map(roomOut),
    canJoin: membership.canMessage,
    reason: membership.reason,
    rules: ROOM_RULES,
  }
}

export async function getRoom(uid: string, roomId: unknown) {
  if (!isUuid(roomId)) throw new MessagingError('Room not found.', 'NOT_FOUND', 404)
  const rows = await rpc<RoomRow[]>('ellieo_room_list', { p_me: uid, p_room: roomId })
  const row = rows[0]
  if (!row) throw new MessagingError('Room not found.', 'NOT_FOUND', 404)
  return roomOut(row)
}

type RoomMessageRow = {
  id: string
  client_id: string | null
  from_me: boolean
  sender_pid: string | null
  sender_nickname: string | null
  sender_name: string
  sender_photo: string | null
  sender_school: string | null
  sender_professional: boolean
  sender_role: 'admin' | 'manager' | 'member'
  sender_staff: boolean
  body: string
  kind: string
  deleted: boolean
  created_at: string
  preview: boolean
}

function roomMessageOut(row: RoomMessageRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    fromMe: row.from_me,
    /** null after the sender's account was deleted ("Deleted user"). */
    sender: row.sender_pid
      ? {
          ...person({
            pid: row.sender_pid,
            nickname: row.sender_nickname ?? '',
            name: row.sender_name,
            photo_url: row.sender_photo,
            school: row.sender_school,
            professional: row.sender_professional,
          }),
          role: row.sender_role,
          team: row.sender_staff,
        }
      : null,
    /** Empty when removed by an admin (shown as "Message removed"). */
    body: row.body,
    kind: row.kind,
    removed: row.deleted,
    at: row.created_at,
  }
}

const cursor = (value?: string | null) => {
  if (!value) return null
  if (!isTimestamp(value)) throw new MessagingError('Bad cursor.', 'INVALID')
  return value
}

/**
 * Oldest first. Members: the last 30 days, `before` for older pages, `after` for what's new. Not a member: the last
 * three (preview: true).
 */
export async function listRoomMessages(
  uid: string,
  roomId: string,
  opts: { before?: string | null; after?: string | null; limit?: number },
) {
  const room = await getRoom(uid, roomId)
  const limit = Math.min(Math.max(Number(opts.limit) || MESSAGE_RULES.pageSize, 1), 100)
  const rows = await rpc<RoomMessageRow[]>('ellieo_room_messages', {
    p_me: uid,
    p_room: roomId,
    p_before: cursor(opts.before),
    p_after: cursor(opts.after),
    p_limit: limit,
  })
  const preview = !room.joined
  return {
    room,
    messages: rows.map(roomMessageOut).reverse(),
    preview,
    hasMore: !preview && !opts.after && rows.length === limit,
  }
}

type RoomSendRow = { message_id: string; created_at: string; duplicate: boolean }

export async function sendRoomMessage(uid: string, roomId: string, input: { clientId?: unknown; body?: unknown }) {
  const { me } = await requireMember(uid)
  if (!isUuid(roomId)) throw new MessagingError('Room not found.', 'NOT_FOUND', 404)
  if (input.clientId != null && !isUuid(input.clientId)) throw new MessagingError('Bad message id.', 'INVALID')
  const body = cleanBody(input.body)
  const rows = await rpc<RoomSendRow[]>('ellieo_room_send', {
    p_me: uid,
    p_room: roomId,
    p_client: input.clientId ?? null,
    p_body: body,
  })
  const sent = rows[0]
  if (!sent) throw new MessagingError('Room not found.', 'NOT_FOUND', 404)
  if (!sent.duplicate) tellMembers(roomId, uid, { from: me, body })
  return {
    id: sent.message_id,
    clientId: (input.clientId as string | undefined) ?? null,
    fromMe: true,
    sender: me ? { ...me, role: 'member', team: false } : null,
    body,
    kind: 'text',
    removed: false,
    at: sent.created_at,
  }
}

type RecipientRow = {
  user_id: string
  muted: boolean
  inbox_key: string | null
  notifications: boolean
  preview: boolean
  blocked_sender: boolean
}

/**
 * After the response: a signal to every member's channel (the sender's too, for their other devices), and with a
 * message, a push to members who haven't muted the room, have message notifications on and haven't blocked the sender:
 * title = room name, body = "Name: text" (just "New message" with previews off), badge = their total unread.
 */
function tellMembers(roomId: string, senderUid: string, message?: { from: PersonOut | null; body: string }) {
  afterResponse(async () => {
    const recipients = await rpc<RecipientRow[]>('ellieo_room_recipients', {
      p_room: roomId,
      p_sender: senderUid,
      p_limit: ROOM_RULES.signalCap,
    })
    await broadcast(
      recipients.flatMap((r) => (r.inbox_key ? [inboxTopic(r.inbox_key)] : [])),
      { k: 'room', r: roomId },
    )
    if (!message) return
    const eligible = recipients
      .filter((r) => r.user_id !== senderUid && !r.muted && r.notifications && !r.blocked_sender)
      .slice(0, ROOM_RULES.pushCap)
    if (eligible.length === 0) return
    // Throttle: only members not pushed for this room in the last 3 minutes; `messages` = how many since their last push.
    const claimed = await rpc<{ user_id: string; messages: number }[]>('ellieo_room_push_claim', {
      p_room: roomId,
      p_uids: eligible.map((r) => r.user_id),
      p_seconds: ROOM_RULES.pushWindowSeconds,
    })
    const counts = new Map(claimed.map((c) => [c.user_id, Number(c.messages) || 1]))
    const targets = eligible
      .filter((r) => counts.has(r.user_id))
      .map((r) => ({ uid: r.user_id, preview: r.preview, count: counts.get(r.user_id) ?? 1 }))
    if (targets.length === 0) return
    const rows = await rpc<RoomRow[]>('ellieo_room_list', { p_me: senderUid, p_room: roomId })
    const room = rows[0]
    const title = (locale: PushLocale) => (locale === 'vi' && room?.name_vi ? room.name_vi : (room?.name ?? 'Ellieo'))
    const name = message.from?.name ?? 'Ellieo'
    const many = (locale: PushLocale, count: number) => (locale === 'vi' ? `${count} tin nhắn mới` : `${count} new messages`)
    await pushToMembers(targets, (locale, preview, count) => ({
      title: title(locale),
      // Held-back messages: "3 new messages · Linh: …" (or just "3 new messages" with previews off).
      body: preview
        ? `${count > 1 ? `${many(locale, count)} · ` : ''}${name}: ${previewLine(message.body, 110)}`
        : count > 1
          ? many(locale, count)
          : PUSH_TEXT[locale].hidden,
      threadId: `ellieo-room-${roomId}`,
      data: { type: 'ellieo_room', room: roomId, slug: room?.slug ?? '' },
    }))
  })
}

export type RoomAction = 'join' | 'leave' | 'mute' | 'unmute' | 'read' | 'report' | 'remove-message' | 'remove-member'

/**
 * { action: 'join' | 'leave' | 'mute' | 'unmute' }
 * { action: 'read', at? }                         read up to `at` (newest message seen; default now)
 * { action: 'report', messageId, reason? }        someone else's message, copied for review
 * { action: 'remove-message', messageId }         admin / manager: "Message removed" for everyone
 * { action: 'remove-member', memberId }           admin / manager: out of the room, can't rejoin for 24 h
 */
export async function roomAction(
  uid: string,
  roomId: string,
  action: RoomAction,
  input: { at?: unknown; messageId?: unknown; memberId?: unknown; reason?: unknown },
) {
  if (!isUuid(roomId)) throw new MessagingError('Room not found.', 'NOT_FOUND', 404)
  const notFound = () => new MessagingError('Room not found.', 'NOT_FOUND', 404)
  switch (action) {
    case 'join': {
      await requireMember(uid)
      await rpc<boolean>('ellieo_room_join', { p_me: uid, p_room: roomId })
      signalUsers([uid], { k: 'room', r: roomId })
      return { ok: true, room: await getRoom(uid, roomId) }
    }
    case 'leave':
      if (!(await rpc<boolean>('ellieo_room_leave', { p_me: uid, p_room: roomId }))) throw notFound()
      signalUsers([uid], { k: 'room', r: roomId })
      return { ok: true }
    case 'mute':
    case 'unmute':
      if (!(await rpc<boolean>('ellieo_room_mute', { p_me: uid, p_room: roomId, p_on: action === 'mute' }))) throw notFound()
      return { ok: true }
    case 'read': {
      const at = isTimestamp(input.at) ? input.at : null
      const readAt = await rpc<string | null>('ellieo_room_read', { p_me: uid, p_room: roomId, p_at: at })
      if (!readAt) throw notFound()
      signalUsers([uid], { k: 'read', r: roomId })
      return { ok: true, readAt }
    }
    case 'report': {
      if (!isUuid(input.messageId)) throw new MessagingError('Message not found.', 'NOT_FOUND', 404)
      const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : null
      const ok = await rpc<boolean>('ellieo_room_report', { p_me: uid, p_room: roomId, p_message: input.messageId, p_reason: reason })
      if (!ok) throw new MessagingError('Message not found.', 'NOT_FOUND', 404)
      return { ok: true }
    }
    case 'remove-message': {
      if (!isUuid(input.messageId)) throw new MessagingError('Message not found.', 'NOT_FOUND', 404)
      const ok = await rpc<boolean>('ellieo_room_delete_message', { p_me: uid, p_room: roomId, p_message: input.messageId })
      if (!ok) throw new MessagingError('Message not found.', 'NOT_FOUND', 404)
      tellMembers(roomId, uid)
      return { ok: true }
    }
    case 'remove-member': {
      const target = await uidFor(input.memberId, false)
      const ok = await rpc<boolean>('ellieo_room_kick', { p_me: uid, p_room: roomId, p_target: target })
      if (!ok) throw new MessagingError('They already left.', 'NOT_FOUND', 404)
      // Their app drops the room; the others' member counts refresh with the next list.
      signalUsers([uid, target], { k: 'room', r: roomId })
      return { ok: true }
    }
    default:
      throw new MessagingError('Unknown action.', 'INVALID')
  }
}

type MemberRow = {
  pid: string
  nickname: string
  name: string
  photo_url: string | null
  school: string | null
  professional: boolean
  role: 'admin' | 'manager' | 'member'
  staff: boolean
  joined_at: string
  is_me: boolean
}

/** Admins, managers, then members (first come first). `offset` pages through big rooms. */
export async function listRoomMembers(uid: string, roomId: string, opts: { offset?: number; limit?: number }) {
  const room = await getRoom(uid, roomId)
  const limit = Math.min(Math.max(Number(opts.limit) || ROOM_RULES.membersPage, 1), 100)
  const offset = Math.max(Number(opts.offset) || 0, 0)
  const rows = await rpc<MemberRow[]>('ellieo_room_members_page', {
    p_me: uid,
    p_room: roomId,
    p_offset: offset,
    p_limit: limit,
  })
  return {
    room,
    members: rows.map((row) => ({
      ...person(row),
      role: row.role,
      team: row.staff,
      me: row.is_me,
      joinedAt: row.joined_at,
    })),
    total: room.members,
    hasMore: rows.length === limit,
    nextOffset: offset + rows.length,
  }
}
