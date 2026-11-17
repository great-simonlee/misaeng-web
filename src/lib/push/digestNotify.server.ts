import { BRAND_CONFIG } from '@lib/brand'
import type { Locale } from '@lib/i18n/locales'
import { notifyUsersInChunks } from './notify.server'
import { postingAlertUsers } from './postingAlerts.server'
import { claimFirstTime } from './postEngagementNotify.server'
import { listPushUserIds, type PushType } from './store.server'

/*
 * Broadcasts written by the ERP's scheduled runs (ellieo-erp lib/scheduledRuns.js, owner 2026-11-17) and the Visa
 * Bulletin publish — to Misaeng app users (postings: school / workplace verified members only), only when there is
 * something new:
 *   postings_digest  "12개 회사에서 새 채용 공고 18개가 올라왔어요 · …"  (switch `posting`, Mon–Fri 13:00)
 *   visa_news_digest "H-1B 추첨 등록 기간 발표 … 외 새 소식 2건"        (switch `visa_news`, Mon / Fri 17:00)
 *   visa_bulletin    "3월 Visa Bulletin이 나왔어요 · EB-2 한국 2주 …"    (switch `visa_news`)
 * The ERP sends the text in ko + en (vi devices get en). Once per dedupeKey (notification_dedupe), so a retried ERP
 * step never sends it twice. Data keys are `type` / `…Id` only (Android keeps just those when FCM shows the alert).
 */

export type DigestKind = 'postings_digest' | 'visa_news_digest' | 'visa_bulletin'

const SWITCH: Record<DigestKind, PushType> = {
  postings_digest: 'posting',
  visa_news_digest: 'visa_news',
  visa_bulletin: 'visa_news',
}

type Text = { ko: string; en: string }

function text(value: unknown, max: number): Text | null {
  const v = (value || {}) as Record<string, unknown>
  const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const ko = clean(v.ko)
  const en = clean(v.en) || ko
  return ko ? { ko, en } : null
}

/** → { sent, users } | { error } */
export async function broadcastDigest(kind: DigestKind, body: Record<string, unknown>) {
  const title = text(body.title, 60)
  const message = text(body.body, 160)
  const dedupeKey = String(body.dedupeKey || '').trim().slice(0, 120)
  if (!title || !message || !dedupeKey) return { error: 'title, body and dedupeKey are required.' }
  // Only misaeng.com serves the app
  if (BRAND_CONFIG.id !== 'misaeng') return { sent: false, users: 0 }
  if (!(await claimFirstTime(`broadcast:${kind}:${dedupeKey}`))) return { sent: false, users: 0, duplicate: true }

  const id = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, 120) : '')
  const data: Record<string, string> = { type: kind }
  if (kind === 'postings_digest' && id('postingId')) data.postingId = id('postingId')
  if (kind === 'visa_news_digest' && id('newsId')) data.newsId = id('newsId')

  const pick = (t: Text, locale: Locale) => (locale === 'ko' ? t.ko : t.en)
  const userIds = await listPushUserIds()
  const verifiedOnly = kind === 'postings_digest'
  // Sent in the background, 100 users at a time (`sent` means queued). The postings push goes to verified members
  // only (postingAlerts.server.ts), checked in that background job: `users` is then the app users it was checked for.
  notifyUsersInChunks({
    type: SWITCH[kind],
    userIds,
    audience: verifiedOnly ? postingAlertUsers : undefined,
    build: (_t, locale) => ({
      title: pick(title, locale),
      body: pick(message, locale),
      data,
      threadId: kind === 'postings_digest' ? 'postings-digest' : 'visa-news',
    }),
  })
  return { sent: true, users: userIds.length, ...(verifiedOnly ? { audience: 'verified' } : {}) }
}
