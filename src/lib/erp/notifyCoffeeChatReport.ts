import { erpReportsUrl } from './notifyCommunityReport'

/**
 * Tells the Misaeng team about a coffee chat or review Q&A report (a participant reported the other side), same path as
 * notifyCommunityReport.ts: ellieo-erp in-app notification + team web push (type community_report — the ERP only
 * knows that report type) and an EmailJS mail to the team when configured. No personal data beyond the chat id and
 * the user ids the team needs to look the chat up. Never throws. The mail goes to the team, so it stays Korean + English.
 */

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send'
const TEAM_EMAIL = process.env.MISAENG_TEAM_EMAIL?.trim() || 'info@misaeng.com'

export type CoffeeChatReportAlert = {
  chatId: string
  reporterRole: 'requester' | 'mentor'
  reporterUid: string
  reportedUid: string | null
  status: string
  reason: string
}

function erpBaseUrl() {
  return (process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io').replace(/\/+$/, '')
}

function summary(alert: CoffeeChatReportAlert) {
  return [
    `Coffee chat ${alert.chatId} (${alert.status})`,
    `Reported by the ${alert.reporterRole} (${alert.reporterUid}) — other side: ${alert.reportedUid ?? 'unknown'}`,
    `Reason: ${alert.reason.slice(0, 300)}`,
  ]
}

async function notifyErp(title: string, lines: string[]) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  if (!secret) {
    console.error('[coffee chat report] MISAENG_ERP_NOTIFY_SECRET not set — ERP alert skipped')
    return
  }
  const res = await fetch(`${erpBaseUrl()}/api/misaeng-admin/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ type: 'community_report', title, body: lines.join('\n') }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) console.error('[coffee chat report] ERP alert failed:', res.status)
}

async function mailTeam(heading: string, lines: string[]) {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  if (!publicKey) return
  const message = [
    heading,
    '',
    ...lines,
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
      template_params: { name: 'Misaeng reports', email: TEAM_EMAIL, message },
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) console.error('[coffee chat report] EmailJS alert failed:', res.status, await res.text().catch(() => ''))
}

async function alertTeam(title: string, heading: string, lines: string[]) {
  const results = await Promise.allSettled([notifyErp(title, lines), mailTeam(heading, lines)])
  for (const result of results) {
    if (result.status === 'rejected') console.error('[report alert] error:', result.reason)
  }
}

export async function notifyTeamOfCoffeeChatReport(alert: CoffeeChatReportAlert): Promise<void> {
  await alertTeam('New coffee chat report', '[커피챗 신고] Coffee chat report', summary(alert))
}

export type ReviewQuestionReportAlert = {
  questionId: string
  postId: string
  reporterRole: 'asker' | 'author'
  reporterUid: string
  reportedUid: string
  status: string
  reason: string
}

/** A review Q&A report (asker ↔ review author), same path as coffee chat reports. */
export async function notifyTeamOfReviewQuestionReport(alert: ReviewQuestionReportAlert): Promise<void> {
  await alertTeam('New review question report', '[후기 질문 신고] Review question report', [
    `Review question ${alert.questionId} on post ${alert.postId} (${alert.status})`,
    `Reported by the ${alert.reporterRole} (${alert.reporterUid}) — other side: ${alert.reportedUid}`,
    `Reason: ${alert.reason.slice(0, 300)}`,
  ])
}
