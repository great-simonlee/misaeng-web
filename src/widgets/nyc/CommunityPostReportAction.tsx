'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath } from '@lib/constants/cities'
import { localizeCommunityError } from '@lib/community/client'
import { createCommunityReportRequest } from '@lib/community/engagement.client'
import { useT } from '@lib/i18n/client'
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
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const { user, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const [reportOpen, setReportOpen] = useState(false)
  const [reporting, setReporting] = useState(false)

  const loginHref = cityLoginPath(
    city,
    loginNext || href(`/${boardId}/${postId}`),
  )

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
      success(t('report.submitted'))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.reportFailed'),
        ),
      )
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
          {t('report.action')}
        </Link>
      ) : (
        <button
          type='button'
          onClick={() => setReportOpen(true)}
          disabled={authLoading}
          className={actionClass}
        >
          {t('report.action')}
        </button>
      )}

      <CommunityReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        target='post'
        submitting={reporting}
        onSubmit={handleReportSubmit}
      />
    </>
  )
}
