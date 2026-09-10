'use client'

import { useState } from 'react'

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
  // 그 외 선택 직후 아직 텍스트가 비어 있을 때만 로컬로 유지 (effect 없이)
  const [pendingOther, setPendingOther] = useState(false)

  const parsed = parseStatusEmployerLocation(value)
  const optionValue =
    parsed.optionValue ||
    (pendingOther ? STATUS_EMPLOYER_OTHER_VALUE : '')
  const otherText = isStatusEmployerOther(optionValue) ? parsed.otherText : ''

  function handleSelect(nextValue: string) {
    if (!nextValue) {
      setPendingOther(false)
      onChange('')
      return
    }
    if (isStatusEmployerOther(nextValue)) {
      setPendingOther(true)
      onChange(isStatusEmployerOther(parsed.optionValue) ? parsed.otherText : '')
      return
    }
    setPendingOther(false)
    onChange(formatStatusEmployerLocation(nextValue, ''))
  }

  function handleOtherText(nextText: string) {
    setPendingOther(true)
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
