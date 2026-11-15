import { getRequestT } from '@lib/i18n/server'
import { parentErrorResponse, parentJson } from '@lib/parents/http.server'
import { acceptParentInvite } from '@lib/parents/parentInvites.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ code: string }>
}

/**
 * POST { agreed: true } — 로그인한 (방금 가입한) 계정을 초대한 학생과 연결해 학부모 계정으로.
 * agreed = "초대한 학생 계정과 연결되며, 부정 사용이 확인되면 두 계정 모두 제재될 수 있어요" 확인.
 * → { ok, studentUid, already } · 400 AGREEMENT_REQUIRED | OWN_INVITE · 404 NOT_FOUND · 409 ALREADY_USED | ALREADY_PARENT |
 *   PARENT_ACCOUNT_INELIGIBLE · 410 EXPIRED | REVOKED · 503 SETUP_REQUIRED
 */
export async function POST(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return parentJson({ error: t('common.loginRequired') }, 401)
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended
  const body = ((await request.json().catch(() => null)) || {}) as { agreed?: unknown }
  if (body.agreed !== true) {
    return parentJson({ error: t('parents.agreementRequired'), code: 'AGREEMENT_REQUIRED' }, 400)
  }
  try {
    const { code } = await context.params
    return parentJson(await acceptParentInvite(user.uid, code))
  } catch (error) {
    return parentErrorResponse(t, error)
  }
}
