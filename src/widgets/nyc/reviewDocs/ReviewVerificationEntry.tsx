'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { LoadingSpinner } from '@components'
import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import type { ReviewDocListResponse } from '@lib/verification/reviewDocs'
import { fetchReviewDocs } from '@lib/verification/reviewDocs.client'

import { ReviewVerificationFlow } from './ReviewVerificationFlow'

/**
 * "후기 인증하기" on the author's own job-review / visa post. Renders nothing for other people's posts or boards
 * that don't take verifications (the server decides).
 */
export function ReviewVerificationEntry({ postId, className }: { postId: string; className?: string }) {
  const t = useT('me.reviewDocs')
  const href = useCityPath()
  const [data, setData] = useState<ReviewDocListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await fetchReviewDocs(postId))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className={cn('flex justify-center py-4', className)}>
        <LoadingSpinner size='sm' />
      </div>
    )
  }
  const post = data?.post
  if (!post?.isAuthor || !post.board) return null

  const latest = data?.submissions[0] ?? null
  const status =
    post.blockedReason === 'approved'
      ? t('entry.approved')
      : post.blockedReason === 'pending'
        ? t('entry.pending')
        : post.blockedReason === 'daily_limit'
          ? t('entry.dailyLimit')
          : latest?.status === 'rejected'
            ? t('entry.rejected')
            : null

  return (
    <section
      className={cn(
        'rounded-[1.25rem] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]',
        className,
      )}
    >
      <div className='flex items-start gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>{t('entry.title')}</p>
          <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {status ?? t('entry.description')}
          </p>
        </div>
        {post.canSubmit ? (
          <button
            type='button'
            onClick={() => setOpen(true)}
            className='shrink-0 rounded-full bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-white'
          >
            {t('entry.start')}
          </button>
        ) : null}
      </div>
      {data?.submissions.length ? (
        <Link href={href('/me#review-verifications')} className='mt-2 inline-block text-[12.5px] font-semibold text-[var(--brand)]'>
          {t('entry.history')}
        </Link>
      ) : null}
      {open ? (
        <ReviewVerificationFlow
          postId={postId}
          kinds={post.kinds}
          onClose={() => setOpen(false)}
          onSubmitted={() => void load()}
        />
      ) : null}
    </section>
  )
}
