import { after } from 'next/server'

import { markThreadRead } from '@lib/push/inbox.server'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { broadcastSignals, staffTopic, userTopic, type SupportSignal } from './realtime.server'
import { redactSensitive } from './redact'
import { eq, inList, supportRest } from './rest.server'
import { getSupportSettings, normalizeEmail, supportFeatureOn } from './settings.server'
import { housingLeadPush, pushPreview, sendStaffPush } from './staffPush.server'
import { notifyTeamOfNewConversation, notifyUserOfStaffReply } from './userNotify.server'
import type {
  ConversationRow,
  HousingProfile,
  ListingSnapshot,
  MessageRow,
  StaffRow,
  SupportKind,
} from './types'

export class SupportError extends Error {
  constructor(
    readonly key: string,
    readonly status = 400,
    readonly code = 'SUPPORT_ERROR',
  ) {
    super(key)
  }
}

export const MESSAGE_MAX = 2000
const PER_MINUTE = 10
const PER_HOUR = 60

const runAfter = (task: () => Promise<unknown>) => {
  const run = () => task().catch((error) => console.error('Support background task failed:', error))
  try {
    after(run)
  } catch {
    void run()
  }
}

// MARK: users

export async function userInboxKey(uid: string): Promise<string> {
  const rows = await supportRest<{ inbox_key: string }[]>(`support_user_state?uid=${eq(uid)}&select=inbox_key`)
  if (rows?.[0]?.inbox_key) return rows[0].inbox_key
  const created = await supportRest<{ inbox_key: string }[]>('support_user_state?on_conflict=uid', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: JSON.stringify({ uid }),
  })
  if (created?.[0]?.inbox_key) return created[0].inbox_key
  const again = await supportRest<{ inbox_key: string }[]>(`support_user_state?uid=${eq(uid)}&select=inbox_key`)
  return again[0].inbox_key
}

async function userInboxKeyIfAny(uid: string): Promise<string | null> {
  const rows = await supportRest<{ inbox_key: string }[]>(`support_user_state?uid=${eq(uid)}&select=inbox_key`).catch(() => [])
  return rows?.[0]?.inbox_key ?? null
}

// MARK: staff

export async function staffRows(emails?: string[]): Promise<StaffRow[]> {
  const filter = emails ? `&email=in.${encodeURIComponent(inList(emails.map(normalizeEmail).filter(Boolean)))}` : ''
  if (emails && emails.length === 0) return []
  return (await supportRest<StaffRow[]>(`support_staff?select=*${filter}&order=rotation_order.asc,email.asc`)) ?? []
}

/** Staff channels that should hear about a conversation: its assignee and every admin. */
async function staffTopicsFor(assignee: string | null) {
  const settings = await getSupportSettings()
  const emails = [...new Set([normalizeEmail(assignee), ...settings.admins.map(normalizeEmail)].filter(Boolean))]
  const rows = await staffRows(emails).catch(() => [])
  return rows.filter((r) => r.active).map((r) => staffTopic(r.inbox_key))
}

export async function signalConversation(row: Pick<ConversationRow, 'id' | 'user_uid' | 'assignee_email'>, kind: SupportSignal['k']) {
  const [userKey, staff] = await Promise.all([userInboxKeyIfAny(row.user_uid), staffTopicsFor(row.assignee_email)])
  await broadcastSignals([...(userKey ? [userTopic(userKey)] : []), ...staff], { c: row.id, k: kind })
}

// MARK: events

export async function logEvent(conversationId: string | null, type: string, actor: string, data: Record<string, unknown> = {}) {
  await supportRest('support_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({ conversation_id: conversationId, type, actor, data }),
  }).catch((error) => console.error('Support event log failed:', error))
}

// MARK: conversations

export async function getConversation(id: string): Promise<ConversationRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await supportRest<ConversationRow[]>(`support_conversations?id=${eq(id)}&select=*`)
  return rows?.[0] ?? null
}

export async function listUserConversations(uid: string, kinds: SupportKind[]) {
  return (
    (await supportRest<ConversationRow[]>(
      `support_conversations?user_uid=${eq(uid)}&kind=in.${encodeURIComponent(inList(kinds))}&select=*&order=last_message_at.desc&limit=100`,
    )) ?? []
  )
}

