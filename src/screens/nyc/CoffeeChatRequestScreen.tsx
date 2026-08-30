'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { LoadingState } from '@components'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { COMMUNITY_CREDIT_REDEEM_OPTIONS } from '@lib/constants/communityCredit'
import {
  COFFEE_CHAT_ACADEMIC_LEVELS,
  COFFEE_CHAT_DEFAULT_MEETING_FORMAT,
  COFFEE_CHAT_MATCH_FOCUSES,
  CREDIT_REDEEM_DETAIL_MAX,
  CREDIT_REDEEM_TOPIC_MAX,
  type CoffeeChatAcademicLevelId,
  type CoffeeChatMatchFocusId,
} from '@lib/constants/creditRedeemRequest'
import { isSchoolVerified } from '@lib/community/schoolGate'
import { cn } from '@lib'
import {
  BoardBackLink,
  BoardPageShell,
  BoardSurface,
} from '@widgets/nyc/BoardPageShell'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'

const OPTION = COMMUNITY_CREDIT_REDEEM_OPTIONS.find(
  (item) => item.id === 'coffee-chat',
)!

export function CoffeeChatRequestScreen() {
  const loginNext = '/nyc/credit/coffee-chat'
  const { user, profile, loading, isAuthenticated } = useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const router = useRouter()

  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [matchFocus, setMatchFocus] = useState<CoffeeChatMatchFocusId | null>(
    null,
  )
  const [field, setField] = useState('')
  const [academicLevel, setAcademicLevel] =
    useState<CoffeeChatAcademicLevelId | null>(null)
  const [detail, setDetail] = useState('')

  const schoolOk = isSchoolVerified(profile)
  const affordable = (balance ?? 0) >= OPTION.cost

  const canSubmit = useMemo(() => {
    if (!matchFocus || !affordable || submitting) return false
    if (!field.trim()) return false
    if (matchFocus === 'academic' && !academicLevel) return false
    if (detail.trim().length < 10) return false
    return true
  }, [matchFocus, affordable, submitting, field, academicLevel, detail])

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    ;(async () => {
      setBalanceLoading(true)
      try {
        const res = await fetch('/api/community/credit', {
          credentials: 'include',
          cache: 'no-store',
        })
        const data = (await res.json().catch(() => null)) as {
          balance?: number
        } | null
        if (!cancelled) {
          setBalance(Number(data?.balance) || 0)
        }
      } catch {
        if (!cancelled) setBalance(0)
      } finally {
        if (!cancelled) setBalanceLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || !matchFocus) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/community/credit-redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'coffee-chat',
          matchFocus,
          field: field.trim(),
          company: null,
          academicLevel: matchFocus === 'academic' ? academicLevel : null,
          meetingFormat: COFFEE_CHAT_DEFAULT_MEETING_FORMAT,
          detail: detail.trim(),
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error || '신청에 실패했어요')
      }
      success('커피챗 신청을 접수했어요. 매칭되면 이메일로 연락드릴게요.')
      router.replace('/nyc/me')
    } catch (err) {
      toastError(getErrorMessage(err, '신청에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return <LoadingState fullPage />
  }

  if (!schoolOk) {
    return (
      <BoardPageShell width='narrow' className='py-10'>
        <BoardBackLink href='/nyc/me' label='마이페이지' />
        <div className='mt-6'>
          <SchoolVerificationRequired
            nextPath='/nyc/credit/coffee-chat'
            withShell={false}
          />
        </div>
      </BoardPageShell>
    )
  }

  return (
    <BoardPageShell width='narrow' className='pb-16 pt-6 sm:pt-8'>
      <BoardBackLink href='/nyc/me' label='마이페이지' />

      <header className='mt-5'>
        <p className='text-[11px] font-semibold tracking-[0.18em] text-[var(--muted)]'>
          CREDIT REDEEM
        </p>
        <h1 className='mt-1.5 text-[1.5rem] font-bold tracking-tight text-[var(--foreground)]'>
          {OPTION.label} 신청
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          관심 분야 현직자 또는 석·박·포닥과 30분 Zoom 커피챗을
          신청해요. 필요 크레딧 {OPTION.cost}.
        </p>
      </header>

      <div className='mt-4 rounded-2xl bg-[#f7f8fa] px-4 py-3'>
        <p className='text-[11px] text-[var(--muted)]'>보유 크레딧</p>
        <p className='mt-0.5 text-[1.25rem] font-bold tabular-nums text-[var(--foreground)]'>
          {balanceLoading ? '…' : (balance ?? 0).toLocaleString('en-US')}
        </p>
        {!balanceLoading && !affordable ? (
          <p className='mt-1 text-[12px] text-[var(--muted)]'>
            {OPTION.cost - (balance ?? 0)} 크레딧이 더 필요해요.{' '}
            <Link href='/nyc/credit' className='font-medium text-[var(--brand)]'>
              적립 안내
            </Link>
          </p>
        ) : null}
      </div>

      <BoardSurface className='mt-5 p-5 sm:p-6'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <fieldset>
            <legend className='text-[13px] font-semibold text-[var(--foreground)]'>
              누구와 대화하고 싶나요?
            </legend>
            <div className='mt-3 space-y-2'>
              {COFFEE_CHAT_MATCH_FOCUSES.map((item) => {
                const active = matchFocus === item.id
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => setMatchFocus(item.id)}
                    className={cn(
                      'w-full rounded-2xl px-4 py-3.5 text-left ring-1 transition touch-manipulation',
                      active
                        ? 'bg-[#fff7f4] ring-[var(--brand)]'
                        : 'bg-white ring-black/[0.06] hover:ring-black/[0.12]',
                    )}
                  >
                    <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                      {item.label}
                    </p>
                    <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className='block'>
            <span className='text-[13px] font-semibold text-[var(--foreground)]'>
              관심 분야 · 업계
            </span>
            <input
              required
              value={field}
              maxLength={CREDIT_REDEEM_TOPIC_MAX}
              onChange={(e) => setField(e.target.value)}
              placeholder='예: Product Design, Quant Research, 바이오테크'
              className='mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 text-[14px] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15'
            />
            {matchFocus === 'industry' ? (
              <p className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]'>
                관심 회사가 있으면 분야와 함께 적어 주세요. 예: Google,
                Meta, Goldman Sachs, McKinsey
              </p>
            ) : null}
          </label>

          {matchFocus === 'academic' ? (
            <fieldset>
              <legend className='text-[13px] font-semibold text-[var(--foreground)]'>
                희망 학위 단계
              </legend>
              <div className='mt-3 flex flex-wrap gap-2'>
                {COFFEE_CHAT_ACADEMIC_LEVELS.map((item) => {
                  const active = academicLevel === item.id
                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => setAcademicLevel(item.id)}
                      className={cn(
                        'inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold ring-1 touch-manipulation transition',
                        active
                          ? 'bg-[var(--brand)] text-white ring-[var(--brand)]'
                          : 'bg-white text-[var(--foreground)] ring-black/[0.08]',
                      )}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          <div className='rounded-2xl bg-[#f7f8fa] px-4 py-3'>
            <p className='text-[13px] font-semibold text-[var(--foreground)]'>
              미팅 형식
            </p>
            <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
              Zoom 콜로만 진행됩니다. (약 30분)
            </p>
          </div>

          <label className='block'>
            <span className='text-[13px] font-semibold text-[var(--foreground)]'>
              하고 싶은 이야기 · 질문
            </span>
            <textarea
              required
              value={detail}
              maxLength={CREDIT_REDEEM_DETAIL_MAX}
              onChange={(e) => setDetail(e.target.value)}
              rows={6}
              placeholder='진로, 업계 culture, 학교/랩 생활, 이직 준비 등 나누고 싶은 주제를 적어 주세요.'
              className='mt-2 w-full resize-y rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[14px] leading-relaxed outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15'
            />
            <span className='mt-1 block text-right text-[11px] tabular-nums text-[var(--muted)]'>
              {detail.length}/{CREDIT_REDEEM_DETAIL_MAX}
            </span>
          </label>

          <button
            type='submit'
            disabled={!canSubmit}
            className='flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-45'
          >
            {submitting ? '신청 중…' : `${OPTION.cost} 크레딧으로 신청하기`}
          </button>
          <p className='text-center text-[12px] leading-relaxed text-[var(--muted)]'>
            신청 접수 후 미생이 검토·매칭합니다. 크레딧은 매칭 확정 시
            차감됩니다.
          </p>
        </form>
      </BoardSurface>
    </BoardPageShell>
  )
}
