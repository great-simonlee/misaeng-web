'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath } from '@lib/constants/cities'
import {
  fetchBeenThereSummary,
  fetchPostRecommendSummary,
  toggleBeenThereRequest,
  togglePostRecommendRequest,
} from '@lib/community/engagement.client'
import { localizeCommunityError } from '@lib/community/client'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'

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
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const { user, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const [count, setCount] = useState(0)
  const [recommendedByMe, setRecommendedByMe] = useState(false)
  const [beenThereCount, setBeenThereCount] = useState(0)
  const [beenThereByMe, setBeenThereByMe] = useState(false)
  const [busy, setBusy] = useState(false)
  const [beenThereBusy, setBeenThereBusy] = useState(false)
  const isFood = boardId === 'food'

  const loginHref = cityLoginPath(
    city,
    loginNext || href(`/${boardId}/${postId}`),
  )

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
      success(
        summary.recommendedByMe
          ? t('engagement.recommended')
          : t('engagement.recommendCancelled'),
      )
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.recommendFailed'),
        ),
      )
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
          ? t('engagement.beenThereAdded')
          : t('engagement.beenThereCancelled'),
      )
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.beenThereFailed'),
        ),
      )
    } finally {
      setBeenThereBusy(false)
    }
  }

  const pillBase =
    'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium touch-manipulation transition disabled:opacity-50'

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {!authLoading && !user ? (
          <Link
            href={loginHref}
            className={cn(
              pillBase,
              'border border-black/[0.07] bg-white text-[var(--muted-foreground)] hover:border-black/12',
            )}
          >
            <RecommendIcon filled={false} />
            {t('engagement.recommend')}
          </Link>
        ) : (
          <button
            type='button'
            onClick={() => void handleRecommend()}
            disabled={busy || authLoading}
            aria-pressed={recommendedByMe}
            className={cn(
              pillBase,
              recommendedByMe
                ? 'bg-[var(--brand-light)] text-[var(--brand)] ring-1 ring-[var(--brand)]/20'
                : 'bg-[#f4f5f7] text-[var(--foreground)] hover:bg-[#eceef1]',
            )}
          >
            <RecommendIcon filled={recommendedByMe} />
            {t('engagement.recommend')}
            <span className='tabular-nums text-[var(--muted)]'>{count}</span>
          </button>
        )}

        {isFood &&
          (!authLoading && !user ? (
            <Link
              href={loginHref}
              className={cn(
                pillBase,
                'border border-black/[0.07] bg-white text-[var(--muted-foreground)] hover:border-black/12',
              )}
            >
              <BeenThereIcon filled={false} />
              {t('engagement.beenThere')}
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => void handleBeenThere()}
              disabled={beenThereBusy || authLoading}
              aria-pressed={beenThereByMe}
              className={cn(
                pillBase,
                beenThereByMe
                  ? 'bg-emerald-500/[0.08] text-emerald-700 ring-1 ring-emerald-500/20'
                  : 'bg-[#f4f5f7] text-[var(--foreground)] hover:bg-[#eceef1]',
              )}
            >
              <BeenThereIcon filled={beenThereByMe} />
              {t('engagement.beenThere')}
              <span className='tabular-nums text-[var(--muted)]'>
                {beenThereCount}
              </span>
            </button>
          ))}

      </div>
    </>
  )
}

function BeenThereIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width='15'
      height='15'
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
      width='15'
      height='15'
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
