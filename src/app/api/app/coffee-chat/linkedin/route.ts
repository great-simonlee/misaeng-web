import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { assertCoffeeChatEnabled, getMyLinkedin } from '@lib/points/coffeeChatMentors.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * My stored LinkedIn URLs, to prefill the app's sheets → { linkedinUrl (last sent with a request),
 * mentorLinkedinUrl (on my mentor card) }, each null when none. Only ever returned to the owner.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    await assertCoffeeChatEnabled()
    return pointsJson(await getMyLinkedin(user.uid))
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}
