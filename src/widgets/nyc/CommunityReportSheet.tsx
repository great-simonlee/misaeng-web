'use client'

import { useState } from 'react'

import { BottomSheet } from '@components'
import { COMMUNITY_REPORT_REASONS } from '@lib/constants/communityEngagement'
import { cn } from '@lib'
import type {
  CommunityEngagementTargetType,
  CommunityReportReason,
} from '@/types/nyc'

type CommunityReportSheetProps = {
  open: boolean
  onClose: () => void
  targetLabel?: string
  submitting?: boolean
  onSubmit: (input: {
    reason: CommunityReportReason
    detail: string
  }) => void | Promise<void>
}

export function CommunityReportSheet({
  open,
  onClose,
  targetLabel = '이 글',
  submitting = false,
  onSubmit,
}: CommunityReportSheetProps) {
  const [reason, setReason] = useState<CommunityReportReason | null>(null)
  const [detail, setDetail] = useState('')

  function handleClose() {
    if (submitting) return
    setReason(null)
    setDetail('')
    onClose()
  }

  async function handleSubmit() {
    if (!reason || submitting) return
    await onSubmit({ reason, detail: detail.trim() })
    setReason(null)
    setDetail('')
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title='신고하기'
      maxHeightClassName='max-h-[min(85dvh,640px)]'
      footer={
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={handleClose}
            disabled={submitting}
            className='h-11 flex-1 rounded-xl border border-black/10 bg-white text-[14px] font-medium text-[var(--muted-foreground)] touch-manipulation disabled:opacity-50'
          >
            취소
          </button>
          <button
            type='button'
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              !reason ||
              (reason === 'other' && !detail.trim())
            }
            className='h-11 flex-1 rounded-xl bg-[#F64310] text-[14px] font-semibold text-white touch-manipulation disabled:opacity-50'
          >
            {submitting ? '접수 중…' : '신고 접수'}
          </button>
        </div>
      }
    >
      <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
        {targetLabel}을(를) 신고합니다. 접수된 신고는 관리자(ellieo-erp)에서
        확인 후 조치됩니다.
      </p>

      <div className='mt-4 space-y-2'>
        {COMMUNITY_REPORT_REASONS.map((item) => {
          const selected = reason === item.value
          return (
            <button
              key={item.value}
              type='button'
              onClick={() => setReason(item.value)}
              className={cn(
                'w-full rounded-xl border px-3.5 py-3 text-left touch-manipulation transition',
                selected
                  ? 'border-[#F64310]/40 bg-[#F64310]/[0.06]'
                  : 'border-black/[0.08] bg-[#fafbfc] hover:border-black/15',
              )}
            >
              <span className='block text-[14px] font-semibold text-[var(--foreground)]'>
                {item.label}
              </span>
              <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>
                {item.description}
              </span>
            </button>
          )
        })}
      </div>

      <label className='mt-4 block'>
        <span className='text-[12px] font-medium text-[var(--muted)]'>
          상세 내용{reason === 'other' ? ' (필수)' : ' (선택)'}
        </span>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder='신고 사유를 조금 더 알려 주세요'
          className='mt-1.5 w-full resize-none rounded-xl border border-black/[0.08] bg-[#fafbfc] px-3.5 py-3 text-[14px] outline-none focus:border-black/20 focus:bg-white'
        />
      </label>
    </BottomSheet>
  )
}

export type CommunityReportTarget = {
  targetType: CommunityEngagementTargetType
  targetId: string
}
