'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import type { Translate } from '@lib/i18n/translate'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 3200

/**
 * getErrorMessage를 t 없이 부르는 화면용: ToastProvider가 현재 언어의 common 번역기를 등록해 둔다.
 * (ToastProvider는 LocaleProvider 안에 있다)
 */
let activeCommonT: Translate | null = null

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const commonT = useT('common')

  useEffect(() => {
    activeCommonT = commonT
  }, [commonT])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems((prev) => [...prev, { id, message, variant }].slice(-4))
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, 'success'),
      error: (message) => toast(message, 'error'),
      info: (message) => toast(message, 'info'),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className='pointer-events-none fixed inset-x-0 top-[calc(3.5rem+0.75rem)] z-[11000] flex flex-col items-center gap-2 px-4 sm:top-[calc(4rem+0.75rem)]'
        aria-live='polite'
        aria-relevant='additions'
      >
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: () => void
}) {
  const t = useT('common')
  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
        'animate-[toast-in_0.25s_ease-out]',
        item.variant === 'success' &&
          'border-emerald-200/80 bg-white/95 text-emerald-800',
        item.variant === 'error' &&
          'border-red-200/80 bg-white/95 text-red-700',
        item.variant === 'info' &&
          'border-[var(--border)] bg-white/95 text-[var(--foreground)]',
      )}
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none text-white',
          item.variant === 'success' && 'bg-emerald-500',
          item.variant === 'error' && 'bg-red-500',
          item.variant === 'info' && 'bg-[var(--foreground)]',
        )}
        aria-hidden
      >
        {item.variant === 'success' ? '✓' : item.variant === 'error' ? '!' : 'i'}
      </span>
      <p className='min-w-0 flex-1 text-[13px] font-medium leading-none'>
        {item.message}
      </p>
      <button
        type='button'
        onClick={onDismiss}
        className='inline-flex size-6 shrink-0 items-center justify-center text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
        aria-label={t('actions.close')}
      >
        <svg className='size-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M6 18L18 6M6 6l12 12'
          />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast는 ToastProvider 안에서만 사용할 수 있습니다')
  }
  return ctx
}

/** Firebase 에러 코드 → common.ui.authErrors.<key> */
const AUTH_ERROR_KEYS: Record<string, string> = {
  'auth/popup-closed-by-user': 'loginCancelled',
  'auth/cancelled-popup-request': 'loginCancelled',
  'auth/popup-blocked': 'popupBlocked',
  'auth/invalid-email': 'invalidEmail',
  'auth/user-disabled': 'userDisabled',
  'auth/user-not-found': 'userNotFound',
  'auth/wrong-password': 'wrongPassword',
  'auth/invalid-credential': 'invalidCredential',
  'auth/email-already-in-use': 'emailAlreadyInUse',
  'auth/weak-password': 'weakPassword',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'networkRequestFailed',
}

/**
 * Firebase / 일반 Error를 사용자용 메시지로 변환.
 * t는 `useT('common')` 번역기. 생략하면 ToastProvider가 등록한 현재 언어 번역기를 쓴다.
 */
export function getErrorMessage(
  err: unknown,
  fallback: string,
  t?: Translate,
): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const codeMatch = raw.match(/\(([^)]+)\)/)
  const code = codeMatch?.[1] ?? ''
  const translate = t ?? activeCommonT

  const authKey =
    (code && AUTH_ERROR_KEYS[code]) ||
    (raw.includes('popup-closed-by-user') ? 'loginCancelled' : '')
  if (authKey && translate) return translate(`ui.authErrors.${authKey}`)
  if (raw.trim()) {
    const cleaned = raw
      .replace(/^Firebase:\s*/i, '')
      .replace(/\s*\([^)]+\)\.?$/, '')
      .trim()
    if (cleaned && cleaned.toLowerCase() !== 'error') return cleaned
  }
  return fallback
}