export async function listMessages(conversationId: string, after?: string | null): Promise<MessageRow[]> {
  const since = after && !Number.isNaN(Date.parse(after)) ? `&created_at=gt.${encodeURIComponent(new Date(after).toISOString())}` : ''
  return (
    (await supportRest<MessageRow[]>(
      `support_messages?conversation_id=${eq(conversationId)}${since}&select=*&order=created_at.asc&limit=1000`,
    )) ?? []
  )
}

export async function markUserRead(row: ConversationRow) {
  runAfter(() => markThreadRead(row.user_uid, `support-${row.id}`))
  if (row.user_unread === 0 && row.user_email_due_at === null) return
  await supportRest(`support_conversations?id=${eq(row.id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ user_unread: 0, user_last_read_at: new Date().toISOString(), user_email_due_at: null }),
  })
  runAfter(() => signalConversation(row, 'read'))
}

export async function userUnreadTotal(uid: string) {
  const rows = await supportRest<{ user_unread: number }[]>(
    `support_conversations?user_uid=${eq(uid)}&user_unread=gt.0&select=user_unread`,
  ).catch(() => [])
  return (rows ?? []).reduce((sum, r) => sum + (r.user_unread || 0), 0)
}

async function assertRateLimit(uid: string) {
  const since = (ms: number) => encodeURIComponent(new Date(Date.now() - ms).toISOString())
  const [minute, hour] = await Promise.all([
    supportRest<{ id: string }[]>(`support_messages?sender_uid=${eq(uid)}&created_at=gt.${since(60_000)}&select=id&limit=${PER_MINUTE}`),
    supportRest<{ id: string }[]>(`support_messages?sender_uid=${eq(uid)}&created_at=gt.${since(3_600_000)}&select=id&limit=${PER_HOUR}`),
  ])
  if ((minute?.length ?? 0) >= PER_MINUTE || (hour?.length ?? 0) >= PER_HOUR) {
    throw new SupportError('support.tooMany', 429, 'RATE_LIMITED')
  }
}

function cleanBody(body: unknown) {
  const text = String(body ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) throw new SupportError('support.emptyMessage', 400, 'EMPTY_MESSAGE')
  if (text.length > MESSAGE_MAX) throw new SupportError('support.tooLong', 400, 'MESSAGE_TOO_LONG')
  return redactSensitive(text)
}

async function addMessage(input: {
  conversationId: string
  senderType: 'user' | 'staff' | 'system'
  senderUid?: string | null
  senderEmail?: string | null
  senderDisplay?: string | null
  body: string
  redactions?: number
}): Promise<MessageRow> {
  const rows = await supportRest<MessageRow[]>('rpc/support_add_message', {
    method: 'POST',
    body: JSON.stringify({
      p_conversation: input.conversationId,
      p_sender_type: input.senderType,
      p_sender_uid: input.senderUid ?? null,
      p_sender_email: input.senderEmail ?? null,
      p_sender_display: input.senderDisplay ?? null,
      p_body: input.body,
      p_redactions: input.redactions ?? 0,
    }),
  })
  return rows[0]
}

function listingSnapshotFrom(listing: Awaited<ReturnType<typeof getStoredHousingListing>>): ListingSnapshot | null {
  if (!listing) return null
  const unit = listing.unit
  const address = listing.property?.displayedAddress || listing.property?.address || ''
  return {
    title: [address, unit?.unitNumber ? `#${unit.unitNumber}` : ''].filter(Boolean).join(' '),
    address,
    area: listing.property?.area || '',
    price: unit?.netPrice || unit?.price || null,
    photo: unit?.images?.[0] || null,
    propertyId: listing.sourcePropertyId ?? null,
    unitId: listing.sourceUnitId ?? null,
  }
}

async function displayNameFor(uid: string, fallback?: string | null) {
  const profile = await getSupabaseProfile(uid).catch(() => null)
  const name = profile?.nickname || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  return (name || fallback || '').trim() || null
}

/**
 * Assignee for a new housing lead: a returning user goes back to their last housing assignee (if still active and
 * accepting); otherwise the rotation's next staff; nobody available → the final escalation contact.
 */
