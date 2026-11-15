import { NextResponse } from 'next/server'

import { getRequestLocale, getT } from '@lib/i18n/server'
import { checkQuizAnswer } from '@lib/quiz/onboardingQuiz.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { questionId, optionId } → { questionId, correct, correctOptionId (only when correct), explanation }
 * No sign-in needed (it only checks one answer); points are paid by /complete.
 */
export async function POST(request: Request) {
  const locale = await getRequestLocale(request)
  const body = ((await request.json().catch(() => null)) || {}) as { questionId?: unknown; optionId?: unknown }
  const result = checkQuizAnswer(String(body.questionId || ''), String(body.optionId || ''), locale)
  if (!result) {
    const t = await getT(locale, 'api')
    return NextResponse.json({ error: t('common.badRequest'), code: 'INVALID_ANSWER' }, { status: 400 })
  }
  return NextResponse.json(result)
}
