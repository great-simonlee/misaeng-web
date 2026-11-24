import type { Locale } from '@lib/i18n/locales'
import { alertUsers } from './alertsAccess.server'
import { notifyUsersInChunks } from './notify.server'
import { claimFirstTime } from './postEngagementNotify.server'
import { listPushUserIds, type PushType } from './store.server'

/*
 * Broadcasts written by the ERP's scheduled runs (ellieo-erp lib/scheduledRuns.js) and the Visa Bulletin publish, to
 * Ellieo app users — verified members only for every kind (alertsAccess.server.ts; owner 2026-11-19), and only when
 * there is something new:
 *   postings_digest  new job postings          (switch `posting`,   Mon–Fri 13:00)
 *   visa_news_digest visa / status news         (switch `visa_news`, Mon / Fri 17:00)
 *   visa_bulletin    the month's Visa Bulletin  (switch `visa_news`)
 * The ERP sends the text in en (+ vi when it has it; vi devices fall back to en). Once per dedupeKey
 * (notification_dedupe), so a retried ERP step never sends it twice. Data keys are `type` / `…Id` only (Android
 * keeps just those when FCM shows the alert).
 */

export type DigestKind = 'postings_digest' | 'visa_news_digest' | 'visa_bulletin'

const SWITCH: Record<DigestKind, PushType> = {
  postings_digest: 'posting',
  visa_news_digest: 'visa_news',
  visa_bulletin: 'visa_news',
}

type Text = { en: string; vi: string }

function text(value: unknown, max: number): Text | null {
  const v = (value || {}) as Record<string, unknown>
  const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const en = clean(v.en)
  const vi = clean(v.vi) || en
  return en ? { en, vi } : null
}

/** → { sent, users, audience } | { error } */
export async function broadcastDigest(kind: DigestKind, body: Record<string, unknown>) {
  const title = text(body.title, 60)
  const message = text(body.body, 160)
  const dedupeKey = String(body.dedupeKey || '').trim().slice(0, 120)
  if (!title || !message || !dedupeKey) return { error: 'title.en, body.en and dedupeKey are required.' }
  if (!(await claimFirstTime(`broadcast:${kind}:${dedupeKey}`))) return { sent: false, users: 0, duplicate: true }

  const id = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, 120) : '')
  const data: Record<string, string> = { type: kind }
  if (kind === 'postings_digest' && id('postingId')) data.postingId = id('postingId')
  if (kind === 'visa_news_digest' && id('newsId')) data.newsId = id('newsId')

  const pick = (t: Text, locale: Locale) => (locale === 'vi' ? t.vi : t.en)
  const userIds = await listPushUserIds()
  // Sent in the background, 100 users at a time (`sent` means queued). Narrowed to verified members inside that job;
  // `users` is the app users it was checked for.
  notifyUsersInChunks({
    type: SWITCH[kind],
    userIds,
    audience: alertUsers,
    build: (_t, locale) => ({
      title: pick(title, locale),
      body: pick(message, locale),
      data,
      threadId: kind === 'postings_digest' ? 'postings-digest' : 'visa-news',
    }),
  })
  return { sent: true, users: userIds.length, audience: 'verified' }
}
