import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'
import { getPointsHistoryFor } from '@lib/points/facade.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { decodeHistoryCursor, type PointsHistoryItem } from '@lib/points/ledger.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function labelOf(t: Translate, item: PointsHistoryItem) {
  const key = `points.reasons.${item.reason}`
  const label = t(key)
  if (label !== key && typeof label === 'string') return label
  if (item.legacy) {
    const legacyKey = `credit.ledger.reasons.${item.reason.replace(/^legacy\./, '')}`
    const legacyLabel = t(legacyKey)
    if (legacyLabel !== legacyKey) return legacyLabel
    return item.legacyLabel || item.reason
  }
  return item.reason
}

/** Ledger rows merged with legacy entries from before cutover, newest first. `?cursor=` from `nextCursor`. */
export async function GET(request: Request) {
  const t = await getRequestT(request)
  const tApi: Translate = (key, params) => t(`api.${key}`, params)
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: tApi('common.loginRequired') }, 401)
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    if (cursor && !decodeHistoryCursor(cursor)) return pointsJson({ error: tApi('points.invalidCursor') }, 400)
    const limit = Number(searchParams.get('limit') || 30)
    const history = await getPointsHistoryFor(user.uid, cursor, Number.isFinite(limit) ? limit : 30)
    return pointsJson({
      engine: history.engine,
      nextCursor: history.nextCursor,
      items: history.items.map((item) => ({ ...item, label: labelOf(t, item) })),
    })
  } catch (error) {
    return pointsErrorResponse(tApi, error, 'points.loadFailed')
  }
}
