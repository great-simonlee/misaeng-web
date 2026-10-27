import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { getPointsConfig, ruleAmount } from '@lib/points/config.server'
import { getPointsSummary } from '@lib/points/facade.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Balance, available (balance − holds), this month's spending, free unlocks left. Legacy JSON before cutover. */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const [summary, config] = await Promise.all([getPointsSummary(user.uid), getPointsConfig()])
    const quota = ruleAmount(config, 'quota.free_unlocks_lifetime')
    return pointsJson({
      ...summary,
      freeUnlocksRemaining: summary.freeUnlocksUsed === null ? null : Math.max(0, quota - summary.freeUnlocksUsed),
    })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}
