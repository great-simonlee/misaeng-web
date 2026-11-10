'use client'

import { cn } from '@lib'
import { JOB_REVIEW_OUTCOMES, type JobReviewOutcomeId } from '@lib/community/jobReview'
import { useT } from '@lib/i18n/client'

type ChoiceCardsProps<T extends string> = {
  options: readonly { id: T; label: string; description?: string }[]
  value: T | null
  onChange: (value: T) => void
}

function ChoiceCards<T extends string>({ options, value, onChange }: ChoiceCardsProps<T>) {
  return (
    <div className='grid grid-cols-2 gap-2'>
      {options.map((item) => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            type='button'
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative rounded-2xl px-3.5 py-3.5 text-left ring-1 touch-manipulation transition',
              active
                ? 'bg-[var(--brand)]/5 ring-2 ring-[var(--brand)]'
                : 'bg-white ring-[var(--border)] hover:ring-[var(--muted)]',
            )}
          >
            {active ? (
              <span
                className='absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-white'
                aria-hidden
              >
                ✓
              </span>
            ) : null}
            <span className='block pr-6 text-[15px] font-semibold text-[var(--foreground)]'>
              {item.label}
            </span>
            {item.description ? (
              <span className='mt-1 block text-[12px] font-light leading-snug text-[var(--muted-foreground)]'>
                {item.description}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

type JobReviewOutcomePickerProps = {
  value: JobReviewOutcomeId | null
  onChange: (value: JobReviewOutcomeId) => void
}

/** 최종 결과 (필수) */
export function JobReviewOutcomePicker({ value, onChange }: JobReviewOutcomePickerProps) {
  const t = useT('reviews')
  const options = JOB_REVIEW_OUTCOMES.map((item) => ({
    id: item.id,
    label: t(`jobReview.outcomes.${item.id}.label`),
    description: t(`jobReview.outcomes.${item.id}.description`),
  }))
  return <ChoiceCards options={options} value={value} onChange={onChange} />
}
