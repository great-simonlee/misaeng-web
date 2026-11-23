'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { MISAENG_DESIGN, byBrand } from '@lib/brand/design'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

type Question = { id: string; question: string; options: { id: string; text: string }[] }
type Quiz = {
  version: string
  total: number
  questions: Question[]
  eligible: boolean
  reason: 'not_verified' | 'parent' | null
  completed: boolean
  rewardPoints: number
}
type Feedback = { optionId: string; correct: boolean; explanation: string }

/**
 * 미생 퀴즈 (1.0.7): 20문제를 한 화면에 하나씩, 고르면 바로 정답/오답 + 한 줄 설명, 틀리면 바로 다시.
 * 채점은 서버(/api/quiz/onboarding/answer), 끝나면 /complete가 다시 채점하고 처음 한 번만 10P.
 */
export function OnboardingQuizScreen() {
  const t = useT('me.quiz')
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [wrongPicks, setWrongPicks] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ awarded: number; alreadyCompleted: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace(cityLoginPath(city, href('/me/quiz')))
  }, [authLoading, user, router, city, href])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void fetch('/api/quiz/onboarding', { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Quiz) => {
        if (!cancelled) setQuiz(data)
      })
      .catch(() => {
        if (!cancelled) setError(t('loadFailed'))
      })
    return () => {
      cancelled = true
    }
  }, [user, t])

  const current = quiz?.questions[index] ?? null

  const pick = useCallback(
    async (optionId: string) => {
      if (!current || checking || feedback?.correct) return
      setChecking(true)
      try {
        const res = await fetch('/api/quiz/onboarding/answer', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: current.id, optionId }),
        })
        const data = (await res.json()) as { correct: boolean; explanation: string }
        setFeedback({ optionId, correct: data.correct, explanation: data.explanation })
        if (data.correct) setAnswers((prev) => ({ ...prev, [current.id]: optionId }))
        else setWrongPicks((prev) => [...prev, optionId])
      } catch {
        setError(t('loadFailed'))
      } finally {
        setChecking(false)
      }
    },
    [current, checking, feedback, t],
  )

  async function next() {
    if (!quiz) return
    setFeedback(null)
    setWrongPicks([])
    if (index + 1 < quiz.questions.length) {
      setIndex(index + 1)
      return
    }
    setChecking(true)
    try {
      const res = await fetch('/api/quiz/onboarding/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = (await res.json()) as { completed?: boolean; awarded?: number; alreadyCompleted?: boolean; error?: string }
      if (!res.ok || !data.completed) throw new Error(data.error || t('loadFailed'))
      setResult({ awarded: data.awarded ?? 0, alreadyCompleted: Boolean(data.alreadyCompleted) })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'))
    } finally {
      setChecking(false)
    }
  }

  if (!user || (!quiz && !error)) return <LoadingState fullPage />

  const shell = (body: React.ReactNode) => (
    <BoardPageShell width='narrow'>
      {MISAENG_DESIGN ? (
        // Misaeng: the quiz sits in one white card (wider column, progress header on top)
        <div className='max-w-2xl pb-16 pt-4 sm:pt-5 lg:pt-6'>
          <div className='rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_36px_-18px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.04] sm:p-8'>
            {body}
          </div>
        </div>
      ) : (
        <div className='mx-auto max-w-md px-1 pb-16 pt-6'>{body}</div>
      )}
    </BoardPageShell>
  )

  if (error && !quiz) return shell(<p className='text-center text-[14px] text-[var(--muted)]'>{error}</p>)
  if (!quiz) return null

  if (!quiz.eligible) {
    return shell(
      <div className='text-center'>
        <h1 className='text-[1.25rem] font-semibold tracking-tight text-[var(--foreground)]'>{t('title')}</h1>
        <p className='mt-3 text-[14px] text-[var(--muted-foreground)]'>
          {quiz.reason === 'parent' ? t('parentNotAllowed') : t('verifyFirst')}
        </p>
        <Link href={href('/me')} className='mt-6 inline-flex h-11 items-center rounded-full bg-[var(--foreground)] px-6 text-[14px] font-semibold text-white'>
          {t('backToMe')}
        </Link>
      </div>,
    )
  }

  if (result) {
    return shell(
      <div className='text-center'>
        <div className='mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600'>✓</div>
        <h1 className='mt-4 text-[1.25rem] font-semibold tracking-tight text-[var(--foreground)]'>{t('doneTitle')}</h1>
        <p className='mt-2 text-[14px] text-[var(--muted-foreground)]'>
          {result.awarded > 0 ? t('doneAwarded', { amount: result.awarded }) : t('doneNoPoints')}
        </p>
        <Link href={href('/me')} className='mt-6 inline-flex h-11 items-center rounded-full bg-[var(--foreground)] px-6 text-[14px] font-semibold text-white'>
          {t('backToMe')}
        </Link>
      </div>,
    )
  }

  if (!current) return null
  const progress = Math.round(((index + (feedback?.correct ? 1 : 0)) / quiz.total) * 100)

  return shell(
    <div>
      <div
        className={byBrand(
          'flex items-center justify-between text-[13px] font-semibold text-[var(--foreground)]',
          'flex items-center justify-between text-[12px] font-medium text-[var(--muted)]',
        )}
      >
        <span>{t('title')}</span>
        <span
          className={byBrand(
            'rounded-full bg-[var(--brand)]/[0.08] px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-[var(--brand)]',
            '',
          )}
        >
          {index + 1} / {quiz.total}
        </span>
      </div>
      <div className={byBrand('mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]', 'mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]')}>
        <div className='h-full rounded-full bg-[var(--brand)] transition-all' style={{ width: `${progress}%` }} />
      </div>
      {/* No reward line when this account has nothing to earn ("0P를 드려요" read oddly) */}
      {!quiz.completed && index === 0 && !feedback && quiz.rewardPoints > 0 ? (
        <p className='mt-4 rounded-xl bg-[var(--brand)]/[0.07] px-3.5 py-2.5 text-[12.5px] text-[var(--foreground)]'>
          {t('intro', { amount: quiz.rewardPoints, total: quiz.total })}
        </p>
      ) : null}
      <h1 className={byBrand('mt-6 text-[1.3rem] font-bold leading-snug tracking-[-0.025em] text-[var(--foreground)] sm:text-[1.45rem]', 'mt-5 text-[1.15rem] font-semibold leading-snug tracking-tight text-[var(--foreground)]')}>{current.question}</h1>
      <div className='mt-5 space-y-2.5'>
        {current.options.map((option) => {
          const picked = feedback?.optionId === option.id
          const wrong = wrongPicks.includes(option.id)
          return (
            <button
              key={option.id}
              type='button'
              disabled={checking || wrong || Boolean(feedback?.correct)}
              onClick={() => void pick(option.id)}
              className={cn(
                'w-full rounded-2xl px-4 py-3.5 text-left text-[14.5px] font-medium ring-1 transition touch-manipulation',
                picked && feedback?.correct
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-400'
                  : wrong
                    ? 'bg-red-50 text-red-800 ring-red-200'
                    : 'bg-white text-[var(--foreground)] ring-black/10 hover:bg-[#f8f9fb]',
              )}
            >
              {option.text}
            </button>
          )
        })}
      </div>
      {feedback ? (
        <div
          className={cn(
            'mt-4 rounded-2xl px-4 py-3.5 text-[13.5px] leading-relaxed',
            feedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800',
          )}
        >
          <p className='font-semibold'>{feedback.correct ? t('correct') : t('wrong')}</p>
          <p className='mt-1'>{feedback.correct ? feedback.explanation : t('tryAgain')}</p>
        </div>
      ) : null}
      {feedback?.correct ? (
        <button
          type='button'
          onClick={() => void next()}
          disabled={checking}
          className='mt-5 h-12 w-full rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white disabled:opacity-50'
        >
          {index + 1 < quiz.total ? t('next') : t('finish')}
        </button>
      ) : null}
      {error ? <p className='mt-3 text-[12.5px] text-red-600'>{error}</p> : null}
    </div>,
  )
}
