import { brandConfig, brandLocalePath, resolveServiceLocale } from '@lib/brand'
import { isEmailConfigured, noticeEmail, sendEmail } from '@lib/email/send.server'
import { getT } from '@lib/i18n/server'
import { parseLocale } from '@lib/i18n/locales'
import { notifyUsers, previewText } from '@lib/push/notify.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { brandProductionUrl, supportBrand } from './brand'
import { eq, supportRest } from './rest.server'
import { staffAvatars } from './staffAvatars.server'
import type { ConversationRow } from './types'

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://misaeng.com').replace(/\/+$/, '')
const teamEmail = () => process.env.MISAENG_TEAM_EMAIL?.trim() || 'info@misaeng.com'
/** Ellieo staff mailbox for new Ellieo housing leads / inquiries / suggestions. */
const ellieoTeamEmail = () => process.env.ELLIEO_TEAM_EMAIL?.trim() || 'info@ellieo.com'
const usableEmail = (email: string | null | undefined) => {
  const value = String(email || '').trim()
  return value && value.includes('@') && !value.endsWith('@ellieo.user') ? value : null
}

/** Where a user opens a conversation (web): 문의/건의 on My page; housing chats live in the app. */
export function conversationWebPath(row: Pick<ConversationRow, 'id' | 'kind' | 'city'>) {
  return `/${row.city || 'nyc'}/me/inquiries/${row.id}`
}

async function lastStaffMessage(conversationId: string) {
  const rows = await supportRest<{ body: string; sender_display: string | null; sender_email: string | null }[]>(
    `support_messages?conversation_id=${eq(conversationId)}&sender_type=eq.staff&select=body,sender_display,sender_email&order=created_at.desc&limit=1`,
  ).catch(() => [])
  return rows?.[0] ?? null
}

/**
 * App push for a staff reply. No 알림 entry: messages live in the 메시지 tab (its own unread count).
 * Ellieo conversations: no push (there is no Ellieo app yet and the Misaeng app must not open Ellieo threads) — the
 * delayed email (tick) links to the thread on ellieo.com.
 */
export async function notifyUserOfStaffReply(row: ConversationRow) {
  if (supportBrand(row.brand) === 'ellieo') return
  const [last, avatars] = await Promise.all([lastStaffMessage(row.id), staffAvatars()])
  const senderAvatarUrl = last?.sender_email ? avatars.get(last.sender_email.toLowerCase()) : undefined
  notifyUsers({
    type: 'account',
    userIds: [row.user_uid],
    inbox: false,
    build: (t) => ({
      title:
        row.kind === 'housing'
          ? t('api.support.push.housingTitle', { name: last?.sender_display || 'Misaeng' })
          : t('api.support.push.inquiryTitle'),
      body: previewText(last?.body || row.last_message_preview || ''),
      data: {
        type: 'support', conversationId: row.id, kind: row.kind, senderName: last?.sender_display || 'Misaeng',
        // Sender photo for the iOS Notification Service Extension / Android large icon
        ...(senderAvatarUrl ? { senderAvatarUrl } : {}),
      },
      mutableContent: true,
      threadId: `support-${row.id}`,
    }),
  })
}

/** Unread staff reply after the delay → one email (tick). */
export async function emailUserOfUnreadReply(row: ConversationRow) {
  const to = usableEmail(row.user_email)
  if (!to || !isEmailConfigured()) return false
  if (supportBrand(row.brand) === 'ellieo') return emailEllieoUserOfUnreadReply(row, to)
  const profile = await getSupabaseProfile(row.user_uid).catch(() => null)
  const locale = parseLocale(profile?.preferredLocale) ?? 'ko'
  const t = await getT(locale, 'api')
  const last = await lastStaffMessage(row.id)
  const isHousing = row.kind === 'housing'
  const mail = noticeEmail({
    title: isHousing ? t('support.email.housingTitle') : t('support.email.inquiryTitle'),
    lines: [isHousing ? t('support.email.housingLine') : t('support.email.inquiryLine', { title: row.title || '' })],
    quote: last ? `${last.sender_display || 'Misaeng'}: ${previewText(last.body, 400)}` : undefined,
    button: isHousing
      ? { label: t('support.email.openApp'), url: `${siteUrl()}/app` }
      : { label: t('support.email.openWeb'), url: `${siteUrl()}${conversationWebPath(row)}` },
    footer: t('support.email.footer'),
  })
  await sendEmail({ to, subject: isHousing ? t('support.email.housingSubject') : t('support.email.inquirySubject'), ...mail })
  return true
}

