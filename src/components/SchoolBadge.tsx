import { getVerifiedSchool } from '@lib/constants/schools'
import { cn } from '@lib'

type SchoolBadgeProps = {
  schoolId?: string | null
  /** short | full — NYU vs New York University */
  variant?: 'short' | 'full'
  /** sm: 인라인 소형 / md: 메타 칩 / author: 작성자 옆 인증 배지 */
  size?: 'sm' | 'md' | 'author'
  className?: string
}

/** 학교 이메일 인증 배지 (예: NYU) */
export function SchoolBadge({
  schoolId,
  variant = 'short',
  size = 'sm',
  className,
}: SchoolBadgeProps) {
  const school = getVerifiedSchool(schoolId)
  if (!school) return null

  const label = variant === 'full' ? school.fullName : school.shortName
  const showVerified = size === 'md' || size === 'author'

  return (
    <span
      title={`${school.fullName} · 학교 이메일 인증`}
      aria-label={`${school.fullName} 인증`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[#57068c]',
        size === 'author' &&
          'h-5 gap-0.5 bg-[#57068c]/[0.09] pl-1 pr-1.5 text-[10px] font-bold leading-none tracking-wide ring-1 ring-[#57068c]/12',
        size === 'md' &&
          'gap-0.5 bg-[#57068c]/[0.08] px-2.5 py-1 text-[11px] font-semibold ring-1 ring-[#57068c]/15',
        size === 'sm' &&
          'bg-[#57068c]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide',
        className,
      )}
    >
      {showVerified ? (
        <VerifiedMark
          className={cn(
            size === 'md' || size === 'author' ? 'size-2.5' : 'size-3',
            'opacity-90',
          )}
        />
      ) : null}
      {label}
    </span>
  )
}

function VerifiedMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 16 16'
      fill='currentColor'
      aria-hidden
      className={className}
    >
      <path d='M8 1.25a6.75 6.75 0 1 0 0 13.5A6.75 6.75 0 0 0 8 1.25Zm3.03 4.72a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06L7 8.94l2.97-2.97a.75.75 0 0 1 1.06 0Z' />
    </svg>
  )
}
