'use client'

import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import { cn } from '@lib'

const ORIENTATION_STORAGE_KEY = 'misaeng.nyc.statusWriteOrientation.v1'

const ORIENTATION_STEPS = [
  {
    eyebrow: 'STEP 1',
    title: '날짜별로 남기는 후기예요',
    body: 'CPT · OPT · STEM OPT · 비자 · 영주권 진행을 한 날짜씩 기록해요. 나중에 보는 사람이 순서대로 따라갈 수 있게 남겨 주세요.',
    bullets: [
      '한 글에 날짜 기록을 여러 건 넣을 수 있어요 (최대 8건)',
      '유형을 고른 뒤 제목·회사 정보를 적습니다',
    ],
  },
  {
    eyebrow: 'STEP 2',
    title: '날짜 → 항목 → 내용 순서',
    body: '아래 작성칸에서 날짜를 고르고, 준비·제출·결과·다음 스텝 중 필요한 항목만 선택한 뒤 내용을 적어요.',
    bullets: [
      '빠른 입력 버튼으로 자주 쓰는 단계를 채울 수 있어요',
      '단계 후기만 적어도 기록이 됩니다',
    ],
  },
  {
    eyebrow: 'STEP 3',
    title: '「이 기록 추가」하면 위로 쌓여요',
    body: '작성을 마친 뒤 「이 기록 추가」를 누르면, 그 기록이 작성칸 위 목록으로 올라갑니다. 다음 날짜는 아래 작성칸에서 이어서 적으면 돼요.',
    bullets: [
      '목록에서 수정·삭제가 가능해요',
      '다 적었으면 맨 아래 「후기 등록하기」로 올리세요',
    ],
  },
] as const

function getOrientationSeen(): boolean {
  try {
    return window.localStorage.getItem(ORIENTATION_STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

function subscribeOrientation(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

function markOrientationSeen() {
  try {
    window.localStorage.setItem(ORIENTATION_STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

type CptOptWriteOrientationModalProps = {
  open: boolean
  onClose: () => void
}

/** Status 글쓰기 첫 사용 오리엔테이션 (페이지형 모달) */
export function CptOptWriteOrientationModal({
  open,
  onClose,
}: CptOptWriteOrientationModalProps) {
  const [page, setPage] = useState(0)
  useBodyScrollLock(open)

  if (!open || typeof document === 'undefined') return null

  const step = ORIENTATION_STEPS[page]
  const isLast = page >= ORIENTATION_STEPS.length - 1

  function handleClose() {
    markOrientationSeen()
    setPage(0)
    onClose()
  }

  function handleNext() {
    if (isLast) {
      handleClose()
      return
    }
    setPage((prev) => Math.min(prev + 1, ORIENTATION_STEPS.length - 1))
  }

  return createPortal(
    <div
      className='fixed inset-0 z-[10050] flex items-end justify-center overscroll-none sm:items-center sm:p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='status-write-orientation-title'
    >
      <button
        type='button'
        aria-label='닫기'
        className='absolute inset-0 touch-none bg-black/45 backdrop-blur-[2px]'
        onClick={handleClose}
      />
      <div className='relative z-10 flex max-h-[min(88dvh,560px)] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.14)] sm:rounded-[1.5rem]'>
        <div className='flex shrink-0 flex-col items-center pt-3 sm:pt-4'>
          <span className='h-1 w-10 rounded-full bg-[#e2e5ea] sm:hidden' aria-hidden />
          <div className='mt-3 flex w-full items-center justify-between gap-3 px-5'>
            <p className='text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)]'>
              작성 가이드
            </p>
            <button
              type='button'
              onClick={handleClose}
              className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
            >
              건너뛰기
            </button>
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-4'>
          <p className='text-[11px] font-semibold tracking-[0.12em] text-[var(--brand)]'>
            {step.eyebrow}
          </p>
          <h2
            id='status-write-orientation-title'
            className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]'
          >
            {step.title}
          </h2>
          <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted)]'>
            {step.body}
          </p>
          <ul className='mt-4 space-y-2'>
            {step.bullets.map((item) => (
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

          <div className='mt-6 flex items-center justify-center gap-1.5'>
            {ORIENTATION_STEPS.map((item, index) => (
              <button
                key={item.eyebrow}
                type='button'
                aria-label={`${index + 1}페이지`}
                aria-current={index === page ? 'step' : undefined}
                onClick={() => setPage(index)}
                className={cn(
                  'h-1.5 rounded-full touch-manipulation transition-all',
                  index === page
                    ? 'w-5 bg-[var(--brand)]'
                    : 'w-1.5 bg-[#d7dbe2]',
                )}
              />
            ))}
          </div>
        </div>

        <div className='flex shrink-0 gap-2 border-t border-black/[0.05] px-5 py-4'>
          {page > 0 ? (
            <button
              type='button'
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className='h-11 flex-1 rounded-full bg-[#f4f5f7] text-[14px] font-semibold text-[var(--foreground)] touch-manipulation'
            >
              이전
            </button>
          ) : null}
          <button
            type='button'
            onClick={handleNext}
            className='h-11 flex-[1.4] rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white touch-manipulation hover:bg-[var(--brand-hover)]'
          >
            {isLast ? '작성 시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 첫 작성 시에만 자동으로 열릴지 — localStorage + 세션 dismiss */
export function useStatusWriteOrientation(enabled: boolean) {
  const storedSeen = useSyncExternalStore(
    subscribeOrientation,
    getOrientationSeen,
    () => true,
  )
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  const autoOpen = enabled && !storedSeen && !sessionDismissed
  const open = autoOpen || manualOpen

  function close() {
    markOrientationSeen()
    setSessionDismissed(true)
    setManualOpen(false)
  }

  function openManual() {
    setManualOpen(true)
  }

  return { open, close, openManual }
}
