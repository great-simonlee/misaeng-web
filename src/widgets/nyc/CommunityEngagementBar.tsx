'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  createCommunityReportRequest,
  fetchBeenThereSummary,
  fetchPostRecommendSummary,
  toggleBeenThereRequest,
  togglePostRecommendRequest,
} from '@lib/community/engagement.client'
import { cn } from '@lib'
import type { CommunityReportReason } from '@/types/nyc'
import { CommunityReportSheet } from '@widgets/nyc/CommunityReportSheet'

type CommunityEngagementBarProps = {
  postId: string
  boardId: string
  loginNext?: string
  className?: string
}

export function CommunityEngagementBar({
  postId,
  boardId,
  loginNext,
  className,
}: CommunityEngagementBarProps) {
  const { user, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const [count, setCount] = useState(0)
  const [recommendedByMe, setRecommendedByMe] = useState(false)
  const [beenThereCount, setBeenThereCount] = useState(0)
  const [beenThereByMe, setBeenThereByMe] = useState(false)
  const [busy, setBusy] = useState(false)
  const [beenThereBusy, setBeenThereBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const isFood = boardId === 'food'

  const loginHref = `/nyc/login?next=${encodeURIComponent(
    loginNext || `/nyc/${boardId}/${postId}`,
  )}`

  const loadSummary = useCallback(async () => {
    try {
      const summary = await fetchPostRecommendSummary(postId, user?.uid)
      setCount(summary.count)
      setRecommendedByMe(summary.recommendedByMe)
    } catch {
      // 초기 로드 실패는 조용히 무시
    }
    if (boardId !== 'food') return
    try {
      const visited = await fetchBeenThereSummary(postId, user?.uid)
      setBeenThereCount(visited.count)
      setBeenThereByMe(visited.beenThereByMe)
    } catch {
      // 초기 로드 실패는 조용히 무시
    }
  }, [boardId, postId, user?.uid])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  async function handleRecommend() {
    if (!user?.uid) return
    setBusy(true)
    try {
      const summary = await togglePostRecommendRequest({
        postId,
        boardId,
        authorUid: user.uid,
      })
      setCount(summary.count)
      setRecommendedByMe(summary.recommendedByMe)
      success(summary.recommendedByMe ? '추천했어요' : '추천을 취소했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '추천에 실패했어요'))
    } finally {
      setBusy(false)
    }
  }

  async function handleBeenThere() {
    if (!user?.uid) return
    setBeenThereBusy(true)
    try {
      const summary = await toggleBeenThereRequest({
        postId,
        boardId,
        authorUid: user.uid,
      })
      setBeenThereCount(summary.count)
      setBeenThereByMe(summary.beenThereByMe)
      success(
        summary.beenThereByMe
          ? '나도 가봤어요를 남겼어요'
          : '가봤어요를 취소했어요',
      )
    } catch (err) {
      toastError(getErrorMessage(err, '가봤어요에 실패했어요'))
    } finally {
      setBeenThereBusy(false)
    }
  }

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

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          className,
        )}
      >
        {!authLoading && !user ? (
          <Link
            href={loginHref}
            className='inline-flex h-10 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 text-[13px] font-medium text-[var(--muted-foreground)] touch-manipulation hover:border-black/15'
          >
            추천하려면 로그인
          </Link>
        ) : (
          <button
            type='button'
            onClick={() => void handleRecommend()}
            disabled={busy || authLoading}
            aria-pressed={recommendedByMe}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold touch-manipulation transition disabled:opacity-50',
              recommendedByMe
                ? 'border-[var(--brand)]/35 bg-[var(--brand-light)] text-[var(--brand)]'
                : 'border-black/[0.07] bg-[#fafbfc] text-[var(--foreground)] hover:border-black/15 hover:bg-white',
            )}
          >
            <RecommendIcon filled={recommendedByMe} />
            추천
            <span
              className={cn(
                'tabular-nums',
                recommendedByMe ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
              )}
            >
              {count}
            </span>
          </button>
        )}

        {isFood &&
          (!authLoading && !user ? (
            <Link
              href={loginHref}
              className='inline-flex h-10 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 text-[13px] font-medium text-[var(--muted-foreground)] touch-manipulation hover:border-black/15'
            >
              <BeenThereIcon filled={false} />
              나도 가봤어요
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => void handleBeenThere()}
              disabled={beenThereBusy || authLoading}
              aria-pressed={beenThereByMe}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold touch-manipulation transition disabled:opacity-50',
                beenThereByMe
                  ? 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-700'
                  : 'border-black/[0.08] bg-white text-[var(--foreground)] hover:border-black/15',
              )}
            >
              <BeenThereIcon filled={beenThereByMe} />
              나도 가봤어요
              <span
                className={cn(
                  'tabular-nums',
                  beenThereByMe ? 'text-emerald-700' : 'text-[var(--muted)]',
                )}
              >
                {beenThereCount}
              </span>
            </button>
          ))}

        {!authLoading && !user ? (
          <Link
            href={loginHref}
            className='inline-flex h-10 items-center rounded-full px-3 text-[13px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
          >
            신고
          </Link>
        ) : (
          <button
            type='button'
            onClick={() => setReportOpen(true)}
            disabled={authLoading}
            className='inline-flex h-10 items-center rounded-full px-3 text-[13px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600 disabled:opacity-50'
          >
            신고
          </button>
        )}
      </div>

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

function BeenThereIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
      <circle cx='12' cy='10' r='3' fill={filled ? 'white' : 'none'} />
    </svg>
  )
}

function RecommendIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M7 10v12' />
      <path d='M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z' />
    </svg>
  )
}
