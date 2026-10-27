import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { COFFEE_MESSAGE_MAX, COFFEE_TOPIC_MAX } from '@lib/points/coffeeChat.server'
import {
  assertCoffeeChatEnabled,
  listChats,
  parseProposedTimes,
  requestMentorChat,
} from '@lib/points/coffeeChatMentors.server'
import { PointsError } from '@lib/points/errors'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** My coffee chats (v2): `?box=sent|received` → { items: Chat[] }, newest first. */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    await assertCoffeeChatEnabled()
    const box = new URL(request.url).searchParams.get('box') === 'received' ? 'received' : 'sent'
    return pointsJson({ items: await listChats(user.uid, box, t) })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}

/**
 * Request a coffee chat with a mentor:
 * { mentorId, topic, message?, proposedTimes: [ISO] (1–3, each ≥ now+12h and ≤ now+30d), agreed: true, requestKey }
 * → 201 Chat (200 on a repeated requestKey). Holds spend.coffee_chat (free when that rule is off).
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    await assertCoffeeChatEnabled()

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

    const result = await requestMentorChat({
      uid: user.uid,
      mentorId: typeof body.mentorId === 'string' ? body.mentorId.trim() : '',
      topic,
      message: message || null,
      proposedTimes: parseProposedTimes(body.proposedTimes),
      requestKey: typeof body.requestKey === 'string' ? body.requestKey.slice(0, 100) : null,
      t,
    })
    return pointsJson(result.chat, result.duplicate ? 200 : 201)
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
