'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { createCommunityReportRequest } from '@lib/community/engagement.client'
import { cn } from '@lib'
import type { CommunityReportReason } from '@/types/nyc'
import { CommunityReportSheet } from '@widgets/nyc/CommunityReportSheet'

type CommunityPostReportActionProps = {
  postId: string
  boardId: string
  loginNext?: string
  className?: string
}

export function CommunityPostReportAction({
  postId,
  boardId,
  loginNext,
  className,
}: CommunityPostReportActionProps) {
  const { user, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const [reportOpen, setReportOpen] = useState(false)
  const [reporting, setReporting] = useState(false)

  const loginHref = `/nyc/login?next=${encodeURIComponent(
    loginNext || `/nyc/${boardId}/${postId}`,
  )}`

  async function handleReportSubmit(input: {
    reason: CommunityReportReason
    detail: string
  }) {
    if (!user?.uid || !user.email) return
    setReporting(true)
    try {
      await createCommunityReportRequest({
        reporterUid: user.uid,
        reporterEmail: user.email,
        report: {
          targetType: 'post',
          targetId: postId,
          postId,
          boardId,
          reason: input.reason,
          detail: input.detail,
        },
      })
      setReportOpen(false)
      success('신고가 접수되었어요. 관리자가 확인합니다.')
    } catch (err) {
      toastError(getErrorMessage(err, '신고에 실패했어요'))
    } finally {
      setReporting(false)
    }
  }

  const actionClass = cn(
    'shrink-0 text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-red-600 disabled:opacity-50',
    className,
  )

  return (
    <>
      {!authLoading && !user ? (
        <Link href={loginHref} className={actionClass}>
          신고
        </Link>
      ) : (
        <button
          type='button'
          onClick={() => setReportOpen(true)}
          disabled={authLoading}
          className={actionClass}
        >
          신고
        </button>
      )}

      <CommunityReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetLabel='이 게시글'
        submitting={reporting}
        onSubmit={handleReportSubmit}
      />
    </>
  )
}
