import { getRequestT } from '@lib/i18n/server'
import { declineFamilyRequest } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

import { resolveAuthenticatedUser } from '../../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/family/requests/{id}/decline — the child declines → { ok } · 403 EMAIL_MISMATCH.
 * Only the addressed child: request.child_uid = me, or the request email = my account email / a verified school email.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    const { id } = await context.params
    const result = await declineFamilyRequest(user, id)
    return familyJson({ ok: result.ok, ...('already' in result ? { already: result.already } : {}) })
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
