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
  CREDIT_REDEEM_DETAIL_MAX,
  LAWYER_CONSULT_CATEGORIES,
  type LawyerConsultCategoryId,
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
  (item) => item.id === 'lawyer-consult',
)!

export function LawyerConsultRequestScreen() {
  const loginNext = '/nyc/credit/lawyer-consult'
  const { user, profile, loading, isAuthenticated } = useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const router = useRouter()

  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<LawyerConsultCategoryId[]>([])
  const [detail, setDetail] = useState('')

  const schoolOk = isSchoolVerified(profile)
  const affordable = (balance ?? 0) >= OPTION.cost

  const canSubmit = useMemo(() => {
    if (!affordable || submitting) return false
    if (categories.length === 0) return false
    if (detail.trim().length < 10) return false
    return true
  }, [affordable, submitting, categories, detail])

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
        if (!cancelled) setBalance(Number(data?.balance) || 0)
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

  function toggleCategory(id: LawyerConsultCategoryId) {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/community/credit-redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lawyer-consult',
          categories,
          detail: detail.trim(),
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error || '신청에 실패했어요')
      }
      success('이민 변호사 자문 신청을 접수했어요. 일정 조율 후 연락드릴게요.')
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
            nextPath='/nyc/credit/lawyer-consult'
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
          CPT·OPT·비자·영주권 등 카테고리를 고르고 질문 내용을 남겨 주세요.
          약 30분 Q&A · 필요 크레딧 {OPTION.cost}.
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
              자문 카테고리
              <span className='ml-1.5 font-normal text-[var(--muted)]'>
                (복수 선택 가능)
              </span>
            </legend>
            <div className='mt-3 flex flex-wrap gap-2'>
              {LAWYER_CONSULT_CATEGORIES.map((item) => {
                const active = categories.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => toggleCategory(item.id)}
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

          <label className='block'>
            <span className='text-[13px] font-semibold text-[var(--foreground)]'>
              질문 · 상담 내용
            </span>
            <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted)]'>
              현재 신분, 상황 배경, 궁금한 점을 구체적으로 적어 주세요. 개별
              사건 대리·결과 보장은 포함되지 않습니다.
            </p>
            <textarea
              required
              value={detail}
              maxLength={CREDIT_REDEEM_DETAIL_MAX}
              onChange={(e) => setDetail(e.target.value)}
              rows={8}
              placeholder='예: STEM OPT 연장 준비 중인데 I-983 작성 시점과 고용주 요건이 궁금합니다…'
              className='mt-3 w-full resize-y rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[14px] leading-relaxed outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15'
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
            신청 접수 후 미생이 검토·매칭합니다. 크레딧은 일정 확정 시
            차감됩니다.
          </p>
        </form>
      </BoardSurface>
    </BoardPageShell>
  )
}
