import { notifyUsers } from '@lib/push/notify.server'

import { getSupportSettings } from './settings.server'
import { sendStaffPush } from './staffPush.server'

/** New report → push to the report handler (staff app). Never throws. */
export async function pushReportToHandler(input: { title: string; body: string; reportId?: string | null }) {
  try {
    const settings = await getSupportSettings()
    await sendStaffPush([settings['reports.assignee']], {
      title: input.title,
      body: input.body,
      data: { type: 'report', ...(input.reportId ? { reportId: input.reportId } : {}) },
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
