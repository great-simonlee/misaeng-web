'use client'

import { useEffect, useState } from 'react'

import { BottomSheetSelect } from '@components'
import {
  formatStatusEmployerLocation,
  isStatusEmployerOther,
  parseStatusEmployerLocation,
  STATUS_EMPLOYER_OPTIONS,
  STATUS_EMPLOYER_OTHER_VALUE,
} from '@lib/constants/statusEmployer'
import { cn } from '@lib'

type StatusEmployerSelectProps = {
  value: string
  onChange: (location: string) => void
  label?: string
  className?: string
  inputClassName?: string
}

/** Status 글용 학교·회사·기관 선택 (국적×산업 + 그 외 직접 입력) */
export function StatusEmployerSelect({
  value,
  onChange,
  label = '학교 / 회사 / 관련 기관 (선택)',
  className,
  inputClassName,
}: StatusEmployerSelectProps) {
  const [optionValue, setOptionValue] = useState(
    () => parseStatusEmployerLocation(value).optionValue,
  )

  useEffect(() => {
    const parsed = parseStatusEmployerLocation(value)
    if (parsed.optionValue) {
      setOptionValue(parsed.optionValue)
      return
    }
    // 그 외 선택 후 아직 미입력(value='')이면 선택 유지
    setOptionValue((prev) => (isStatusEmployerOther(prev) ? prev : ''))
  }, [value])

  const otherText = isStatusEmployerOther(optionValue)
    ? parseStatusEmployerLocation(value).otherText
    : ''

  function handleSelect(nextValue: string) {
    setOptionValue(nextValue)
    if (!nextValue) {
      onChange('')
      return
    }
    if (isStatusEmployerOther(nextValue)) {
      const parsed = parseStatusEmployerLocation(value)
      onChange(
        isStatusEmployerOther(parsed.optionValue) ? parsed.otherText : '',
      )
      return
    }
    onChange(formatStatusEmployerLocation(nextValue, ''))
  }

  function handleOtherText(nextText: string) {
    setOptionValue(STATUS_EMPLOYER_OTHER_VALUE)
    onChange(nextText)
  }

  return (
    <div className={cn(className)}>
      <p className='text-[13px] font-medium text-[var(--foreground)]'>{label}</p>
      <div className='mt-1.5'>
        <BottomSheetSelect
          title='학교 / 회사 / 관련 기관'
          value={optionValue}
          options={STATUS_EMPLOYER_OPTIONS}
          onChange={handleSelect}
          placeholder='선택해 주세요'
          emptyOption={{ value: '', label: '선택 안 함' }}
        />
      </div>
      {isStatusEmployerOther(optionValue) ? (
        <input
          value={otherText}
          onChange={(e) => handleOtherText(e.target.value)}
          className={cn(
            'mt-2 h-11 w-full rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20',
            inputClassName,
          )}
          placeholder='학교·회사·기관명을 직접 적어 주세요'
        />
      ) : null}
    </div>
  )
}
