import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { BOOSTABLE_BOARDS, boostPost, getBoostStatus } from '@lib/points/boost.server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { pointsErrors, PointsError } from '@lib/points/errors'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { getStoredCommunityPost, isCommunityStorageConfigured } from '@lib/supabase/community.server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Boost status of a post for its "pin to top" button: cost, days, whether it's running, and why it can't be boosted
 * now (block: active | cooldown | monthly_cap | slots_full | insufficient | disabled | null). Before the cutover:
 * { engine: 'legacy', active: false, block: 'disabled' }.
 */
export async function GET(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const { id } = await context.params
    if (!(await isPointsLedgerActive())) {
      return pointsJson({ engine: 'legacy', boostedUntil: null, active: false, block: 'disabled' })
    }
    if (!isCommunityStorageConfigured()) return pointsJson({ error: t('common.supabaseNotConfigured') }, 503)
    const post = await getStoredCommunityPost(id)
    if (!post || post.status !== 'open') return pointsJson({ error: t('common.postNotFound') }, 404)
    const user = await resolveAuthenticatedUser()
    const mine = Boolean(user?.uid && user.uid === post.authorUid)
    const status = await getBoostStatus({
      uid: mine ? user!.uid : null,
      postId: post.id,
      boardId: post.categoryId,
      city: post.city ?? null,
    })
    return pointsJson({ engine: 'ledger', boostable: BOOSTABLE_BOARDS.has(post.categoryId), mine, ...status })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}

/**
 * Pin my roommate/sublet post to the top: spend.housing_post_boost points for rule.housing_boost_days days.
 * Refused while it's running, during the cooldown, over the monthly cap or when all slots of the board are taken
 * (409 with code BOOST_ACTIVE / BOOST_COOLDOWN / BOOST_MONTHLY_CAP / BOOST_SLOTS_FULL / INSUFFICIENT_POINTS).
 * Body: { requestKey? }. Response: { boostedUntil, charged, balance, available }.
 */
export async function POST(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    if (!(await isPointsLedgerActive())) throw pointsErrors.notActive()
    if (!isCommunityStorageConfigured()) return pointsJson({ error: t('common.supabaseNotConfigured') }, 503)

    const { id } = await context.params
    const post = await getStoredCommunityPost(id)
    if (!post || post.status !== 'open') return pointsJson({ error: t('common.postNotFound') }, 404)
    if (!BOOSTABLE_BOARDS.has(post.categoryId)) {
      throw new PointsError('Only roommate/sublet posts can be boosted', 'points.boost.notAllowed', 400, undefined, 'BOOST_NOT_ALLOWED')
    }
    if (post.authorUid !== user.uid) throw new PointsError('Not the author', 'points.boost.notAuthor', 403, undefined, 'FORBIDDEN')

    const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
    const result = await boostPost({
      uid: user.uid,
      postId: post.id,
      boardId: post.categoryId,
      city: post.city ?? null,
      requestKey: typeof body.requestKey === 'string' ? body.requestKey.slice(0, 100) : null,
    })
    return pointsJson(result)
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
