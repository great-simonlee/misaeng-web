import { cn } from '@lib'

export function AccountCategorySideItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-[13px] font-medium touch-manipulation transition',
        active
          ? 'bg-[var(--foreground)] text-white'
          : 'text-[var(--foreground)] hover:bg-[#f4f5f7]',
      )}
    >
      <span className='truncate'>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          active ? 'text-white/65' : 'text-[var(--muted)]',
        )}
      >
        {count}
      </span>
    </button>
  )
}

export function AccountCategoryChip({
  label,
  active,
  count,
  onClick,
  variant = 'chip',
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
  variant?: 'lead' | 'chip'
}) {
  return (
    <button
      type='button'
      role='option'
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] leading-none touch-manipulation transition sm:px-3.5 sm:text-[13px]',
        variant === 'lead' ? 'font-semibold' : 'font-medium',
        active
          ? 'border-[var(--foreground)] bg-white text-[var(--foreground)]'
          : 'border-[#dddddd] bg-white text-[var(--foreground)] hover:border-[#b0b0b0]',
      )}
    >
      {label}
      <span className='tabular-nums text-[var(--muted)]'>{count}</span>
    </button>
  )
}
