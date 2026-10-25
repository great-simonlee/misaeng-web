'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { useCity } from '@hooks/useCity'
import { hrefForCommunityPost } from '@lib/constants/cities'
import {
  COMMUNITY_CREDIT_POST_TOTAL_MAX,
  COMMUNITY_CREDIT_REVIEW_BONUS,
} from '@lib/constants/communityCredit'
import { postHasFinalResultForCreditReview } from '@lib/community/creditFinalResult'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'

/** `{token}` 자리에 React 노드(강조)를 넣는다 */
function withNode(text: string, token: string, node: ReactNode): ReactNode {
  const [before, ...rest] = text.split(`{${token}}`)
  if (rest.length === 0) return text
  return (
    <>
      {before}
      {node}
      {rest.join(`{${token}}`)}
    </>
  )
}

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
  isAuthor,
  className,
}: Props) {
  const city = useCity()
  const t = useT('credit')
  const format = useFormat()
  const bonus = format.number(COMMUNITY_CREDIT_REVIEW_BONUS)
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
        throw new Error(data?.error || t('reviewCard.loadFailed'))
      }
      setEligible(Boolean(data?.eligible))
      setRequest(data?.request ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reviewCard.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [isAuthor, post.id, t])

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
        throw new Error(data?.error || t('reviewCard.requestFailed'))
      }
      setRequest(data?.request ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reviewCard.requestFailed'))
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
        'rounded-2xl border border-brand/15 bg-[linear-gradient(135deg,var(--brand-soft)_0%,#ffffff_60%)] px-4 py-4 ring-1 ring-brand/8 sm:px-5',
        className,
      )}
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <p className='text-[13px] font-semibold text-[var(--foreground)]'>
            {t('reviewCard.title')}
          </p>
          <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
            {withNode(
              t('reviewCard.description', {
                totalMax: format.number(COMMUNITY_CREDIT_POST_TOTAL_MAX),
              }),
              'bonus',
              <strong className='font-semibold text-[var(--brand)]'>
                {t('reviewCard.bonusAmount', { amount: bonus })}
              </strong>,
            )}
          </p>
          {!eligible ? (
            <p className='mt-2 text-[12px] text-[var(--muted)]'>
              {t('reviewCard.notEligible')}
            </p>
          ) : null}
          {status === 'pending' ? (
            <p className='mt-2 text-[12px] font-medium text-amber-700'>
              {t('reviewCard.pending')}
            </p>
          ) : null}
          {status === 'approved' ? (
            <p className='mt-2 text-[12px] font-medium text-emerald-700'>
              {t('reviewCard.approved', { amount: bonus })}
            </p>
          ) : null}
          {status === 'rejected' ? (
            <p className='mt-2 text-[12px] font-medium text-[var(--muted)]'>
              {request?.rejectReason
                ? t('reviewCard.rejectedWithReason', { reason: request.rejectReason })
                : t('reviewCard.rejected')}
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
              {submitting ? t('reviewCard.requesting') : t('reviewCard.requestButton')}
            </button>
          ) : null}
          {!eligible ? (
            <Link
              href={hrefForCommunityPost(post, city, 'edit')}
              className='inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation'
            >
              {t('reviewCard.editTimeline')}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
