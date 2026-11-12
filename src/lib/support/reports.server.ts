import { notifyUsers } from '@lib/push/notify.server'

import { eq, supportRest } from './rest.server'
import { getSupportSettings } from './settings.server'
import { sendStaffPush } from './staffPush.server'
import { BRAND, type BrandId } from '@lib/brand'

/**
 * New report → push to the report handler (staff app). `brand` (default: this site's brand) makes the app open the
 * Misaeng or the Ellieo reports list. Never throws.
 */
export async function pushReportToHandler(input: { title: string; body: string; reportId?: string | null; brand?: BrandId }) {
  try {
    const settings = await getSupportSettings()
    await sendStaffPush([settings['reports.assignee']], {
      title: input.title,
      body: input.body,
      data: { type: 'report', brand: input.brand || BRAND, ...(input.reportId ? { reportId: input.reportId } : {}) },
      threadId: 'reports',
    })
  } catch (error) {
    console.error('Report push failed:', error)
  }
}

/** A handled report → tell the reporter(s) (in-app inbox + push). */
export function notifyReporterOfOutcome(reporterUids: string[], outcome: 'resolved' | 'dismissed') {
  notifyUsers({
    type: 'account',
    userIds: reporterUids,
    build: (t) => ({
      title: t('api.support.push.reportResolvedTitle'),
      body: outcome === 'dismissed' ? t('api.support.push.reportDismissedBody') : t('api.support.push.reportResolvedBody'),
      data: { type: 'report_outcome' },
    }),
  })
}

/**
 * A change that answers members' 문의/건의 went live (ERP marks the dev note Done + published): one "반영됐어요" push +
 * 알림 to everyone behind it, then notified_at so it never goes twice.
 */
export async function notifyFeedbackShipped(noteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(noteId)) return
  const rows = await supportRest<
    { id: string; title: string; title_en: string | null; status: string; published: boolean; conversation_ids: string[] | null; notified_at: string | null }[]
  >(`dev_notes?id=${eq(noteId)}&select=id,title,title_en,status,published,conversation_ids,notified_at`)
  const note = rows?.[0]
  if (!note || note.status !== 'done' || !note.published || note.notified_at || !note.conversation_ids?.length) return
  // Claim it first so a double click / retry can't send twice
  const claimed = await supportRest<{ id: string }[]>(`dev_notes?id=${eq(note.id)}&notified_at=is.null`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  })
  if (!claimed?.length) return
  const ids = note.conversation_ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id))
  const conversations = await supportRest<{ user_uid: string }[]>(
    `support_conversations?id=in.(${ids.join(',')})&select=user_uid`,
  )
  const userIds = [...new Set((conversations ?? []).map((c) => c.user_uid).filter(Boolean))]
  if (userIds.length === 0) return
  notifyUsers({
    type: 'account',
    userIds,
    build: (t, locale) => ({
      title: t('api.support.push.feedbackShippedTitle'),
      body: t('api.support.push.feedbackShippedBody', { title: locale === 'en' && note.title_en ? note.title_en : note.title }),
      data: { type: 'dev_note', noteId: note.id },
    }),
  })
}
