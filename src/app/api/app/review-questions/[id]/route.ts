import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { answerQuestion, declineQuestion, reportQuestion } from '@lib/points/reviewQuestions.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Review author: POST { action: 'answer', answer } (earns 10P) or { action: 'decline' } (asker refunded).
 * Either side: POST { action: 'report', reason } (the team is alerted).
 */
export async function POST(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const { id } = await context.params
    const body = ((await request.json().catch(() => null)) || {}) as { action?: string; answer?: string; reason?: string }
    const question =
      body.action === 'report'
        ? await reportQuestion({ uid: user.uid, id, reason: String(body.reason || '') })
        : body.action === 'decline'
          ? await declineQuestion({ uid: user.uid, id })
          : await answerQuestion({ uid: user.uid, id, answer: String(body.answer || '') })
    return pointsJson({ question })
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
