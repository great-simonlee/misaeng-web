'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@lib'

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

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
        aria-label='닫기'
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

/** Firebase / 일반 Error를 사용자용 한국어 메시지로 변환 */
export function getErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const codeMatch = raw.match(/\(([^)]+)\)/)
  const code = codeMatch?.[1] ?? ''

  const map: Record<string, string> = {
    'auth/popup-closed-by-user': '로그인을 취소했어요',
    'auth/cancelled-popup-request': '로그인을 취소했어요',
    'auth/popup-blocked': '팝업이 차단되었어요. 브라우저 설정을 확인해 주세요',
    'auth/invalid-email': '이메일 형식이 올바르지 않아요',
    'auth/user-disabled': '비활성화된 계정이에요',
    'auth/user-not-found': '등록되지 않은 계정이에요',
    'auth/wrong-password': '비밀번호가 올바르지 않아요',
    'auth/invalid-credential': '이메일 또는 비밀번호를 확인해 주세요',
    'auth/email-already-in-use': '이미 가입된 이메일이에요',
    'auth/weak-password': '비밀번호는 6자 이상으로 설정해 주세요',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 시도해 주세요',
    'auth/network-request-failed': '네트워크 연결을 확인해 주세요',
  }

  if (code && map[code]) return map[code]
  if (raw.includes('popup-closed-by-user')) return map['auth/popup-closed-by-user']
  if (raw.trim()) {
    const cleaned = raw
      .replace(/^Firebase:\s*/i, '')
      .replace(/\s*\([^)]+\)\.?$/, '')
      .trim()
    if (cleaned && cleaned.toLowerCase() !== 'error') return cleaned
  }
  return fallback
}
