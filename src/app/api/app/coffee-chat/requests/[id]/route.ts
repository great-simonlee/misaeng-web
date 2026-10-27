import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import {
  actOnChat,
  assertCoffeeChatEnabled,
  DECLINE_REASON_MAX,
  getChat,
  parseZoomLink,
  REPORT_REASON_MAX,
  type ChatAction,
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
      return { action: 'accept', scheduledAt: text(body.scheduledAt), zoomLink }
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
      const reason = text(body.reason)
      if (!reason) throw new PointsError('Reason required', 'points.coffeeChat.reportReasonRequired', 400, undefined, 'REASON_REQUIRED')
      if (reason.length > REPORT_REASON_MAX) {
        throw new PointsError('Reason too long', 'points.coffeeChat.reasonTooLong', 400, { max: REPORT_REASON_MAX }, 'REASON_TOO_LONG')
      }
      return { action: 'report', reason }
    }
    default:
      throw new PointsError('Invalid action', 'points.coffeeChat.invalidAction', 400, undefined, 'INVALID_ACTION')
  }
}

/**
 * { action: 'accept', scheduledAt, zoomLink } (mentor) | { action: 'decline', reason? } (mentor)
 * | { action: 'cancel' } (either side; requester only > 6h before the start) | { action: 'report', reason } → Chat
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
