'use client'

import { cn } from '@lib'

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  valueMin: number
  valueMax: number
  onChange: (next: { min: number; max: number }) => void
  formatValue?: (value: number) => string
  className?: string
}

export function RangeSlider({
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  formatValue = (value) => String(value),
  className,
}: RangeSliderProps) {
  const span = Math.max(max - min, 1)
  const leftPct = ((valueMin - min) / span) * 100
  const rightPct = ((valueMax - min) / span) * 100

  function handleMin(raw: number) {
    const next = Math.min(raw, valueMax - step)
    onChange({ min: Math.max(min, next), max: valueMax })
  }

  function handleMax(raw: number) {
    const next = Math.max(raw, valueMin + step)
    onChange({ min: valueMin, max: Math.min(max, next) })
  }

  return (
    <div className={cn('select-none', className)}>
      <div className='flex items-end justify-between gap-3'>
        <p className='text-[18px] font-semibold tabular-nums tracking-tight text-[var(--foreground)]'>
          {formatValue(valueMin)}
        </p>
        <span className='mb-1 h-px w-4 bg-[#d8dbe0]' aria-hidden />
        <p className='text-right text-[18px] font-semibold tabular-nums tracking-tight text-[var(--foreground)]'>
          {formatValue(valueMax)}
        </p>
      </div>

      <div className='relative mt-4 h-7'>
        <div
          className='absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#e8eaed]'
          aria-hidden
        />
        <div
          className='absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--foreground)]'
          style={{ left: `${leftPct}%`, width: `${Math.max(rightPct - leftPct, 0)}%` }}
          aria-hidden
        />
        <input
          type='range'
          min={min}
          max={max}
          step={step}
          value={valueMin}
          aria-label='최소 가격'
          onChange={(event) => handleMin(Number(event.target.value))}
          className={rangeThumbClass}
        />
        <input
          type='range'
          min={min}
          max={max}
          step={step}
          value={valueMax}
          aria-label='최대 가격'
          onChange={(event) => handleMax(Number(event.target.value))}
          className={rangeThumbClass}
        />
      </div>
    </div>
  )
}

const rangeThumbClass =
  'pointer-events-none absolute inset-0 z-10 h-7 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_6px_rgba(15,23,42,0.22)] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-webkit-slider-thumb]:mt-[-10px] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_6px_rgba(15,23,42,0.22)]'
