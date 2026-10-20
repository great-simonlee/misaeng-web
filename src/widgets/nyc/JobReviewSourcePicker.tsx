'use client'

import { cn } from '@lib'
import { PARTNER_ORGS } from '@lib/constants/partners'
import {
  JOB_REVIEW_OUTCOMES,
  JOB_REVIEW_SOURCES,
  type JobReviewOutcomeId,
  type JobReviewSourceId,
} from '@lib/community/jobReview'

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

const ORG_OPTIONS = PARTNER_ORGS.map((org) => ({ id: org.id as string, label: org.name }))

type JobReviewSourcePickerProps = {
  value: JobReviewSourceId | null
  orgId: string | null
  onChange: (value: JobReviewSourceId, orgId: string | null) => void
}

/** 어떻게 연락이 닿았는지 (필수, 비공개). 학생회를 고르면 어느 학생회인지도 필수 */
export function JobReviewSourcePicker({ value, orgId, onChange }: JobReviewSourcePickerProps) {
  return (
    <div className='space-y-3'>
      <ChoiceCards
        options={JOB_REVIEW_SOURCES}
        value={value}
        onChange={(next) => onChange(next, next === 'student-org' ? orgId : null)}
      />
      {value === 'student-org' ? (
        <div>
          <p className='mb-2 text-[13px] font-medium text-[var(--foreground)]'>
            어느 학생회인가요?<span className='text-[var(--brand)]'> *</span>
          </p>
          <ChoiceCards
            options={ORG_OPTIONS}
            value={orgId}
            onChange={(nextOrg) => onChange('student-org', nextOrg)}
          />
        </div>
      ) : null}
    </div>
  )
}

type JobReviewOutcomePickerProps = {
  value: JobReviewOutcomeId | null
  onChange: (value: JobReviewOutcomeId) => void
}

/** 최종 결과 (필수) */
export function JobReviewOutcomePicker({ value, onChange }: JobReviewOutcomePickerProps) {
  return <ChoiceCards options={JOB_REVIEW_OUTCOMES} value={value} onChange={onChange} />
}

/** 연락 경로 + 학생회까지 모두 골랐는지 */
export function isJobReviewSourceComplete(
  source: JobReviewSourceId | null,
  orgId: string | null,
) {
  return Boolean(source) && (source !== 'student-org' || Boolean(orgId))
}
