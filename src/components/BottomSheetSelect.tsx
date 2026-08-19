'use client'

import { useId, useState, type ReactNode } from 'react'

import { BottomSheet } from './BottomSheet'
import { cn } from '@lib'

export type BottomSheetSelectOption = {
  value: string
  label: string
  description?: string
}

type BottomSheetSelectProps = {
  title: string
  value: string
  options: BottomSheetSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  /** 빈 값 옵션 (예: 선택 안 함) */
  emptyOption?: BottomSheetSelectOption
  /** 트리거 버튼 추가 클래스 */
  triggerClassName?: string
  /** 커스텀 트리거. 없으면 기본 필드 버튼 */
  children?: (props: {
    open: () => void
    displayLabel: string
    selected: boolean
  }) => ReactNode
  /** 제어 모드 */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}

/** 바텀시트에서 단일 값을 고르는 공용 셀렉트 */
export function BottomSheetSelect({
  title,
  value,
  options,
  onChange,
  placeholder = '선택하기',
  emptyOption,
  triggerClassName,
  children,
  open: controlledOpen,
  onOpenChange,
  disabled,
}: BottomSheetSelectProps) {
  const listId = useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const allOptions = emptyOption ? [emptyOption, ...options] : options
  const selected = allOptions.find((o) => o.value === value)
  const displayLabel = selected?.label ?? placeholder
  const hasValue = Boolean(selected) && value !== ''

  return (
    <>
      {children ? (
        children({
          open: () => {
            if (!disabled) setOpen(true)
          },
          displayLabel,
          selected: hasValue,
        })
      ) : (
        <button
          type='button'
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#f4f5f7] px-3.5 text-left text-sm touch-manipulation transition active:bg-[#eceef1] disabled:opacity-50',
            triggerClassName,
          )}
        >
          <span
            className={
              hasValue
                ? 'truncate font-medium text-[var(--foreground)]'
                : 'truncate text-[var(--muted)]'
            }
          >
            {displayLabel}
          </span>
          <ChevronDown />
        </button>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title={title}>
        <ul id={listId} role='listbox' aria-label={title} className='py-1'>
          {allOptions.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={option.value || '__empty'} role='option' aria-selected={isSelected}>
                <button
                  type='button'
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3.5 py-3.5 text-left touch-manipulation transition',
                    isSelected
                      ? 'bg-[var(--brand-light)]'
                      : 'active:bg-[#f4f5f7]',
                  )}
                >
                  <span className='min-w-0 flex-1'>
                    <span
                      className={cn(
                        'block text-[15px] tracking-tight',
                        isSelected
                          ? 'font-semibold text-[var(--foreground)]'
                          : 'font-medium text-[var(--foreground)]',
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && <CheckIcon />}
                </button>
              </li>
            )
          })}
        </ul>
      </BottomSheet>
    </>
  )
}

function ChevronDown() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className='size-4 shrink-0 text-[#b0b6c0]'
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='m6 9 6 6 6-6' />
    </svg>
  )
}

function CheckIcon() {
  return (
    <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white'>
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2.5'
        className='size-3.5'
        aria-hidden
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='m5 12.5 4.5 4.5L19 7.5'
        />
      </svg>
    </span>
  )
}