async function pickHousingAssignee(uid: string): Promise<{ email: string; reason: string }> {
  const settings = await getSupportSettings()
  const previous = await supportRest<{ assignee_email: string | null }[]>(
    `support_conversations?user_uid=${eq(uid)}&kind=eq.housing&assignee_email=not.is.null&select=assignee_email&order=created_at.desc&limit=1`,
  )
  const last = normalizeEmail(previous?.[0]?.assignee_email)
  if (last) {
    const [row] = await staffRows([last])
    if (row?.active && row.accepting) return { email: last, reason: 'returning_user' }
  }
  const next = await supportRest<string | null>('rpc/support_take_next_assignee', { method: 'POST', body: '{}' })
  if (next) return { email: normalizeEmail(next), reason: 'round_robin' }
  return { email: normalizeEmail(settings['escalation.final']), reason: 'no_staff' }
}

export type StartUser = { uid: string; email: string | null; displayName?: string | null }

export async function saveHousingProfile(uid: string, profile: HousingProfile, skipConfirmDays?: number) {
  const body: Record<string, unknown> = { uid, profile, updated_at: new Date().toISOString() }
  if (skipConfirmDays !== undefined) {
    body.skip_confirm_until = skipConfirmDays > 0 ? new Date(Date.now() + skipConfirmDays * 86_400_000).toISOString() : null
  }
  await supportRest('support_housing_profiles?on_conflict=uid', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify(body),
  })
}

export async function getHousingProfile(uid: string) {
  const rows = await supportRest<{ profile: HousingProfile; skip_confirm_until: string | null; updated_at: string }[]>(
    `support_housing_profiles?uid=${eq(uid)}&select=profile,skip_confirm_until,updated_at`,
  )
  return rows?.[0] ?? null
}

/** Housing chat from a listing. An open chat about the same listing continues instead of starting a second one. */
export async function startHousingConversation(input: {
  user: StartUser
  listingId: string | null
  message: string
  profile: HousingProfile
  city?: string | null
}) {
  const settings = await getSupportSettings()
  if (!supportFeatureOn(settings, 'support.enabled', input.user.email)) throw new SupportError('support.disabled', 403, 'SUPPORT_DISABLED')
  const { text, redactions } = cleanBody(input.message)
  await assertRateLimit(input.user.uid)

  if (input.listingId) {
    const existing = await supportRest<ConversationRow[]>(
      `support_conversations?user_uid=${eq(input.user.uid)}&kind=eq.housing&listing_id=${eq(input.listingId)}&status=neq.closed&select=*&order=created_at.desc&limit=1`,
    )
    if (existing?.[0]) {
      await addUserMessage(input.user, existing[0], text, redactions, true)
      return { conversation: (await getConversation(existing[0].id))!, created: false }
    }
  }

  const listing = input.listingId ? await getStoredHousingListing(input.listingId).catch(() => null) : null
  const assignee = await pickHousingAssignee(input.user.uid)
  const now = new Date().toISOString()
  const userName = input.profile.name?.trim() || (await displayNameFor(input.user.uid, input.user.displayName))
  const [row] = await supportRest<ConversationRow[]>('support_conversations', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      kind: 'housing',
      city: input.city || listing?.city || 'nyc',
      user_uid: input.user.uid,
      user_email: input.user.email,
      user_name: userName,
      listing_id: input.listingId,
      listing_snapshot: listingSnapshotFrom(listing),
      housing_snapshot: input.profile,
      assignee_email: assignee.email,
      assigned_at: now,
    }),
  })
  await addMessage({
    conversationId: row.id,
    senderType: 'user',
    senderUid: input.user.uid,
    senderDisplay: userName,
    body: text,
    redactions,
  })
  await logEvent(row.id, 'assign', 'system', { to: assignee.email, reason: assignee.reason })
  const conversation = (await getConversation(row.id))!
  runAfter(async () => {
    await Promise.all([
      signalConversation(conversation, 'message'),
      sendStaffPush([assignee.email], {
        ...housingLeadPush({ userName, listingTitle: conversation.listing_snapshot?.title, profile: input.profile, message: text }),
        data: { type: 'support', conversationId: conversation.id },
        threadId: `support-${conversation.id}`,
        sound: 'lead',
      }),
      notifyTeamOfNewConversation(conversation, text),
    ])
  })
  return { conversation, created: true }
}

