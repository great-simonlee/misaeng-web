import { NextResponse } from 'next/server'

import { getRequestLocale } from '@lib/i18n/server'
import { getOnboardingQuiz } from '@lib/quiz/onboardingQuiz.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/quiz/onboarding (Accept-Language / ?locale via the usual request locale)
 * → { version, total, questions: [{ id, question, options: [{ id, text }] }], eligible, reason, completed, completedAt, rewardPoints }
 * No answers here: each pick is checked with POST /api/quiz/onboarding/answer.
 */
export async function GET(request: Request) {
  const user = await resolveAuthenticatedUser()
  const locale = await getRequestLocale(request)
  try {
    return NextResponse.json(await getOnboardingQuiz(user?.uid ?? null, locale), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Onboarding quiz load error:', error)
    return NextResponse.json({ error: 'Failed to load the quiz.' }, { status: 500 })
  }
}
