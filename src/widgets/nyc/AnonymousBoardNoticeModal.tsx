'use client'

import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import {
  ANONYMOUS_WRITING_GUIDELINES,
  COMMUNITY_WRITING_GUIDELINES,
} from '@lib/constants/communityGuidelines'
import { cn } from '@lib'

const SNOOZE_STORAGE_KEY = 'misaeng.nyc.anonymousBoardNotice.snoozeUntil'
const DAY_MS = 24 * 60 * 60 * 1000

const NOTICE_BULLETS = [
  ...ANONYMOUS_WRITING_GUIDELINES,
  ...COMMUNITY_WRITING_GUIDELINES.slice(0, 2),
] as const

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
        aria-label='닫기'
        className='absolute inset-0 touch-none bg-black/45 backdrop-blur-[2px]'
        onClick={onClose}
      />
      <div className='relative z-10 flex max-h-[min(88dvh,560px)] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.14)] sm:rounded-[1.5rem]'>
        <div className='flex shrink-0 flex-col items-center pt-3 sm:pt-4'>
          <span
            className='h-1 w-10 rounded-full bg-[#e2e5ea] sm:hidden'
            aria-hidden
          />
          <div className='mt-3 flex w-full items-center justify-between gap-3 px-5'>
            <p className='text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)]'>
              이용 주의사항
            </p>
            <button
              type='button'
              onClick={onClose}
              className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
            >
              닫기
            </button>
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-4'>
          <p className='text-[11px] font-semibold tracking-[0.12em] text-[var(--brand)]'>
            익명게시판
          </p>
          <h2
            id='anonymous-board-notice-title'
            className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]'
          >
            함께 지키는 익명 공간
          </h2>
          <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted)]'>
            미생의 건강하고 생산적인 커뮤니티의 발전을 위해, 익명게시판에서도
            서로를 존중하는 이용 규칙을 지켜 주세요!
          </p>
          <ul className='mt-4 space-y-2'>
            {NOTICE_BULLETS.map((item) => (
              <li
                key={item}
                className='flex gap-2.5 rounded-xl bg-[#f7f8fa] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--foreground)] ring-1 ring-black/[0.04]'
              >
                <span
                  className='mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]'
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className='flex shrink-0 flex-col gap-2 border-t border-black/[0.05] px-5 py-4'>
          <button
            type='button'
            onClick={onClose}
            className='h-11 w-full rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--brand-hover)]'
          >
            확인했어요
          </button>
          <button
            type='button'
            onClick={onSnooze24h}
            className={cn(
              'h-11 w-full rounded-full bg-[#f4f5f7] text-[13px] font-semibold text-[var(--foreground)] touch-manipulation',
              'hover:bg-[#eceef1]',
            )}
          >
            24시간 동안 보지 않기
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