/**
 * Ellieo: every kind (housing too) is a board thread on ellieo.com — the button opens it there (en/vi by the user's
 * language), sent from the Ellieo sender. No app links.
 */
async function emailEllieoUserOfUnreadReply(row: ConversationRow, to: string) {
  const ellieo = brandConfig('ellieo')
  const profile = await getSupabaseProfile(row.user_uid).catch(() => null)
  const locale = resolveServiceLocale(parseLocale(profile?.preferredLocale), ellieo)
  const t = await getT(locale, 'api')
  const last = await lastStaffMessage(row.id)
  const isHousing = row.kind === 'housing'
  const subject = row.listing_snapshot?.title || row.title || ''
  const mail = noticeEmail({
    title: isHousing ? t('support.ellieoEmail.housingTitle') : t('support.ellieoEmail.inquiryTitle'),
    lines: [isHousing ? t('support.ellieoEmail.housingLine', { title: subject }) : t('support.ellieoEmail.inquiryLine', { title: subject })],
    quote: last ? `${last.sender_display || ellieo.name}: ${previewText(last.body, 400)}` : undefined,
    button: {
      label: t('support.ellieoEmail.openWeb'),
      url: `${brandProductionUrl('ellieo')}${brandLocalePath(ellieo, locale, conversationWebPath(row))}`,
    },
    footer: t('support.ellieoEmail.footer'),
    brand: 'ellieo',
  })
  await sendEmail({
    to,
    subject: isHousing ? t('support.ellieoEmail.housingSubject') : t('support.ellieoEmail.inquirySubject'),
    ...mail,
    brand: 'ellieo',
  })
  return true
}

/** New housing lead / 문의 / 건의 → mail to info@ (spec §14). Ellieo → info@ellieo.com with an [Ellieo] subject. */
export async function notifyTeamOfNewConversation(row: ConversationRow, firstMessage: string) {
  if (!isEmailConfigured()) return
  if (supportBrand(row.brand) === 'ellieo') return notifyEllieoTeamOfNewConversation(row, firstMessage)
  const kind = row.kind === 'housing' ? 'Housing lead' : row.kind === 'suggestion' ? 'Suggestion' : 'Inquiry'
  const lines = teamMailLines(row, kind)
  const mail = noticeEmail({
    title: `[Misaeng] New ${kind.toLowerCase()}`,
    lines,
    quote: previewText(firstMessage, 1000),
    footer: 'Reply in the Misaeng ERP app. Do not reply to this email.',
  })
  await sendEmail({ to: teamEmail(), subject: `[Misaeng] New ${kind.toLowerCase()} — ${row.user_name || row.user_email || ''}`, ...mail }).catch(
    (error) => console.error('Team inquiry mail failed:', error),
  )
}

function teamMailLines(row: ConversationRow, kind: string) {
  const snapshot = row.housing_snapshot
  return [
    `Type: ${kind}`,
    ...(row.listing_snapshot?.title ? [`Listing: ${row.listing_snapshot.title} (${row.listing_id})`] : []),
    ...(row.title ? [`Subject: ${row.title}`] : []),
    `User: ${row.user_name || '-'} · ${snapshot?.email || row.user_email || '-'}${snapshot?.phone ? ` · ${snapshot.phone}` : ''}`,
    `Assigned to: ${row.assignee_email || '-'}`,
  ]
}

async function notifyEllieoTeamOfNewConversation(row: ConversationRow, firstMessage: string) {
  const kind = row.kind === 'housing' ? 'Housing inquiry' : row.kind === 'suggestion' ? 'Suggestion' : 'Inquiry'
  const mail = noticeEmail({
    title: `[Ellieo] New ${kind.toLowerCase()}`,
    lines: teamMailLines(row, kind),
    quote: previewText(firstMessage, 1000),
    footer: 'Reply in the ERP (Support inbox) or the staff app. Do not reply to this email.',
    brand: 'ellieo',
  })
  await sendEmail({
    to: ellieoTeamEmail(),
    subject: `[Ellieo] New ${kind.toLowerCase()} — ${row.user_name || row.user_email || ''}`,
    ...mail,
    brand: 'ellieo',
  }).catch((error) => console.error('Ellieo team inquiry mail failed:', error))
}
