import { getRequestT } from '@lib/i18n/server'
import { parentErrorResponse, parentJson, publicOrigin } from '@lib/parents/http.server'
import { createParentInvite, getParentInviteSummary } from '@lib/parents/parentInvites.server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 학부모 초대 (학생). App: Bearer · web: cookie.
 *   GET  → { eligible, reason, max, remaining, rewardPoints, delayDays, invites: [{ code, url, state, ... }] }
 *          (지급일 지난 보상은 이때 정산)
 *   POST { city? } → 201 { invite } · 403 VERIFICATION_REQUIRED | PARENT_NOT_ALLOWED · 409 PARENT_INVITE_LIMIT · 503 SETUP_REQUIRED
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return parentJson({ error: t('common.loginRequired') }, 401)
  try {
    return parentJson(await getParentInviteSummary(user.uid, publicOrigin(request)))
  } catch (error) {
    return parentErrorResponse(t, error)
  }
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return parentJson({ error: t('common.loginRequired') }, 401)
  try {
    const body = ((await request.json().catch(() => null)) || {}) as { city?: unknown }
    const invite = await createParentInvite(user.uid, {
      city: typeof body.city === 'string' ? body.city : null,
      origin: publicOrigin(request),
    })
    return parentJson({ invite }, 201)
  } catch (error) {
    return parentErrorResponse(t, error)
  }
}
