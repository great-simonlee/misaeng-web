import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { assertCoffeeChatEnabled, listMentors } from '@lib/points/coffeeChatMentors.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Coffee chat v2 mentor list (app): `?company=` → { items: Mentor[] }. Active mentors, newest first, without me and
 * users I blocked / who blocked me. Mentor = { userId, nickname, avatarUrl, company, role, intro, topics, verified, schoolVerified }.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    await assertCoffeeChatEnabled()
    const company = new URL(request.url).searchParams.get('company')?.trim().slice(0, 200) || null
    return pointsJson({ items: await listMentors(user.uid, company) })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}
