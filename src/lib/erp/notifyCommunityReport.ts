/**
 * Tells the Misaeng team about every community report right away (App Store guideline 1.2: act within 24 hours).
 * 1. ellieo-erp in-app notification + team web push (same path as the workplace/Instagram alerts:
 *    POST {ELLIEO_ERP_BASE_URL}/api/misaeng-admin/notify, type community_report → opens Misaeng → Reports).
 * 2. An email to the team through EmailJS (same template as the school registration request) when configured.
 * Never throws: a failed alert must never fail the report itself. The mail goes to the team, so it stays Korean + English.
 */

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send'

export type CommunityReportAlert = {
  targetType: 'post' | 'comment'
  postId: string
  postTitle: string | null
  commentPreview?: string | null
  board: string
  reason: string
  detail: string | null
  reportCount: number
  autoHidden: boolean
  reporterEmail: string
}

function erpBaseUrl() {
  return (process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io').replace(/\/+$/, '')
}

/** ERP deep link: opens Misaeng → Reports (ellieo-erp src/app/util/pushDeepLinks.js `misaengReports`). */
export function erpReportsUrl() {
  return `${erpBaseUrl()}/?push=misaengReports`
}

function summary(alert: CommunityReportAlert) {
  const what = alert.targetType === 'comment' ? 'Comment' : 'Post'
  const title = alert.postTitle ? `"${alert.postTitle.slice(0, 80)}"` : alert.postId
  const lines = [
    `${what} on ${title} (${alert.board || 'board'})`,
    `Reason: ${alert.reason}${alert.detail ? ` — ${alert.detail.slice(0, 300)}` : ''}`,
    `Reports: ${alert.reportCount}${alert.autoHidden ? ' — auto-hidden (3+ reporters)' : ''}`,
  ]
  if (alert.commentPreview) lines.splice(1, 0, `Comment: ${alert.commentPreview.slice(0, 200)}`)
  return lines
}

async function notifyErp(alert: CommunityReportAlert) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  if (!secret) {
    console.error('[community report] MISAENG_ERP_NOTIFY_SECRET not set — ERP alert skipped')
    return
  }
  const res = await fetch(`${erpBaseUrl()}/api/misaeng-admin/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      type: 'community_report',
      title: alert.autoHidden ? 'Report: content auto-hidden' : 'New community report',
      body: summary(alert).join('\n'),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) console.error('[community report] ERP alert failed:', res.status)
}

async function mailTeam(alert: CommunityReportAlert) {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  if (!publicKey) return
  const message = [
    alert.autoHidden ? '[커뮤니티 신고 — 자동 숨김] Community report — auto-hidden' : '[커뮤니티 신고] Community report',
    '',
    ...summary(alert),
    `Post id: ${alert.postId}`,
    '',
    `Review within 24 hours: ${erpReportsUrl()}`,
  ].join('\n')
  const res = await fetch(EMAILJS_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_2q2yz67',
      template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_ADMIN || 'template_i09sdw',
      user_id: publicKey,
      ...(process.env.EMAILJS_PRIVATE_KEY ? { accessToken: process.env.EMAILJS_PRIVATE_KEY } : {}),
      template_params: { name: 'Misaeng reports', email: alert.reporterEmail, message },
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) console.error('[community report] EmailJS alert failed:', res.status, await res.text().catch(() => ''))
}

export async function notifyTeamOfCommunityReport(alert: CommunityReportAlert): Promise<void> {
  const results = await Promise.allSettled([notifyErp(alert), mailTeam(alert)])
  for (const result of results) {
    if (result.status === 'rejected') console.error('[community report] alert error:', result.reason)
  }
}