/** 문의/건의 thread (web + app). */
export async function startInquiry(input: { user: StartUser; kind: 'question' | 'suggestion'; title: string; message: string }) {
  const settings = await getSupportSettings()
  if (!supportFeatureOn(settings, 'inquiry.enabled', input.user.email)) throw new SupportError('support.disabled', 403, 'SUPPORT_DISABLED')
  const title = String(input.title || '').replace(/\s+/g, ' ').trim().slice(0, 120)
  if (!title) throw new SupportError('support.titleRequired', 400, 'TITLE_REQUIRED')
  const { text, redactions } = cleanBody(input.message)
  await assertRateLimit(input.user.uid)
  const assignee = normalizeEmail(settings['inquiry.assignee'])
  const userName = await displayNameFor(input.user.uid, input.user.displayName)
  const [row] = await supportRest<ConversationRow[]>('support_conversations', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      kind: input.kind,
      user_uid: input.user.uid,
      user_email: input.user.email,
      user_name: userName,
      title,
      assignee_email: assignee || null,
      assigned_at: new Date().toISOString(),
    }),
  })
  await addMessage({ conversationId: row.id, senderType: 'user', senderUid: input.user.uid, senderDisplay: userName, body: text, redactions })
  await logEvent(row.id, 'assign', 'system', { to: assignee, reason: 'inquiry' })
  const conversation = (await getConversation(row.id))!
  runAfter(async () => {
    await Promise.all([
      sendStaffPush([assignee], {
        title: `${input.kind === 'suggestion' ? '💡 New suggestion' : '💬 New inquiry'} · ${title}`,
        body: `${userName || 'A user'}: ${pushPreview(text, 140)}`,
        data: { type: 'inquiry', conversationId: conversation.id },
        threadId: `support-${conversation.id}`,
        sound: 'lead',
      }),
      notifyTeamOfNewConversation(conversation, text),
    ])
  })
  return conversation
}

export async function addUserMessage(user: StartUser, row: ConversationRow, body: string, redactions?: number, preCleaned = false) {
  let text = body
  let masked = redactions ?? 0
  if (!preCleaned) {
    const cleaned = cleanBody(body)
    text = cleaned.text
    masked = cleaned.redactions
    await assertRateLimit(user.uid)
  }
  const message = await addMessage({
    conversationId: row.id,
    senderType: 'user',
    senderUid: user.uid,
    senderDisplay: row.user_name,
    body: text,
    redactions: masked,
  })
  if (row.status === 'closed') await logEvent(row.id, 'reopen', `user:${user.uid}`)
  runAfter(async () => {
    const photo = (await getSupabaseProfile(row.user_uid).catch(() => null))?.photoURL?.trim()
    await Promise.all([
      signalConversation(row, 'message'),
      // A message in an open conversation: just who and what (KakaoTalk style, no listing)
      sendStaffPush([row.assignee_email], {
        title: row.user_name || 'User',
        body: pushPreview(text),
        data: { type: row.kind === 'housing' ? 'support' : 'inquiry', conversationId: row.id },
        threadId: `support-${row.id}`,
        sound: 'message',
        sender: { id: row.user_uid, name: row.user_name || 'User', avatarUrl: photo && /^https?:\/\//i.test(photo) ? photo : null },
      }),
    ])
  })
  return message
}

// MARK: staff events from the ERP (/api/internal/support)

export async function handleStaffMessage(conversationId: string) {
  const row = await getConversation(conversationId)
  if (!row) return
  const settings = await getSupportSettings()
  const due = new Date(Date.now() + Math.max(1, settings['email.delay_minutes']) * 60_000).toISOString()
  await supportRest(`support_conversations?id=${eq(row.id)}&user_unread=gt.0`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ user_email_due_at: due }),
  })
  await Promise.all([signalConversation(row, 'message'), notifyUserOfStaffReply(row)])
}

export async function handleAssigned(conversationId: string, by: string) {
  const row = await getConversation(conversationId)
  if (!row) return
  await Promise.all([
    signalConversation(row, 'assign'),
    sendStaffPush([row.assignee_email], {
      title: row.kind === 'housing' ? 'Housing lead assigned to you' : 'Inquiry assigned to you',
      sound: 'lead',
      body: `${row.user_name || 'A user'}${row.listing_snapshot?.title ? ` · ${row.listing_snapshot.title}` : row.title ? ` · ${row.title}` : ''}${by ? ` (by ${by})` : ''}`,
      data: { type: row.kind === 'housing' ? 'support' : 'inquiry', conversationId: row.id },
      threadId: `support-${row.id}`,
    }),
  ])
}

export { addMessage as addSupportMessage }
