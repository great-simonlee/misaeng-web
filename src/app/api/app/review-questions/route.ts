import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { pointsErrorResponse, pointsJson } from '@lib/points/http.server'
import { askQuestion, askQuestions, listQuestions, questionsForPost, type AskInput } from '@lib/points/reviewQuestions.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Review Q&A (app).
 *   GET ?postId=        → { enabled, count, cost, reward, canAsk, isAuthor, remaining, mine[] } (signed out: count only)
 *   GET ?box=sent|received → { questions[] }
 *   POST { postId, question, topic?, context?, requestKey? } → { question } (30P held; same requestKey → same question)
 *   POST { postId, linkedin, questions: [{ question, topic?, context?, requestKey? }] (1–3) } → { questions[], failed, question }
 *        (linkedin required: 400 LINKEDIN_REQUIRED / LINKEDIN_INVALID; 409 QUESTIONS_CLOSED when the author turned questions off)
 *        (each question its own 30P hold; 409 INSUFFICIENT_POINTS / MONTHLY_CAP checked for the whole send first;
 *         403 PARENT_NOT_ALLOWED for parent accounts)
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
      questions?: unknown
      linkedin?: unknown
    }
    // 1.0.7: { postId, questions: [{ question, topic?, context?, requestKey? }] } — 최대 3개, 질문마다 30P 홀드
    if (Array.isArray(body.questions)) {
      const result = await askQuestions({
        uid: user.uid,
        postId: String(body.postId || ''),
        items: body.questions.filter((item): item is AskInput => Boolean(item) && typeof item === 'object'),
        linkedin: body.linkedin,
      })
      return pointsJson({ ...result, question: result.questions[0] ?? null })
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
