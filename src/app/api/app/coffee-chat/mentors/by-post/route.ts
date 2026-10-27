import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { mentorForPost } from '@lib/points/coffeeChatMentors.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Coffee chat entry on a job review (app): `?postId=` → { coffeeChat: { mentorId, company, role } | null }.
 * Non-null only when the review's author is an active, offer-verified mentor on the current consent, the viewer is
 * someone else and neither blocked the other. Returns null (not 409) while the feature is off, so the review screen
 * simply shows nothing.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const postId = new URL(request.url).searchParams.get('postId') ?? ''
    return pointsJson({ coffeeChat: await mentorForPost(user.uid, postId) })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}
