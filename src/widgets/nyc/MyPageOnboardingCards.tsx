'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useCityPath } from '@hooks/useCity'
import { useT } from '@lib/i18n/client'

/**
 * 마이페이지 1.0.7 카드 (미생만):
 *   * JustVerifiedLine — 학교 인증(또는 직장 승인) 직후 한 줄: 부모님 초대 30P + 퀴즈 10P
 *   * QuizCard — 미생 퀴즈 (인증한 일반 회원, 10P 한 번)
 *   * ParentAccountCard — 학부모 계정: 연결된 학생과 할 수 있는 일
 */

const card =
  'overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'

export function JustVerifiedLine({ quizAvailable }: { quizAvailable: boolean }) {
  const t = useT('me.afterVerify')
  const href = useCityPath()
  return (
    <div className='space-y-2 rounded-[1.25rem] bg-[var(--brand)]/[0.07] px-5 py-4 ring-1 ring-[var(--brand)]/15'>
      <a href='#parent-invite' className='flex items-center gap-2 text-[13.5px] font-semibold text-[var(--foreground)]'>
        <span className='min-w-0 flex-1'>{t('parentLine', { amount: 30 })}</span>
        <span aria-hidden className='text-[var(--brand)]'>→</span>
      </a>
      {quizAvailable ? (
        <Link href={href('/me/quiz')} className='flex items-center gap-2 text-[13px] font-medium text-[var(--muted-foreground)]'>
          <span className='min-w-0 flex-1'>{t('quizLine', { amount: 10 })}</span>
          <span aria-hidden className='text-[var(--brand)]'>→</span>
        </Link>
      ) : null}
    </div>
  )
}

export function QuizCard({ completed, rewardPoints }: { completed: boolean; rewardPoints: number }) {
  const t = useT('me.quiz')
  const href = useCityPath()
  return (
    <section>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('cardTitle')}</h3>
      <Link href={href('/me/quiz')} className={`${card} flex items-center gap-3 px-5 py-4 touch-manipulation transition active:bg-[#f8f9fb]`}>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[16px] font-bold text-[var(--brand)]'>
          Q
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
            {completed ? t('cardDone') : t('cardCta', { amount: rewardPoints })}
          </span>
          <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>{t('cardHint')}</span>
        </span>
        {completed ? (
          <span className='shrink-0 text-[12px] font-medium text-emerald-600'>{t('doneBadge')}</span>
        ) : (
          <span className='shrink-0 text-[12px] font-semibold text-[var(--brand)]'>+{rewardPoints}P</span>
        )}
      </Link>
    </section>
  )
}

type ParentLink = { invitedByNickname: string | null } | null

export function ParentAccountCard() {
  const t = useT('me.parentAccount')
  const href = useCityPath()
  const [link, setLink] = useState<ParentLink>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/app/me', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { parent?: ParentLink } | null) => {
        if (!cancelled) setLink(data?.parent ?? null)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('title')}</h3>
      <div className={`${card} px-5 py-4`}>
        <p className='text-[14px] font-medium text-[var(--foreground)]'>
          {link?.invitedByNickname ? t('linkedTo', { name: link.invitedByNickname }) : t('linked')}
        </p>
        <ul className='mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
          <li>· {t('can')}</li>
          <li>· {t('cannot')}</li>
        </ul>
        <Link
          href={href('/anonymous/new')}
          className='mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-white touch-manipulation'
        >
          {t('writeCta')}
        </Link>
      </div>
    </section>
  )
}
