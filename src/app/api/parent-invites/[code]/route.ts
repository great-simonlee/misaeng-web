import { getRequestT } from '@lib/i18n/server'
import { parentErrorResponse, parentJson } from '@lib/parents/http.server'
import { getPublicParentInvite, revokeParentInvite } from '@lib/parents/parentInvites.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ code: string }>
}

/** GET (공개, 로그인 없이) → { invite: { code, status: valid|used|expired|revoked, inviterName, city } } · 404 NOT_FOUND */
export async function GET(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const { code } = await context.params
    const invite = await getPublicParentInvite(code)
    if (!invite) return parentJson({ error: t('parents.inviteNotFound'), code: 'NOT_FOUND' }, 404)
    return parentJson({ invite })
  } catch (error) {
    return parentErrorResponse(t, error)
  }
}

/** DELETE (초대한 학생) → { ok } · 아직 가입 전인 링크만 취소된다 (409 ALREADY_USED) */
export async function DELETE(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return parentJson({ error: t('common.loginRequired') }, 401)
  try {
    const { code } = await context.params
    return parentJson(await revokeParentInvite(user.uid, code))
  } catch (error) {
    return parentErrorResponse(t, error)
  }
}
