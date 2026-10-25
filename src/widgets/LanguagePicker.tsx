'use client'

import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { LOCALE_NATIVE_NAMES, type Locale } from '@lib/i18n/locales'

/**
 * 선호 언어 고르기 (가입 후 프로필 설정, 마이페이지 언어 설정).
 * 언어 이름은 그 언어 글자로 보여 준다 — 지금 화면 언어를 못 읽는 사람도 자기 언어를 찾을 수 있게.
 */
export function LanguagePicker({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: Locale
  onChange: (locale: Locale) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div role='radiogroup' className={cn('flex flex-wrap gap-2', className)}>
      {BRAND_CONFIG.serviceLocales.map((code) => {
        const selected = code === value
        return (
          <button
            key={code}
            type='button'
            role='radio'
            aria-checked={selected}
            lang={code}
            disabled={disabled}
            onClick={() => onChange(code)}
            className={cn(
              'inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium ring-1 touch-manipulation transition disabled:opacity-50',
              selected
                ? 'bg-brand text-white ring-transparent'
                : 'bg-white text-[var(--foreground)] ring-black/[0.08] hover:bg-[var(--surface)]',
            )}
          >
            {LOCALE_NATIVE_NAMES[code]}
          </button>
        )
      })}
    </div>
  )
}
