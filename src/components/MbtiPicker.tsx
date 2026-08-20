'use client'

import { useState, type ReactNode } from 'react'

import { BottomSheet } from './BottomSheet'
import {
  MBTI_DIMENSIONS,
  composeMbtiFromDimensions,
  getMbtiGroupLabel,
  getMbtiNickname,
  parseMbtiDimensions,
  type MbtiDimensionValue,
} from '@lib/constants/mbti'
import { cn } from '@lib'

type MbtiPickerProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  /** 빈 값 허용 (프로필에서 MBTI 제거) */
  allowClear?: boolean
  /** 커스텀 트리거. 없으면 기본 필드 버튼 */
  children?: (props: {
    open: () => void
    displayLabel: string
    selected: boolean
  }) => ReactNode
}

function formatMbtiDisplay(type: string) {
  const nickname = getMbtiNickname(type)
  return nickname ? `${type} · ${nickname}` : type
}

export function MbtiPicker({
  value,
  onChange,
  className,
  disabled,
  allowClear = false,
  children,
}: MbtiPickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<(MbtiDimensionValue | null)[]>(() =>
    parseMbtiDimensions(value),
  )

  const selected = value.trim().toUpperCase()
  const hasValue = Boolean(selected)
  const composed = composeMbtiFromDimensions(draft)
  const composedNickname = composed ? getMbtiNickname(composed) : null
  const composedGroup = composed ? getMbtiGroupLabel(composed) : null
  const displayLabel = hasValue ? formatMbtiDisplay(selected) : '선택해 주세요'

  function handleOpen() {
    if (disabled) return
    setDraft(parseMbtiDimensions(value))
    setOpen(true)
  }

  function handleConfirm() {
    if (composed) onChange(composed)
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setDraft([null, null, null, null])
    setOpen(false)
  }

  return (
    <div className={className}>
      {children ? (
        children({
          open: handleOpen,
          displayLabel,
          selected: hasValue,
        })
      ) : (
        <button
          type='button'
          disabled={disabled}
          onClick={handleOpen}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#f4f5f7] px-3.5 text-left text-sm touch-manipulation transition active:bg-[#eceef1] disabled:opacity-50',
          )}
        >
          <span
            className={cn(
              'truncate',
              hasValue
                ? 'font-medium text-[var(--foreground)]'
                : 'text-[var(--muted)]',
            )}
          >
            {displayLabel}
          </span>
          <ChevronDown />
        </button>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title='MBTI 선택'
        overlayClassName='z-[10002]'
        scrollable={false}
        footer={
          <div className='flex items-center justify-between gap-3 px-4 py-2.5'>
            {allowClear ? (
              <button
                type='button'
                onClick={handleClear}
                className='text-[13px] font-medium text-[var(--muted)] touch-manipulation'
              >
                선택 안 함
              </button>
            ) : (
              <span />
            )}
            <button
              type='button'
              onClick={handleConfirm}
              disabled={!composed}
              className='h-9 rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-40'
            >
              확인
            </button>
          </div>
        }
      >
        <div className='space-y-3 px-3 pb-1 pt-0.5'>
          <div
            className={cn(
              'rounded-xl px-3 py-2.5 text-center ring-1 transition',
              composed
                ? 'bg-[linear-gradient(135deg,#fff8f6_0%,#f8fafc_100%)] ring-[#F64310]/15'
                : 'bg-[#f8fafc] ring-[#e8eaee]',
            )}
          >
            <p className='text-[10px] font-medium text-[var(--muted)]'>
              {composed ? '선택 결과' : '4가지를 모두 선택해 주세요'}
            </p>
            <p
              className={cn(
                'mt-0.5 font-bold tracking-[0.16em]',
                composed
                  ? 'text-[1.35rem] text-[var(--foreground)]'
                  : 'text-[1.1rem] text-[var(--muted)]',
              )}
            >
              {composed || draft.map((letter) => letter ?? '·').join(' ')}
            </p>
            {composed && composedNickname && (
              <p className='mt-0.5 text-[11px] font-medium leading-snug text-[#E03A0C]'>
                {composedNickname}
                {composedGroup ? (
                  <span className='text-[var(--muted)]'> · {composedGroup}</span>
                ) : null}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            {MBTI_DIMENSIONS.map((dimension, index) => (
              <DimensionRow
                key={dimension.id}
                label={dimension.label}
                options={dimension.options}
                value={draft[index] ?? null}
                onChange={(next) => {
                  setDraft((prev) => {
                    const copy = [...prev] as (MbtiDimensionValue | null)[]
                    copy[index] = next
                    return copy
                  })
                }}
              />
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

type DimensionRowProps = {
  label: string
  options: readonly {
    value: MbtiDimensionValue
    label: string
    hint: string
  }[]
  value: MbtiDimensionValue | null
  onChange: (value: MbtiDimensionValue) => void
}

function DimensionRow({ label, options, value, onChange }: DimensionRowProps) {
  return (
    <div className='flex items-center gap-2'>
      <span className='w-8 shrink-0 text-[11px] font-medium text-[var(--muted)]'>
        {label}
      </span>
      <div className='grid flex-1 grid-cols-2 gap-1.5'>
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type='button'
              onClick={() => onChange(option.value)}
              aria-pressed={isSelected}
              className={cn(
                'flex h-9 items-center justify-center gap-1 rounded-lg text-[12px] transition touch-manipulation',
                isSelected
                  ? 'bg-[var(--foreground)] font-semibold text-white shadow-sm'
                  : 'bg-[#f4f5f7] font-medium text-[var(--foreground)] active:scale-[0.98]',
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wider',
                  isSelected ? 'text-white/70' : 'text-[var(--muted)]',
                )}
              >
                {option.hint}
              </span>
            </button>
          )
        })}
      </div>
    </div>
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
