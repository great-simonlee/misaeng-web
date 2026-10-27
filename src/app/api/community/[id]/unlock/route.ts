import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { isLockableBoard, unlockPost } from '@lib/points/unlock.server'
import { getStoredCommunityPost, isCommunityStorageConfigured } from '@lib/supabase/community.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Open a locked review (spec 2.4 / 4.1 / 4.3). Only interview/job and visa boards are lockable; food never.
 * Before cutover nothing is locked → `{ unlocked: true, method: 'not_required' }`.
 * Response: { unlocked, method: 'not_required'|'free_period'|'free_quota'|'points', charged, already, balance?, available?, freeRemaining? }
 */
export async function POST(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const { id } = await context.params
    const notRequired = { unlocked: true, method: 'not_required', charged: 0, already: false }

    if (id.startsWith('mock-') || !isCommunityStorageConfigured()) return pointsJson({ ...notRequired, engine: 'legacy' })
    const post = await getStoredCommunityPost(id)
    if (!post || post.status !== 'open') return pointsJson({ error: t('common.postNotFound') }, 404)
    if (!isLockableBoard(post.categoryId)) return pointsJson({ ...notRequired, engine: null })
    if (!(await isPointsLedgerActive())) return pointsJson({ ...notRequired, engine: 'legacy' })

    const result = await unlockPost({ uid: user.uid, email: user.email ?? null, post })
    return pointsJson({ engine: 'ledger', ...result })
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
