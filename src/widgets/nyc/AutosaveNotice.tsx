'use client'

import { formatCommunityRelativeTime } from '@lib/constants/communityMock'
import { cn } from '@lib'

interface AutosaveNoticeProps {
  savedAt: number | null
  className?: string
}

/** 단계 전환 시 이 기기에 자동 저장된다는 안내 + 마지막 저장 시각 */
export function AutosaveNotice({ savedAt, className }: AutosaveNoticeProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-2xl bg-[#f3f8ff] px-3.5 py-3 ring-1 ring-[#2563eb]/10',
        className,
      )}
    >
      <span
        aria-hidden
        className='mt-[5px] size-1.5 shrink-0 rounded-full bg-[#2563eb]'
      />
      <div className='min-w-0 flex-1'>
        <p className='text-[12px] font-semibold text-[#1d4ed8]'>
          작성 내용은 자동으로 저장돼요
        </p>
        <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted-foreground)]'>
          진행 기록을 추가하거나 다음 항목으로 넘어갈 때마다 이 기기에
          저장돼요. 창을 닫았다가 다시 열어도 이어서 쓸 수 있어요.
        </p>
      </div>
      {savedAt ? (
        <span
          aria-live='polite'
          className='shrink-0 self-center text-[11px] font-medium text-[#1d4ed8]'
        >
          저장됨 · {formatCommunityRelativeTime(savedAt)}
        </span>
      ) : null}
    </div>
  )
}
