'use client'

import { useEffect, useState } from 'react'

import { fetchCommunityCommentCount } from '@lib/community/comments.client'
import { formatCommunityCount } from '@lib/constants/communityMock'

type FoodCardCommentStatProps = {
  postId: string
  /** 목록 API에서 받은 값 — 있으면 추가 요청 없음 */
  count?: number
}

export function FoodCardCommentStat({
  postId,
  count: countProp,
}: FoodCardCommentStatProps) {
  const [fetchedCount, setFetchedCount] = useState<number | null>(null)
  const count = countProp != null ? countProp : fetchedCount

  useEffect(() => {
    if (countProp != null) return

    let cancelled = false
    void fetchCommunityCommentCount(postId).then((total) => {
      if (!cancelled) setFetchedCount(total)
    })
    return () => {
      cancelled = true
    }
  }, [postId, countProp])

  return (
    <span className='inline-flex items-center gap-1.5'>
      <CommentIcon className='size-3.5' />
      <span>
        댓글{' '}
        <span className='tabular-nums'>
          {count == null ? '…' : formatCommunityCount(count)}
        </span>
      </span>
    </span>
  )
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' />
    </svg>
  )
}
