import { isIdentityVerified, isParentAccount } from '@lib/community/schoolGate'
import type { Locale } from '@lib/i18n/locales'
import { getPointsConfig, ruleAmount } from '@lib/points/config.server'
import { isPointsLedgerActive } from '@lib/points/engine.server'
import { earnPoints } from '@lib/points/ledger.server'
import { notifyPointsEarned } from '@lib/points/notify.server'
import { getSupabaseProfile, upsertSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

import {
  getQuizQuestion,
  localizeQuiz,
  ONBOARDING_QUIZ_QUESTIONS,
  ONBOARDING_QUIZ_VERSION,
  type QuizLocale,
} from './onboardingQuiz'

/**
 * 온보딩 퀴즈 (1.0.7): 20문제를 하나씩, 틀리면 바로 다시. 채점은 서버에서만 (정답은 응답에 미리 내려주지 않는다).
 * 20문제를 모두 맞히면 earn.onboarding_quiz(10P) 한 번 (키 `earn:onboarding_quiz:{uid}` — 몇 번을 불러도 한 번).
 * 대상: 인증한 일반 회원 (학교 인증 또는 직장 승인). 학부모 계정은 대상이 아니다.
 */

export type QuizEligibility = { eligible: boolean; reason: 'not_verified' | 'parent' | null }

export function quizEligibility(profile: SupabaseProfileRecord | null): QuizEligibility {
  if (isParentAccount(profile)) return { eligible: false, reason: 'parent' }
  if (!isIdentityVerified(profile)) return { eligible: false, reason: 'not_verified' }
  return { eligible: true, reason: null }
}

const quizLocale = (locale: Locale): QuizLocale => (locale === 'ko' || locale === 'vi' ? locale : 'en')

export async function getOnboardingQuiz(uid: string | null, locale: Locale) {
  const profile = uid ? await getSupabaseProfile(uid) : null
  const config = await getPointsConfig()
  return {
    ...localizeQuiz(quizLocale(locale)),
    total: ONBOARDING_QUIZ_QUESTIONS.length,
    ...(uid ? quizEligibility(profile) : { eligible: false, reason: 'not_verified' as const }),
    completed: Boolean(profile?.onboardingQuizCompletedAt),
    completedAt: profile?.onboardingQuizCompletedAt ? new Date(profile.onboardingQuizCompletedAt).toISOString() : null,
    rewardPoints: ruleAmount(config, 'earn.onboarding_quiz'),
  }
}

/** 한 문제 채점: 맞으면 정답 id와 설명, 틀리면 설명만 (다시 고른다) */
export function checkQuizAnswer(questionId: string, optionId: string, locale: Locale) {
  const question = getQuizQuestion(questionId)
  if (!question || !question.options.some((option) => option.id === optionId)) return null
  const correct = question.answer === optionId
  return {
    questionId,
    correct,
    correctOptionId: correct ? question.answer : null,
    explanation: question.explanation[quizLocale(locale)],
  }
}

export class QuizError extends Error {
  constructor(
    readonly code: string,
    readonly key: string,
    readonly status = 400,
  ) {
    super(code)
  }
}

/**
 * 완료: 20문제 답을 모두 다시 채점한다 (클라이언트를 믿지 않는다). 모두 맞으면 완료 시각 저장 + 10P (한 번).
 * → { completed, wrong: [questionId], awarded, alreadyCompleted }
 */
export async function completeOnboardingQuiz(uid: string, answers: Record<string, unknown>) {
  const profile = await getSupabaseProfile(uid)
  const eligibility = quizEligibility(profile)
  if (eligibility.reason === 'parent') throw new QuizError('PARENT_NOT_ALLOWED', 'quiz.parentNotAllowed', 403)
  if (!eligibility.eligible) throw new QuizError('VERIFICATION_REQUIRED', 'quiz.verifyFirst', 403)

  const wrong = ONBOARDING_QUIZ_QUESTIONS.filter((q) => answers?.[q.id] !== q.answer).map((q) => q.id)
  if (wrong.length > 0) return { completed: false, wrong, awarded: 0, alreadyCompleted: Boolean(profile?.onboardingQuizCompletedAt) }

  const alreadyCompleted = Boolean(profile?.onboardingQuizCompletedAt)
  if (!alreadyCompleted) {
    await upsertSupabaseProfile(uid, { onboardingQuizCompletedAt: Date.now(), onboardingQuizVersion: ONBOARDING_QUIZ_VERSION })
  }

  let awarded = 0
  const config = await getPointsConfig()
  const amount = ruleAmount(config, 'earn.onboarding_quiz')
  if (amount > 0 && (await isPointsLedgerActive().catch(() => false))) {
    const result = await earnPoints({
      uid,
      amount,
      reason: 'onboarding_quiz',
      sourceType: 'quiz',
      sourceId: ONBOARDING_QUIZ_VERSION,
      key: `earn:onboarding_quiz:${uid}`,
    })
    if (result.ok && !result.duplicate) {
      awarded = result.amount
      notifyPointsEarned(uid, result.amount, 'onboarding_quiz', result.balance)
    }
  }
  return { completed: true, wrong: [], awarded, alreadyCompleted }
}
