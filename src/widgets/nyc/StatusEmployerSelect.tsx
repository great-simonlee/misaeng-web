'use client'

import { useState } from 'react'

import { BottomSheetSelect } from '@components'
import {
  formatStatusEmployerLocation,
  isStatusEmployerOther,
  parseStatusEmployerLocation,
  STATUS_EMPLOYER_NAME_MAX,
  STATUS_EMPLOYER_OPTIONS,
  STATUS_EMPLOYER_OTHER_VALUE,
} from '@lib/constants/statusEmployer'
import { cn } from '@lib'

const CATEGORY_OPTIONS = STATUS_EMPLOYER_OPTIONS.filter(
  (option) => option.value !== STATUS_EMPLOYER_OTHER_VALUE,
)

type LocationMode = 'name' | 'category'

type StatusEmployerSelectProps = {
  value: string
  onChange: (location: string) => void
  label?: string
  className?: string
  inputClassName?: string
}

function inferLocationMode(location: string): LocationMode | null {
  const trimmed = location.trim()
  if (!trimmed) return null
  const parsed = parseStatusEmployerLocation(trimmed)
  if (!parsed.optionValue) return null
  return isStatusEmployerOther(parsed.optionValue) ? 'name' : 'category'
}

/** Status 글용 회사명 직접 입력 또는 카테고리 선택 */
export function StatusEmployerSelect({
  value,
  onChange,
  label = '학교 / 회사 / 관련 기관 (선택)',
  className,
  inputClassName,
}: StatusEmployerSelectProps) {
  const inferred = inferLocationMode(value)
  const [modeOverride, setModeOverride] = useState<LocationMode | null>(null)
  const mode = modeOverride ?? inferred
  const parsed = parseStatusEmployerLocation(value)
  const categoryValue = mode === 'category' ? parsed.optionValue : ''
  const nameValue = mode === 'name' ? value : ''

  function selectMode(next: LocationMode) {
    if (next === mode) return
    setModeOverride(next)
    onChange('')
  }

  function handleCategory(nextValue: string) {
    setModeOverride('category')
    if (!nextValue) {
      onChange('')
      return
    }
    onChange(formatStatusEmployerLocation(nextValue, ''))
  }

  function handleName(nextText: string) {
    setModeOverride('name')
    onChange(nextText.slice(0, STATUS_EMPLOYER_NAME_MAX))
  }

  return (
    <div className={cn(className)}>
      <p className='text-[13px] font-medium text-[var(--foreground)]'>{label}</p>
      <div className='mt-1.5 grid grid-cols-2 gap-2'>
        <ModeButton
          active={mode === 'name'}
          onClick={() => selectMode('name')}
          label='회사명 바로 입력'
        />
        <ModeButton
          active={mode === 'category'}
          onClick={() => selectMode('category')}
          label='회사 카테고리 선택'
        />
      </div>
      {mode === 'name' ? (
        <div className='mt-2'>
          <input
            value={nameValue}
            onChange={(e) => handleName(e.target.value)}
            maxLength={STATUS_EMPLOYER_NAME_MAX}
            className={cn(
              'h-11 w-full rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20',
              inputClassName,
            )}
            placeholder='회사명을 입력해 주세요'
          />
          <p className='mt-1.5 text-right text-[11px] tabular-nums text-[var(--muted)]'>
            {nameValue.length}/{STATUS_EMPLOYER_NAME_MAX}
          </p>
        </div>
      ) : null}
      {mode === 'category' ? (
        <div className='mt-2'>
          <BottomSheetSelect
            title='회사 카테고리'
            value={categoryValue}
            options={CATEGORY_OPTIONS}
            onChange={handleCategory}
            placeholder='카테고리를 선택해 주세요'
            emptyOption={{ value: '', label: '선택 안 함' }}
          />
        </div>
      ) : null}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'rounded-xl px-3 py-2.5 text-[13px] font-semibold ring-1 touch-manipulation transition',
        active
          ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
          : 'bg-white text-[var(--foreground)] ring-black/[0.08]',
      )}
    >
      {label}
    </button>
  )
}
