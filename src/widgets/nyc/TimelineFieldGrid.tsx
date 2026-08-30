import { cn } from '@lib'

export type TimelineFieldDisplayItem = {
  key: string
  label: string
  value: string
  rowClass: string
  labelClass: string
}

type TimelineFieldGridProps = {
  items: TimelineFieldDisplayItem[]
  className?: string
}

/** 타임라인 카테고리·내용을 2열로 한눈에 보는 그리드 */
export function TimelineFieldGrid({ items, className }: TimelineFieldGridProps) {
  const filled = items.filter((item) => item.value.trim())
  if (filled.length === 0) return null

  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-1.5 sm:grid-cols-2',
        className,
      )}
    >
      {filled.map((item) => (
        <div
          key={item.key}
          className={cn(
            'flex min-w-0 items-baseline gap-2 rounded-lg px-2.5 py-2',
            item.rowClass,
          )}
        >
          <dt
            className={cn(
              'shrink-0 text-[11px] font-semibold tracking-tight',
              item.labelClass,
            )}
          >
            {item.label}
          </dt>
          <dd className='min-w-0 flex-1 text-[13px] leading-snug text-[var(--foreground)]'>
            {item.value.trim()}
          </dd>
        </div>
      ))}
    </dl>
  )
}
