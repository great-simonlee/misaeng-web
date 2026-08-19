import { getVerifiedSchool } from '@lib/constants/schools'
import { cn } from '@lib'

type SchoolBadgeProps = {
  schoolId?: string | null
  /** short | full — NYU vs New York University */
  variant?: 'short' | 'full'
  className?: string
}

/** 학교 이메일 인증 배지 (예: NYU) */
export function SchoolBadge({
  schoolId,
  variant = 'short',
  className,
}: SchoolBadgeProps) {
  const school = getVerifiedSchool(schoolId)
  if (!school) return null

  const label = variant === 'full' ? school.fullName : school.shortName

  return (
    <span
      title={school.fullName}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-[#57068c]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#57068c]',
        className,
      )}
    >
      {label}
    </span>
  )
}
