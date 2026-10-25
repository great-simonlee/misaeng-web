'use client'

import { useState } from 'react'

import { BottomSheet } from '@components'
import { COMMUNITY_REPORT_REASONS } from '@lib/constants/communityEngagement'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'
import type {
  CommunityEngagementTargetType,
  CommunityReportReason,
} from '@/types/nyc'

type CommunityReportSheetProps = {
  open: boolean
  onClose: () => void
  /** 안내 문구의 신고 대상 (이 게시글 / 이 댓글 / 이 글) */
  target?: 'post' | 'comment' | 'generic'
  submitting?: boolean
  onSubmit: (input: {
    reason: CommunityReportReason
    detail: string
  }) => void | Promise<void>
}

export function CommunityReportSheet({
  open,
  onClose,
  target = 'generic',
  submitting = false,
  onSubmit,
}: CommunityReportSheetProps) {
  const t = useT('community')
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
      title={t('report.title')}
      maxHeightClassName='max-h-[min(85dvh,640px)]'
      footer={
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={handleClose}
            disabled={submitting}
            className='h-11 flex-1 rounded-xl border border-black/10 bg-white text-[14px] font-medium text-[var(--muted-foreground)] touch-manipulation disabled:opacity-50'
          >
            {t('report.cancel')}
          </button>
          <button
            type='button'
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              !reason ||
              (reason === 'other' && !detail.trim())
            }
            className='h-11 flex-1 rounded-xl bg-brand text-[14px] font-semibold text-white touch-manipulation disabled:opacity-50'
          >
            {submitting ? t('report.submitting') : t('report.submit')}
          </button>
        </div>
      }
    >
      <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
        {t(`report.intro.${target}`)}
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
                  ? 'border-brand/40 bg-brand/[0.06]'
                  : 'border-black/[0.08] bg-[#fafbfc] hover:border-black/15',
              )}
            >
              <span className='block text-[14px] font-semibold text-[var(--foreground)]'>
                {t(`report.reasons.${item.value}.label`)}
              </span>
              <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>
                {t(`report.reasons.${item.value}.description`)}
              </span>
            </button>
          )
        })}
      </div>

      <label className='mt-4 block'>
        <span className='text-[12px] font-medium text-[var(--muted)]'>
          {reason === 'other'
            ? t('report.detailLabelRequired')
            : t('report.detailLabelOptional')}
        </span>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('report.detailPlaceholder')}
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
