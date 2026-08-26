'use client'

import { cn } from '@lib'
import {
  CPT_OPT_TYPES,
  getCptOptTypeLabel,
  getCptOptTypeStyle,
  type CptOptTypeId,
} from '@lib/community/cptOpt'

type CptOptTypeBadgeProps = {
  type: CptOptTypeId | null | undefined
  className?: string
}

export function CptOptTypeBadge({ type, className }: CptOptTypeBadgeProps) {
  const label = getCptOptTypeLabel(type)
  if (!label) return null
  const style = getCptOptTypeStyle(type)
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

type CptOptTypePickerProps = {
  value: CptOptTypeId | null
  onChange: (value: CptOptTypeId) => void
}

export function CptOptTypePicker({ value, onChange }: CptOptTypePickerProps) {
  return (
    <div className='grid gap-2 sm:grid-cols-3'>
      {CPT_OPT_TYPES.map((item) => {
        const active = value === item.id
        const style = getCptOptTypeStyle(item.id)
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
              {item.label}
            </span>
            <span className='mt-1 block text-[12px] font-medium leading-snug text-[var(--foreground)]'>
              {item.description}
            </span>
            <span className='mt-0.5 block text-[11px] leading-snug text-[var(--muted)]'>
              {item.summary}
            </span>
          </button>
        )
      })}
    </div>
  )
}
