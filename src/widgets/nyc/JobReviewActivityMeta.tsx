'use client'

import { cn } from '@lib'
import {
  getJobReviewListTimestamp,
  hasJobReviewPostUpdate,
} from '@lib/community/jobReview'
import { useFormat, useT } from '@lib/i18n/client'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** 1주 이내는 상대 시간, 그 이후는 월·일 */
function useActivityTime() {
  const format = useFormat()
  return (timestamp: number) =>
    Date.now() - timestamp < WEEK_MS
      ? format.relative(timestamp)
      : format.date(timestamp, { month: 'short', day: 'numeric' })
}

type JobReviewActivityMetaProps = {
  createdAt: number
  updatedAt: number
  className?: string
  compact?: boolean
}

export function JobReviewActivityMeta({
  createdAt,
  updatedAt,
  className,
  compact = false,
}: JobReviewActivityMetaProps) {
  const t = useT('reviews')
  const formatTime = useActivityTime()
  const wasUpdated = hasJobReviewPostUpdate({ createdAt, updatedAt })
  const listTime = getJobReviewListTimestamp({ createdAt, updatedAt })

  if (compact) {
    return (
      <span className={cn('whitespace-nowrap text-[11px] text-[var(--muted)] sm:text-[12px]', className)}>
        {wasUpdated ? (
          <>
            <span className='font-medium text-[var(--foreground)]'>
              {t('activity.updated', { time: formatTime(listTime) })}
            </span>
            <span className='mx-1 text-black/20'>·</span>
            <span>{t('activity.posted', { time: formatTime(createdAt) })}</span>
          </>
        ) : (
          <>{t('activity.posted', { time: formatTime(createdAt) })}</>
        )}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {wasUpdated ? (
        <>
          <span className='inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
            {t('activity.updated', { time: formatTime(listTime) })}
          </span>
          <span className='text-[12px] text-[var(--muted)]'>
            {t('activity.firstPosted', { time: formatTime(createdAt) })}
          </span>
        </>
      ) : (
        <span className='text-[12px] text-[var(--muted)]'>
          {t('activity.posted', { time: formatTime(createdAt) })}
        </span>
      )}
    </div>
  )
}
