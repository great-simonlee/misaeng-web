import { getFoodCategory } from '@lib/community/food'
import { cn } from '@lib'
import type { FoodCategoryId } from '@/types/nyc'

type BadgeSize = 'sm' | 'md'

interface FoodCategoryBadgeProps {
  categoryId: FoodCategoryId | null | undefined
  size?: BadgeSize
  /** 카드 오버레이용 진한 뱃지 / 본문용 연한 칩 */
  variant?: 'solid' | 'soft'
  className?: string
  showLabel?: boolean
}

export function FoodCategoryBadge({
  categoryId,
  size = 'sm',
  variant = 'solid',
  className,
  showLabel = true,
}: FoodCategoryBadgeProps) {
  const meta = getFoodCategory(categoryId)
  if (!meta) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full font-semibold tracking-tight',
        size === 'sm'
          ? 'h-6 px-2 text-[11px] leading-none'
          : 'h-7 gap-1.5 px-2.5 text-[12px] leading-none',
        variant === 'solid' ? meta.badgeClass : meta.softClass,
        className,
      )}
    >
      <FoodCategoryIcon
        categoryId={meta.id}
        className={size === 'sm' ? 'size-3' : 'size-3.5'}
      />
      {showLabel ? meta.label : null}
    </span>
  )
}

export function FoodCategoryIcon({
  categoryId,
  className,
}: {
  categoryId: FoodCategoryId
  className?: string
}) {
  switch (categoryId) {
    case 'restaurant':
      return <UtensilsIcon className={className} />
    case 'value':
      return <TagIcon className={className} />
    case 'vibe':
      return <SparkleIcon className={className} />
    case 'study':
      return <LaptopIcon className={className} />
  }
}

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2' />
      <path d='M7 2v20' />
      <path d='M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7' />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' />
      <circle cx='7.5' cy='7.5' r='.5' fill='currentColor' />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z' />
      <path d='M20 3v4' />
      <path d='M22 5h-4' />
    </svg>
  )
}

function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55A1 1 0 0 1 20.28 20H3.72a1 1 0 0 1-.9-1.45L4 16' />
    </svg>
  )
}
