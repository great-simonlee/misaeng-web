'use client'

import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import {
  ANONYMOUS_WRITING_GUIDELINE_KEYS,
  COMMUNITY_WRITING_GUIDELINE_KEYS,
} from '@lib/constants/communityGuidelines'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'

const SNOOZE_STORAGE_KEY = 'misaeng.nyc.anonymousBoardNotice.snoozeUntil'
const DAY_MS = 24 * 60 * 60 * 1000

const NOTICE_BULLET_KEYS = [
  ...ANONYMOUS_WRITING_GUIDELINE_KEYS.map((key) => `guidelines.anonymous.${key}`),
  ...COMMUNITY_WRITING_GUIDELINE_KEYS.slice(0, 2).map(
    (key) => `guidelines.common.${key}`,
  ),
]

function readSnoozeUntil(): number {
  try {
    const raw = window.localStorage.getItem(SNOOZE_STORAGE_KEY)
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function isSnoozedNow(): boolean {
  return Date.now() < readSnoozeUntil()
}

function subscribeSnooze(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

function snoozeFor24Hours() {
  try {
    window.localStorage.setItem(
      SNOOZE_STORAGE_KEY,
      String(Date.now() + DAY_MS),
    )
  } catch {
    /* ignore */
  }
}

type AnonymousBoardNoticeModalProps = {
  open: boolean
  onClose: () => void
  onSnooze24h: () => void
}

/** 익명게시판 이용 주의사항 모달 (Status 작성 가이드와 동일한 톤) */
export function AnonymousBoardNoticeModal({
  open,
  onClose,
  onSnooze24h,
}: AnonymousBoardNoticeModalProps) {
  const t = useT('community')
  useBodyScrollLock(open)

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className='fixed inset-0 z-[10050] flex items-end justify-center overscroll-none sm:items-center sm:p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='anonymous-board-notice-title'
    >
      <button
        type='button'
        aria-label={t('anonymousNotice.close')}
        className='absolute inset-0 touch-none bg-black/45 backdrop-blur-[2px]'
        onClick={onClose}
      />
      <div className='relative z-10 flex max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.14)] sm:rounded-[1.5rem]'>
        <div className='flex shrink-0 flex-col items-center pt-3 sm:pt-4'>
          <span
            className='h-1 w-10 rounded-full bg-[#e2e5ea] sm:hidden'
            aria-hidden
          />
          <div className='mt-3 flex w-full items-center justify-between gap-3 px-5'>
            <p className='text-[12px] font-semibold text-[var(--brand)]'>
              {t('anonymousNotice.board')}
            </p>
            <button
              type='button'
              onClick={onClose}
              className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
            >
              {t('anonymousNotice.close')}
            </button>
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-2'>
          <h2
            id='anonymous-board-notice-title'
            className='text-[1.3rem] font-bold tracking-[-0.03em] text-[var(--foreground)]'
          >
            {t('anonymousNotice.title')}
          </h2>
          <p className='mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]'>
            {t('anonymousNotice.body', { brand: BRAND_CONFIG.name })}
          </p>
          <ul className='mt-4 space-y-2.5 rounded-2xl bg-[#f7f8fa] px-4 py-3.5 ring-1 ring-black/[0.04]'>
            {NOTICE_BULLET_KEYS.map((item) => (
              <li
                key={item}
                className='flex gap-2.5 text-[13px] leading-snug text-[var(--foreground)]'
              >
                <span
                  className='mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-[var(--brand)]'
                  aria-hidden
                />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className='flex shrink-0 gap-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3'>
          <button
            type='button'
            onClick={onClose}
            className='order-2 h-11 flex-1 rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--brand-hover)]'
          >
            {t('anonymousNotice.confirm')}
          </button>
          <button
            type='button'
            onClick={onSnooze24h}
            className={cn(
              'order-1 h-11 flex-1 rounded-full bg-[#f4f5f7] text-[13px] font-semibold text-[var(--foreground)] touch-manipulation',
              'hover:bg-[#eceef1]',
            )}
          >
            {t('anonymousNotice.snooze24h')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 익명게시판 목록 진입 시 주의사항 모달 — 기본은 매번, 스누즈 시에만 24시간 숨김 */
export function useAnonymousBoardNotice(enabled: boolean) {
  const snoozed = useSyncExternalStore(
    subscribeSnooze,
    isSnoozedNow,
    () => true,
  )
  const [sessionDismissed, setSessionDismissed] = useState(false)

  const open = enabled && !snoozed && !sessionDismissed

  function close() {
    setSessionDismissed(true)
  }

  function snooze24h() {
    snoozeFor24Hours()
    setSessionDismissed(true)
  }

  return { open, close, snooze24h }
}
