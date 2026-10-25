'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { rememberLocale, useLocale, useT } from '@lib/i18n/client'
import { LOCALE_NATIVE_NAMES, type Locale } from '@lib/i18n/locales'
import { isServicePathname, switchLocalePath } from '@lib/i18n/paths'
import { savePreferredLocale } from '@lib/i18n/preference.client'

/**
 * 헤더 언어 메뉴. 로그인하지 않은 방문자도 쓸 수 있고, 로그인했다면 프로필 선호 언어도 같이 바꾼다.
 * `variant='list'`는 모바일 메뉴 안에 펼친 목록으로 그린다.
 */
export function LanguageMenu({
  variant = 'dropdown',
  className,
}: {
  variant?: 'dropdown' | 'list'
  className?: string
}) {
  const locale = useLocale()
  const t = useT('common.language')
  const router = useRouter()
  const { user } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const locales = BRAND_CONFIG.serviceLocales

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 회사·앱 소개 페이지는 영어 한 가지라 언어 메뉴가 없다
  if (locales.length < 2 || !isServicePathname(pathname)) return null

  const choose = (next: Locale) => {
    setOpen(false)
    if (next === locale) return
    rememberLocale(next)
    if (user) void savePreferredLocale(next)
    router.push(`${switchLocalePath(pathname, next)}${window.location.search}`)
  }

  const options = locales.map((code) => (
    <button
      key={code}
      type='button'
      role={variant === 'dropdown' ? 'menuitemradio' : undefined}
      aria-checked={variant === 'dropdown' ? code === locale : undefined}
      lang={code}
      onClick={() => choose(code)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg px-3 text-left touch-manipulation transition',
        variant === 'dropdown' ? 'h-9 text-[13px]' : 'h-11 text-[15px]',
        code === locale
          ? 'font-semibold text-brand'
          : 'text-[var(--foreground)] hover:bg-[var(--surface)]',
      )}
    >
      <span>{LOCALE_NATIVE_NAMES[code]}</span>
      {code === locale ? <CheckIcon /> : null}
    </button>
  ))

  if (variant === 'list') {
    return (
      <div className={className} role='group' aria-label={t('menuAria')}>
        <p className='px-3 pb-1 text-[12px] font-medium text-[var(--muted)]'>{t('label')}</p>
        {options}
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label={t('menuAria')}
        className='inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-[var(--muted-foreground)] touch-manipulation transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
      >
        <GlobeIcon />
        <span lang={locale}>{LOCALE_NATIVE_NAMES[locale]}</span>
      </button>
      {open ? (
        <div
          role='menu'
          className='absolute right-0 top-full z-[10001] mt-1.5 min-w-[11rem] rounded-xl border border-[var(--border)] bg-white p-1 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)]'
        >
          {options}
        </div>
      ) : null}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox='0 0 20 20' fill='none' aria-hidden className='size-4'>
      <circle cx='10' cy='10' r='7.25' stroke='currentColor' strokeWidth='1.5' />
      <path
        d='M2.75 10h14.5M10 2.75c1.9 2 2.9 4.4 2.9 7.25S11.9 15.25 10 17.25C8.1 15.25 7.1 12.85 7.1 10S8.1 4.75 10 2.75Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox='0 0 20 20' fill='none' aria-hidden className='size-4'>
      <path
        d='m5 10.5 3.2 3L15 6.5'
        stroke='currentColor'
        strokeWidth='1.75'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
