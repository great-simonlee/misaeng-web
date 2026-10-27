import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import {
  actOnChat,
  assertCoffeeChatEnabled,
  DECLINE_REASON_MAX,
  getChat,
  linkedinInvalid,
  parseLinkedinUrl,
  parseZoomLink,
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
  switch (body.action) {
    case 'accept': {
      const zoomLink = parseZoomLink(body.zoomLink)
      if (!zoomLink) throw new PointsError('Invalid Zoom link', 'points.coffeeChat.zoomLinkInvalid', 400, undefined, 'ZOOM_LINK_INVALID')
      // required: shared with the requester once scheduled (see the mentor consent)
      if (!text(body.linkedinUrl)) {
        throw new PointsError('LinkedIn required', 'points.coffeeChat.linkedinRequired', 400, undefined, 'LINKEDIN_REQUIRED')
      }
      const linkedinUrl = parseLinkedinUrl(body.linkedinUrl)
      if (!linkedinUrl) throw linkedinInvalid()
      return { action: 'accept', scheduledAt: text(body.scheduledAt), zoomLink, linkedinUrl }
    }
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
 * { action: 'accept', scheduledAt, zoomLink, linkedinUrl } (mentor; current mentor consent required → 409 CONSENT_OUTDATED)
 * | { action: 'decline', reason? } (mentor) | { action: 'cancel' } (either side; requester only > 6h before the start)
 * | { action: 'report', reason?, reasonCode? ('linkedin_not_owner'); reason required without a code } → Chat
 */
export async function POST(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    // a suspended account may still cancel or report, but not accept or decline
    if (body.action === 'accept' || body.action === 'decline') {
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
