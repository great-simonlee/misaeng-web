'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { fetchPostRecommendSummary } from '@lib/community/engagement.client'
import { formatCommunityCount } from '@lib/constants/communityMock'

type FoodCardRecommendStatProps = {
  postId: string
  /** 목록 API에서 받은 값 — 있으면 추가 요청 없음 */
  count?: number
}

export function FoodCardRecommendStat({
  postId,
  count: countProp,
}: FoodCardRecommendStatProps) {
  const { user } = useAuth()
  const [count, setCount] = useState<number | null>(
    countProp != null ? countProp : null,
  )

  useEffect(() => {
    if (countProp != null) {
      setCount(countProp)
      return
    }

    let cancelled = false
    void fetchPostRecommendSummary(postId, user?.uid).then((summary) => {
      if (!cancelled) setCount(summary.count)
    })
    return () => {
      cancelled = true
    }
  }, [postId, user?.uid, countProp])

  return (
    <span className='inline-flex items-center gap-1.5'>
      <RecommendIcon className='size-3.5' />
      <span>
        추천{' '}
        <span className='tabular-nums'>
          {count == null ? '…' : formatCommunityCount(count)}
        </span>
      </span>
    </span>
  )
}

function RecommendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M7 10v12' />
      <path d='M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z' />
    </svg>
  )
}
