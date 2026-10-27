import { erpReportsUrl } from './notifyCommunityReport'

/**
 * Tells the Misaeng team about a coffee chat report (a participant reported the other side), same path as
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

async function notifyErp(alert: CoffeeChatReportAlert) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  if (!secret) {
    console.error('[coffee chat report] MISAENG_ERP_NOTIFY_SECRET not set — ERP alert skipped')
    return
  }
  const res = await fetch(`${erpBaseUrl()}/api/misaeng-admin/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ type: 'community_report', title: 'New coffee chat report', body: summary(alert).join('\n') }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) console.error('[coffee chat report] ERP alert failed:', res.status)
}

async function mailTeam(alert: CoffeeChatReportAlert) {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  if (!publicKey) return
  const message = [
    '[커피챗 신고] Coffee chat report',
    '',
    ...summary(alert),
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

export async function notifyTeamOfCoffeeChatReport(alert: CoffeeChatReportAlert): Promise<void> {
  const results = await Promise.allSettled([notifyErp(alert), mailTeam(alert)])
  for (const result of results) {
    if (result.status === 'rejected') console.error('[coffee chat report] alert error:', result.reason)
  }
}
