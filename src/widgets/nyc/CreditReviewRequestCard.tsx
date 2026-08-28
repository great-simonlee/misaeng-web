'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { COMMUNITY_CREDIT_REVIEW_BONUS } from '@lib/constants/communityCredit'
import { postHasFinalResultForCreditReview } from '@lib/community/creditFinalResult'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'

type ReviewRequest = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  rejectReason?: string | null
}

type Props = {
  post: CommunityPost
  boardId: string
  isAuthor: boolean
  className?: string
}

export function CreditReviewRequestCard({
  post,
  boardId,
  isAuthor,
  className,
}: Props) {
  const [request, setRequest] = useState<ReviewRequest | null>(null)
  const [eligible, setEligible] = useState(() =>
    postHasFinalResultForCreditReview(post),
  )
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthor) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/community/${post.id}/credit-review`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => null)) as {
        eligible?: boolean
        request?: ReviewRequest | null
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error || '상태를 불러오지 못했어요')
      }
      setEligible(Boolean(data?.eligible))
      setRequest(data?.request ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태를 불러오지 못했어요')
    } finally {
      setLoading(false)
    }
  }, [isAuthor, post.id])

  useEffect(() => {
    setEligible(postHasFinalResultForCreditReview(post))
  }, [post])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRequest() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/community/${post.id}/credit-review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = (await res.json().catch(() => null)) as {
        request?: ReviewRequest
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error || '요청에 실패했어요')
      }
      setRequest(data?.request ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthor) return null

  const status = request?.status
  const showRequestButton =
    eligible && status !== 'pending' && status !== 'approved'

  return (
    <div
      className={cn(
        'rounded-2xl border border-[#F64310]/15 bg-[linear-gradient(135deg,#fffaf8_0%,#ffffff_60%)] px-4 py-4 ring-1 ring-[#F64310]/8 sm:px-5',
        className,
      )}
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <p className='text-[13px] font-semibold text-[var(--foreground)]'>
            최종 결과 리뷰 보너스
          </p>
          <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
            최종 결과까지 적힌 후기는 미생 팀이 내용을 검토한 뒤 추가{' '}
            <strong className='font-semibold text-[var(--brand)]'>
              +{COMMUNITY_CREDIT_REVIEW_BONUS}
            </strong>{' '}
            크레딧을 지급할 수 있어요. (자동 적립과 합쳐 글당 최대 50)
          </p>
          {!eligible ? (
            <p className='mt-2 text-[12px] text-[var(--muted)]'>
              타임라인에 최종 결과(승인·카드 수령·Offer·거절 등)를 추가한 뒤
              요청할 수 있어요.
            </p>
          ) : null}
          {status === 'pending' ? (
            <p className='mt-2 text-[12px] font-medium text-amber-700'>
              검토 대기 중 · 미생 팀이 글을 확인한 뒤 지급합니다.
            </p>
          ) : null}
          {status === 'approved' ? (
            <p className='mt-2 text-[12px] font-medium text-emerald-700'>
              승인됨 · 추가 +{COMMUNITY_CREDIT_REVIEW_BONUS} 크레딧이
              지급되었어요.
            </p>
          ) : null}
          {status === 'rejected' ? (
            <p className='mt-2 text-[12px] font-medium text-[var(--muted)]'>
              반려됨
              {request?.rejectReason ? ` · ${request.rejectReason}` : null}
              . 내용을 보완한 뒤 다시 요청할 수 있어요.
            </p>
          ) : null}
          {error ? (
            <p className='mt-2 text-[12px] text-red-600'>{error}</p>
          ) : null}
        </div>

        <div className='flex shrink-0 flex-col gap-2 sm:items-end'>
          {showRequestButton ? (
            <button
              type='button'
              onClick={() => void handleRequest()}
              disabled={submitting || loading}
              className='inline-flex h-10 items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-50'
            >
              {submitting ? '요청 중…' : '추가 크레딧 요청'}
            </button>
          ) : null}
          {!eligible ? (
            <Link
              href={`/nyc/${boardId}/${post.id}/edit`}
              className='inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation'
            >
              타임라인 수정
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
