import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { askQuestion, listQuestions, questionsForPost } from '@lib/points/reviewQuestions.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Review Q&A (app).
 *   GET ?postId=        → { enabled, count, cost, reward, canAsk, isAuthor, remaining, mine[] } (signed out: count only)
 *   GET ?box=sent|received → { questions[] }
 *   POST { postId, question, topic?, context?, requestKey? } → { question } (20P held; same requestKey → same question)
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const url = new URL(request.url)
    const postId = url.searchParams.get('postId')
    const user = await resolveAuthenticatedUser()
    if (postId) return pointsJson(await questionsForPost(user?.uid ?? null, postId))
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const box = url.searchParams.get('box') === 'received' ? 'received' : 'sent'
    return pointsJson({ questions: await listQuestions(user.uid, box) })
  } catch (error) {
    return pointsErrorResponse(t, error, 'points.loadFailed')
  }
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return pointsJson({ error: t('common.loginRequired') }, 401)
    const body = ((await request.json().catch(() => null)) || {}) as {
      postId?: string
      question?: string
      topic?: unknown
      context?: unknown
      requestKey?: unknown
    }
    const question = await askQuestion({
      uid: user.uid,
      postId: String(body.postId || ''),
      question: String(body.question || ''),
      topic: body.topic,
      context: body.context,
      requestKey: body.requestKey,
    })
    return pointsJson({ question })
  } catch (error) {
    return pointsErrorResponse(t, error)
  }
}
