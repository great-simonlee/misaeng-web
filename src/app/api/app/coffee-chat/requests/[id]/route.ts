import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import {
  actOnChat,
  assertCoffeeChatEnabled,
  DECLINE_REASON_MAX,
  getChat,
  linkedinInvalid,
  parseLinkedinUrl,
  parseProposedTimes,
  parseZoomLink,
  PROPOSE_MIN_LEAD_MS,
  REPORT_REASON_CODES,
  REPORT_REASON_MAX,
  type ChatAction,
  type ReportReasonCode,
} from '@lib/points/coffeeChatMentors.server'
import { PointsError } from '@lib/points/errors'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** One of my coffee chats (v2) → Chat. */
export async function GET(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    await assertCoffeeChatEnabled()
    const { id } = await context.params
    return pointsJson(await getChat(user.uid, id, t))
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}

function parseAction(body: Record<string, unknown>): ChatAction {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const linkedin = () => {
    if (!text(body.linkedinUrl)) {
      throw new PointsError('LinkedIn required', 'points.coffeeChat.linkedinRequired', 400, undefined, 'LINKEDIN_REQUIRED')
    }
    const url = parseLinkedinUrl(body.linkedinUrl)
    if (!url) throw linkedinInvalid()
    return url
  }
  const meetingLink = () => {
    const link = parseZoomLink(body.zoomLink)
    if (!link) throw new PointsError('Invalid meeting link', 'points.coffeeChat.zoomLinkInvalid', 400, undefined, 'ZOOM_LINK_INVALID')
    return link
  }
  switch (body.action) {
    case 'propose':
      // v3 mentor: 1–3 times, each ≥ now+6h and ≤ now+30d, + their LinkedIn (shown to the requester once scheduled)
      return { action: 'propose', times: parseProposedTimes(body.times, Date.now(), PROPOSE_MIN_LEAD_MS), linkedinUrl: linkedin() }
    case 'confirm':
      return { action: 'confirm', scheduledAt: text(body.scheduledAt), zoomLink: meetingLink() }
    case 'retime':
      return { action: 'retime' }
    case 'accept':
      // older chats (requester-proposed times); LinkedIn is shared with the requester once scheduled
      return { action: 'accept', scheduledAt: text(body.scheduledAt), zoomLink: meetingLink(), linkedinUrl: linkedin() }
    case 'decline': {
      const reason = text(body.reason)
      if (reason.length > DECLINE_REASON_MAX) {
        throw new PointsError('Reason too long', 'points.coffeeChat.reasonTooLong', 400, { max: DECLINE_REASON_MAX }, 'REASON_TOO_LONG')
      }
      return { action: 'decline', reason: reason || null }
    }
    case 'cancel':
      return { action: 'cancel' }
    case 'report': {
      // reasonCode (optional) is a preset reason; free text is then optional. Unknown codes count as "other".
      const reasonCode = REPORT_REASON_CODES.includes(body.reasonCode as ReportReasonCode)
        ? (body.reasonCode as ReportReasonCode)
        : null
      const reason = text(body.reason)
      if (!reason && !reasonCode) {
        throw new PointsError('Reason required', 'points.coffeeChat.reportReasonRequired', 400, undefined, 'REASON_REQUIRED')
      }
      if (reason.length > REPORT_REASON_MAX) {
        throw new PointsError('Reason too long', 'points.coffeeChat.reasonTooLong', 400, { max: REPORT_REASON_MAX }, 'REASON_TOO_LONG')
      }
      return { action: 'report', reason, reasonCode }
    }
    default:
      throw new PointsError('Invalid action', 'points.coffeeChat.invalidAction', 400, undefined, 'INVALID_ACTION')
  }
}

/**
 * v3: { action: 'propose', times: [ISO] (1–3), linkedinUrl } (mentor; consent as for accept)
 * | { action: 'confirm', scheduledAt, zoomLink (Zoom or Google Meet) } (requester; spends the held points)
 * | { action: 'retime' } (requester, once: ask the mentor for other times)
 * | { action: 'accept', scheduledAt, zoomLink, linkedinUrl } (older chats; mentor; current consent → else 409 CONSENT_OUTDATED)
 * | { action: 'decline', reason? } (mentor) | { action: 'cancel' } (either side; v3 confirmed: refund when the mentor cancels
 *   or the requester 24h+ before; older chats: requester only > 6h before the start)
 * | { action: 'report', reason?, reasonCode? ('linkedin_not_owner'); reason required without a code } → Chat
 */
export async function POST(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    // a suspended account may still cancel or report, but not accept or decline
    if (['accept', 'decline', 'propose', 'confirm'].includes(String(body.action))) {
      const suspended = await accountSuspendedResponse(user.uid, t)
      if (suspended) return suspended
    }
    await assertCoffeeChatEnabled()
    const { id } = await context.params
    return pointsJson(await actOnChat(user.uid, id, parseAction(body), t))
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
