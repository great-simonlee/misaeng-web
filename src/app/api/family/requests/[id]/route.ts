import { getRequestT } from '@lib/i18n/server'
import { cancelFamilyRequest } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** DELETE /api/family/requests/{id} — the parent cancels a pending request → { ok } · 404 NOT_FOUND */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    const { id } = await context.params
    return familyJson(await cancelFamilyRequest(user, id))
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
