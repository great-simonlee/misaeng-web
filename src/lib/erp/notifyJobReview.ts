import { sendStaffPush, type StaffPush } from '@lib/support/staffPush.server'
import type { CommunityPost } from '@/types/nyc'

/**
 * A new job review (면접 · 취업 후기) → a push in the Misaeng ERP app to the External Partners it came through
 * (their organization's dashboard lists it) and to the super admin (every review). The ERP picks the recipients
 * (POST {ELLIEO_ERP_BASE_URL}/api/external-partner/review-recipients); misaeng-web sends through APNs.
 * Texts are English (the ERP is English only); the post title stays in the language it was written in.
 * Never throws: a failed alert must never fail the post.
 */

/** Short names for the push title ("New Job/Interview Post · NYU KISO"), by jobReviewSource / student org id. */
const SOURCE_NAMES: Record<string, string> = {
  misaeng: 'Misaeng',
  givo: 'GivO',
  referral: 'Personal Network',
  other: 'Other Channels',
}
const STUDENT_ORG_NAMES: Record<string, string> = {
  'nyu-kiso': 'NYU KISO',
  'fit-ksof': 'FIT KSOF',
  'baruch-ksa': 'Baruch KSA',
  'parsons-ksa': 'Parsons KISP',
}

const TITLE_MAX = 24

export function jobReviewSourceName(source: string, orgId: string | null): string {
  if (source === 'student-org') return (orgId && STUDENT_ORG_NAMES[orgId]) || 'Student Organization'
  return SOURCE_NAMES[source] || 'Other Channels'
}

/** One line: whitespace collapsed, cut at TITLE_MAX characters with "…". */
export function oneLineTitle(title: string): string {
  const chars = Array.from(String(title || '').replace(/\s+/g, ' ').trim())
  return chars.length > TITLE_MAX ? `${chars.slice(0, TITLE_MAX).join('').trimEnd()}…` : chars.join('')
}

/** "Nov 5, 2026 · 3:42 PM ET" (New York time). */
export function postedAtLabel(ms: number): string {
  const at = new Date(ms)
  const date = at.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' })
  const time = at.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time} ET`
}

type Recipients = { emails: string[]; target: { type: string; id: string } | null }

async function fetchRecipients(source: string, orgId: string | null): Promise<Recipients | null> {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  if (!secret) {
    console.error('[job review push] MISAENG_ERP_NOTIFY_SECRET not set — skipped')
    return null
  }
  const base = (process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io').replace(/\/+$/, '')
  const res = await fetch(`${base}/api/external-partner/review-recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ source, orgId }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    console.error('[job review push] recipients failed:', res.status)
    return null
  }
  return (await res.json()) as Recipients
}

type JobReviewSource = { source: string; orgId: string | null }

/** The push itself — the same for real reviews and the admin test push. */
function jobReviewPush(
  post: { id: string | null; title: string; createdAt: number },
  source: JobReviewSource,
  target: Recipients['target'],
): StaffPush {
  return {
    title: `New Job/Interview Post · ${jobReviewSourceName(source.source, source.orgId)}`,
    subtitle: oneLineTitle(post.title),
    body: postedAtLabel(post.createdAt || Date.now()),
    threadId: 'job-review',
    sound: 'review',
    data: {
      type: 'job_review',
      ...(post.id ? { postId: post.id } : {}),
      ...(target ? { partnerType: target.type, partnerId: target.id } : {}),
    },
  }
}

export async function notifyJobReviewCreated(
  post: Pick<CommunityPost, 'id' | 'title' | 'createdAt' | 'authorEmail'>,
  source: JobReviewSource,
): Promise<void> {
  try {
    // Staff test posts never reach a partner's dashboard
    if (/@misaeng\.com$/i.test(String(post.authorEmail || '').trim())) return
    const recipients = await fetchRecipients(source.source, source.orgId)
    if (!recipients?.emails?.length) return
    await sendStaffPush(recipients.emails, jobReviewPush(post, source, recipients.target))
  } catch (error) {
    console.error('[job review push] error:', error)
  }
}

/**
 * Admin test (Misaeng ERP app › Partner Views › Test notifications, through the ERP): the exact push a partner gets,
 * sent only to the admin's own devices. `post` is the partner's latest review (or a sample when it has none).
 */
export function sendJobReviewTestPush(input: {
  email: string
  source: JobReviewSource
  target: Recipients['target']
  post: { id: string | null; title: string; createdAt: number }
}) {
  return sendStaffPush([input.email], jobReviewPush(input.post, input.source, input.target))
}
