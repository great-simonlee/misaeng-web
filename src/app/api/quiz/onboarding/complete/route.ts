import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { completeOnboardingQuiz, QuizError } from '@lib/quiz/onboardingQuiz.server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { answers: { q01: 'b', ..., q20: 'a' } } — the final pick of every question.
 * → { completed: true, wrong: [], awarded: 10 | 0, alreadyCompleted } · { completed: false, wrong: ['q03', ...] }
 * · 403 VERIFICATION_REQUIRED | PARENT_NOT_ALLOWED. 10P once per account (idempotent).
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  try {
    const body = ((await request.json().catch(() => null)) || {}) as { answers?: unknown }
    const answers = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {}
    return NextResponse.json(await completeOnboardingQuiz(user.uid, answers))
  } catch (error) {
    if (error instanceof QuizError) {
      return NextResponse.json({ error: t(error.key), code: error.code }, { status: error.status })
    }
    console.error('Onboarding quiz complete error:', error)
    return NextResponse.json({ error: t('quiz.failed'), code: 'QUIZ_ERROR' }, { status: 500 })
  }
}
