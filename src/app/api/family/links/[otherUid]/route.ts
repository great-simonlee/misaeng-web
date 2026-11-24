import { getRequestT } from '@lib/i18n/server'
import { unlinkFamily } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/family/links/{otherUid} — either side unlinks. The child keeps the paid period; auto-renew of what this
 * parent pays for the child stops → { ok, renewalStopped: 'stripe' | 'google' | 'apple_manual' | null }
 * ('apple_manual': the parent must cancel in iPhone Settings — they also get a push + email). 404 NOT_LINKED.
 */
export async function DELETE(request: Request, context: { params: Promise<{ otherUid: string }> }) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    const { otherUid } = await context.params
    return familyJson(await unlinkFamily(user, decodeURIComponent(otherUid)))
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
