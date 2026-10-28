import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { getStoredCommunityPost, isCommunityStorageConfigured } from '@lib/supabase/community.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Points the author loses by deleting this post, shown in the delete confirmation (web + app). Author only.
 * Response: { clawback, pendingCancel } — both 0 for anonymous posts (they never earn) and mock posts.
 */
export async function GET(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const { id } = await context.params
    const none = { clawback: 0, pendingCancel: 0 }
    if (id.startsWith('mock-') || !isCommunityStorageConfigured()) return pointsJson(none)

    const post = await getStoredCommunityPost(id)
    if (!post) return pointsJson({ error: t('common.postNotFound') }, 404)
    if (post.authorUid !== user.uid) return pointsJson({ error: t('common.forbidden') }, 403)
    if (post.categoryId === 'anonymous') return pointsJson(none)

    const { previewPostDeletion } = await import('@lib/points/facade.server')
    const { clawback, pendingCancel } = await previewPostDeletion({ uid: user.uid, postId: id })
    return pointsJson({ clawback, pendingCancel })
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
