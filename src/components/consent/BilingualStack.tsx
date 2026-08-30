'use client'

import { cn } from '@lib'

type BilingualStackProps = {
  en: string
  ko: string
  as?: 'p' | 'span' | 'div'
  className?: string
  enClassName?: string
  koClassName?: string
}

/** (a) Official English on top, Korean reference underneath. */
export function BilingualStack({
  en,
  ko,
  as: Tag = 'div',
  className,
  enClassName,
  koClassName,
}: BilingualStackProps) {
  return (
    <Tag className={className}>
      <span className={cn('block text-[13px] leading-relaxed text-[var(--foreground)]', enClassName)}>
        {en}
      </span>
      <span
        className={cn(
          'mt-0.5 block text-[12px] leading-relaxed text-[#667085]',
          koClassName,
        )}
      >
        {ko}
      </span>
    </Tag>
  )
}
