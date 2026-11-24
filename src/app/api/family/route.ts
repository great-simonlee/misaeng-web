import { getRequestT } from '@lib/i18n/server'
import { getFamilyOverview } from '@lib/family/family.server'
import { familyErrorResponse, familyJson } from '@lib/family/http.server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/family (app Bearer / web cookie) →
 * { role: 'parent'|'member', children: [{ uid, nickname, avatarUrl, linkedAt, source, premium: { premium, plan, source,
 *   until, status, cancelAtPeriodEnd, paidByMe, paidByOtherParent, ownPaid, channel }, canBuy, buyBlockedReason,
 *   inAppAllowed }], parents: [{ uid, nickname, linkedAt, source }], outgoing: [{ id, email, status, createdAt,
 *   expiresAt }], incoming: [{ id, parentNickname, createdAt, expiresAt }], parentPremium: { until }, digest: { optedOut } }
 * 503 SETUP_REQUIRED before supabase/parent_links.sql ran.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return familyJson({ error: t('common.loginRequired'), code: 'LOGIN_REQUIRED' }, 401)
  try {
    return familyJson(await getFamilyOverview(user))
  } catch (error) {
    return familyErrorResponse(t, error)
  }
}
