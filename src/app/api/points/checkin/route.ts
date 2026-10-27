import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { checkin } from '@lib/points/bonuses.server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { pointsErrors } from '@lib/points/errors'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Daily check-in (+earn.checkin, +earn.checkin_streak7 every 7th day in a row). Ledger only (no legacy check-in). */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    if (!(await isPointsLedgerActive())) throw pointsErrors.notActive()
    return pointsJson(await checkin(user.uid))
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
