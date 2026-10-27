import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import {
  COFFEE_MESSAGE_MAX,
  COFFEE_TOPIC_MAX,
  getCoffeeChat,
  listMyCoffeeChats,
  requestCoffeeChat,
  transitionCoffeeChat,
} from '@lib/points/coffeeChat.server'
import { COFFEE_CHAT_DISCLAIMER, COFFEE_CHAT_DISCLAIMER_VERSION } from '@lib/points/defaults'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { pointsErrors, PointsError } from '@lib/points/errors'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const disclaimer = { text: COFFEE_CHAT_DISCLAIMER, version: COFFEE_CHAT_DISCLAIMER_VERSION }

/** My coffee chat requests (newest first) + the disclaimer to show on the request screen. */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    if (!(await isPointsLedgerActive())) return pointsJson({ engine: 'legacy', items: [], disclaimer })
    return pointsJson({ engine: 'ledger', items: await listMyCoffeeChats(user.uid), disclaimer })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}

/**
 * Request a coffee chat: { topic, message?, preferredTimes?, mentorId?, agreed: true, requestKey? }.
 * `agreed` must be true (the spec 4.4 disclaimer checkbox). Places a spend.coffee_chat hold.
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    if (!(await isPointsLedgerActive())) throw pointsErrors.notActive()

    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    if (body.agreed !== true) throw new PointsError('Disclaimer not agreed', 'points.coffeeChat.agreeRequired', 400, undefined, 'DISCLAIMER_NOT_AGREED')
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    if (!topic) throw new PointsError('Topic required', 'points.coffeeChat.topicRequired', 400, undefined, 'TOPIC_REQUIRED')
    if (topic.length > COFFEE_TOPIC_MAX) {
      throw new PointsError('Topic too long', 'points.coffeeChat.topicTooLong', 400, { max: COFFEE_TOPIC_MAX }, 'TOPIC_TOO_LONG')
    }
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (message.length > COFFEE_MESSAGE_MAX) {
      throw new PointsError('Message too long', 'points.coffeeChat.messageTooLong', 400, { max: COFFEE_MESSAGE_MAX }, 'MESSAGE_TOO_LONG')
    }

    const result = await requestCoffeeChat({
      uid: user.uid,
      topic,
      message: message || null,
      preferredTimes: typeof body.preferredTimes === 'string' ? body.preferredTimes.trim() : null,
      mentorId: typeof body.mentorId === 'string' ? body.mentorId.trim() : null,
      requestKey: typeof body.requestKey === 'string' ? body.requestKey.slice(0, 100) : null,
    })
    return pointsJson({ ...result, disclaimer }, result.duplicate ? 200 : 201)
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}

/** Cancel my request before it is scheduled: `DELETE /api/points/coffee-chats?id=` → hold released. */
export async function DELETE(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    if (!(await isPointsLedgerActive())) throw pointsErrors.notActive()
    const id = new URL(request.url).searchParams.get('id')?.trim() || ''
    const existing = id ? await getCoffeeChat(id) : null
    if (!existing || existing.user_id !== user.uid) {
      throw new PointsError('Not found', 'points.coffeeChat.notFound', 404, undefined, 'NOT_FOUND')
    }
    const result = await transitionCoffeeChat({ id, action: 'cancel', actor: user.uid, actorRole: 'user' })
    return pointsJson(result)
  } catch (error) {
    if (error instanceof PointsError && error.key === 'points.coffeeChat.invalidTransition') {
      return pointsErrorResponse(t, new PointsError(error.message, 'points.coffeeChat.cannotCancel', 409, undefined, 'CANNOT_CANCEL'))
    }
    return pointsErrorResponse(t, error)
  }
}
