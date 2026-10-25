'use client'

import { cn } from '@lib'
import {
  JOB_REVIEW_TYPES,
  getJobReviewTypeStyle,
  type JobReviewTypeId,
} from '@lib/community/jobReview'
import { useT } from '@lib/i18n/client'

type JobReviewTypeBadgeProps = {
  type: JobReviewTypeId | null | undefined
  className?: string
}

export function JobReviewTypeBadge({ type, className }: JobReviewTypeBadgeProps) {
  const t = useT('reviews')
  if (!type || !JOB_REVIEW_TYPES.some((item) => item.id === type)) return null
  const label = t(`jobReview.types.${type}.label`)
  const style = getJobReviewTypeStyle(type)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
        style.badge,
        className,
      )}
    >
      {label}
    </span>
  )
}

type JobReviewTypePickerProps = {
  value: JobReviewTypeId | null
  onChange: (value: JobReviewTypeId) => void
}

export function JobReviewTypePicker({ value, onChange }: JobReviewTypePickerProps) {
  const t = useT('reviews')
  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
      {JOB_REVIEW_TYPES.map((item) => {
        const active = value === item.id
        const style = getJobReviewTypeStyle(item.id)
        return (
          <button
            key={item.id}
            type='button'
            onClick={() => onChange(item.id)}
            className={cn(
              'relative rounded-2xl px-3.5 py-3.5 text-left ring-1 touch-manipulation transition',
              active ? style.pickerActive : style.picker,
            )}
          >
            {active ? (
              <span
                className='absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white'
                style={{ backgroundColor: style.accent }}
                aria-hidden
              >
                ✓
              </span>
            ) : null}
            <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
              {t(`jobReview.types.${item.id}.label`)}
            </span>
            <span className='mt-1 block text-[12px] font-light leading-snug text-[var(--muted-foreground)]'>
              {t(`jobReview.types.${item.id}.description`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
