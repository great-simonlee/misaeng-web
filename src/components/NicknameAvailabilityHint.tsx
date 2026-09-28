import { cn } from '@lib'
import type { NicknameAvailability } from '@hooks/useNicknameAvailability'

interface NicknameAvailabilityHintProps {
  availability: NicknameAvailability
  className?: string
}

/** 닉네임 중복 확인 결과 한 줄 안내 */
export function NicknameAvailabilityHint({
  availability,
  className,
}: NicknameAvailabilityHintProps) {
  const { status, message } = availability
  if (status === 'idle') return null

  return (
    <p
      role='status'
      aria-live='polite'
      className={cn(
        'text-[12px] leading-relaxed',
        status === 'available' && 'text-emerald-600',
        (status === 'taken' || status === 'error') && 'text-red-500',
        status === 'checking' && 'text-[var(--muted)]',
        className,
      )}
    >
      {status === 'checking' ? '중복 확인 중…' : message}
    </p>
  )
}
