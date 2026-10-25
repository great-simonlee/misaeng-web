'use client'

import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

interface HousingPricePairProps {
  gross: number
  net: number | null
  size?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'end'
  layout?: 'stack' | 'row'
  accent?: boolean
  className?: string
}

function money(value: number) {
  return `$${value.toLocaleString()}`
}

export function HousingPricePair({
  gross,
  net,
  size = 'md',
  align = 'end',
  layout = 'stack',
  accent = false,
  className,
}: HousingPricePairProps) {
  const t = useT('housing')
  const isRow = layout === 'row' && net != null
  const amountClass =
    size === 'lg'
      ? 'text-[1.35rem] font-semibold tracking-tight'
      : size === 'sm'
        ? 'text-[13px] font-semibold sm:text-[12px]'
        : 'text-[15px] font-semibold sm:text-[13px]'
  const labelClass = cn(
    size === 'lg'
      ? 'text-[11px] font-medium text-[var(--muted)]'
      : size === 'sm'
        ? 'text-[10px] font-medium text-[var(--muted)] sm:text-[9px]'
        : 'text-[10px] font-medium text-[var(--muted)] sm:text-[9px]',
    !isRow && (size === 'lg' ? 'w-9' : 'w-8'),
  )
  const netAmountClass =
    size === 'lg'
      ? 'text-[15px] font-semibold'
      : size === 'sm'
        ? 'text-[12px] font-medium sm:text-[11px]'
        : 'text-[12px] font-medium sm:text-[11px]'

  return (
    <div
      className={cn(
        'inline-flex',
        isRow
          ? 'flex-row flex-wrap items-baseline gap-x-2.5 gap-y-0.5'
          : cn('flex-col gap-0.5', align === 'end' ? 'items-end' : 'items-start'),
        className,
      )}
    >
      <p
        className={cn(
          'flex items-baseline gap-1.5 tabular-nums leading-none',
          amountClass,
          accent ? 'text-brand' : 'text-[var(--foreground)]',
        )}
      >
        <span>{money(gross)}</span>
        <span
          className={cn(
            labelClass,
            accent && 'text-brand/70',
          )}
        >
          {t('price.gross')}
        </span>
      </p>
      {net != null ? (
        <p
          className={cn(
            'flex items-baseline gap-1.5 tabular-nums leading-none text-[var(--muted)]',
            netAmountClass,
          )}
        >
          <span>{money(net)}</span>
          <span className={labelClass}>{t('price.net')}</span>
        </p>
      ) : null}
    </div>
  )
}
