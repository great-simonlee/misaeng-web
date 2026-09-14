'use client'

import type { ReactNode } from 'react'

import { formatCommunityRelativeTime } from '@lib/constants/communityMock'

type WriteDraftActionsProps = {
  onSave: () => void
  savedAt: number | null
  disabled?: boolean
  children: ReactNode
}

/** 글쓰기 하단: 임시 저장 + 등록 버튼 */
export function WriteDraftActions({
  onSave,
  savedAt,
  disabled,
  children,
}: WriteDraftActionsProps) {
  return (
    <div>
      <div className='flex gap-2'>
        <button
          type='button'
          onClick={onSave}
          disabled={disabled}
          className='inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:bg-[#f7f8fa] disabled:opacity-50 sm:h-12 sm:text-[15px]'
        >
          임시 저장
        </button>
        <div className='min-w-0 flex-[1.6]'>{children}</div>
      </div>
      {savedAt ? (
        <p className='mt-2 text-center text-[12px] text-[var(--muted)]'>
          임시 저장됨 · {formatCommunityRelativeTime(savedAt)}
        </p>
      ) : null}
    </div>
  )
}
