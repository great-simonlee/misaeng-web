'use client'

import { cn } from '@lib'
import {
  getCptOptListTimestamp,
  hasCptOptPostUpdate,
} from '@lib/community/cptOpt'
import { formatCommunityRelativeTime } from '@lib/constants/communityMock'

type CptOptActivityMetaProps = {
  createdAt: number
  updatedAt: number
  className?: string
  compact?: boolean
}

export function CptOptActivityMeta({
  createdAt,
  updatedAt,
  className,
  compact = false,
}: CptOptActivityMetaProps) {
  const wasUpdated = hasCptOptPostUpdate({ createdAt, updatedAt })
  const listTime = getCptOptListTimestamp({ createdAt, updatedAt })

  if (compact) {
    return (
      <span className={cn('text-[12px] text-[var(--muted)]', className)}>
        {wasUpdated ? (
          <>
            <span className='font-medium text-[var(--foreground)]'>
              업데이트 {formatCommunityRelativeTime(listTime)}
            </span>
            <span className='mx-1 text-black/20'>·</span>
            <span>등록 {formatCommunityRelativeTime(createdAt)}</span>
          </>
        ) : (
          <>등록 {formatCommunityRelativeTime(createdAt)}</>
        )}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {wasUpdated ? (
        <>
          <span className='inline-flex items-center rounded-full bg-[#fff8f5] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
            업데이트 {formatCommunityRelativeTime(listTime)}
          </span>
          <span className='text-[12px] text-[var(--muted)]'>
            최초 등록 {formatCommunityRelativeTime(createdAt)}
          </span>
        </>
      ) : (
        <span className='text-[12px] text-[var(--muted)]'>
          등록 {formatCommunityRelativeTime(createdAt)}
        </span>
      )}
    </div>
  )
}
