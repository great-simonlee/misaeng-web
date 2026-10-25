'use client'

import { cn } from '@lib'
import type { NicknameAvailability } from '@hooks/useNicknameAvailability'
import { useT } from '@lib/i18n/client'

interface NicknameAvailabilityHintProps {
  availability: NicknameAvailability
  className?: string
}

/** 닉네임 중복 확인 결과 한 줄 안내 */
export function NicknameAvailabilityHint({
  availability,
  className,
}: NicknameAvailabilityHintProps) {
  const t = useT('common')
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
      {status === 'checking' ? t('ui.nickname.checking') : message}
    </p>
  )
}
