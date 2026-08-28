'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { COMMUNITY_CREDIT_REVIEW_BONUS } from '@lib/constants/communityCredit'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { cn } from '@lib'
import { MyPageSkeleton } from '@widgets/nyc/MyPageSkeleton'

type ReviewRequest = {
  id: string
  postId: string
  boardId: string
  postTitle: string
  authorUid: string
  authorEmail: string
  authorNickname: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  rejectReason: string | null
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function CreditReviewsScreen() {
  const { user, loading, sessionLoading, isMisaengUser } = useAuth()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [requests, setRequests] = useState<ReviewRequest[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setListLoading(true)
    try {
      const qs = filter === 'pending' ? '?status=pending' : ''
      const res = await fetch(`/api/community/credit-reviews${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => null)) as {
        requests?: ReviewRequest[]
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error || '목록을 불러오지 못했어요')
      }
      setRequests(Array.isArray(data?.requests) ? data.requests : [])
    } catch (err) {
      toastError(getErrorMessage(err, '목록을 불러오지 못했어요'))
      setRequests([])
    } finally {
      setListLoading(false)
    }
  }, [filter, toastError])

  useEffect(() => {
    if (loading || sessionLoading) return
    if (!user) {
      router.replace(
        `/nyc/login?next=${encodeURIComponent('/nyc/team/credit-reviews')}`,
      )
      return
    }
    if (!isMisaengUser) {
      router.replace('/nyc')
    }
  }, [user, loading, sessionLoading, isMisaengUser, router])

  useEffect(() => {
    if (!isMisaengUser) return
    void load()
  }, [isMisaengUser, load])

  async function decide(requestId: string, action: 'approve' | 'reject') {
    let rejectReason: string | undefined
    if (action === 'reject') {
      const input = window.prompt('반려 사유 (선택)')
      if (input === null) return
      rejectReason = input.trim() || undefined
    } else {
      const ok = window.confirm(
        `이 글을 승인하고 +${COMMUNITY_CREDIT_REVIEW_BONUS} 크레딧을 지급할까요?`,
      )
      if (!ok) return
    }

    setActingId(requestId)
    try {
      const res = await fetch('/api/community/credit-reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, rejectReason }),
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error || '처리에 실패했어요')
      }
      success(action === 'approve' ? '승인 · 크레딧 지급 완료' : '반려 처리했어요')
      await load()
    } catch (err) {
      toastError(getErrorMessage(err, '처리에 실패했어요'))
    } finally {
      setActingId(null)
    }
  }

  if (loading || sessionLoading || !user || !isMisaengUser) {
    return <MyPageSkeleton />
  }

  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_50%)]'>
      <div className={cn('pb-16 pt-8 sm:pt-10', NYC_PAGE_SHELL_CLASS)}>
        <p className='text-[11px] font-medium tracking-[0.18em] text-[var(--muted)]'>
          TEAM
        </p>
        <h1 className='mt-1.5 text-[1.5rem] font-semibold tracking-tight text-[var(--foreground)]'>
          크레딧 리뷰
        </h1>
        <p className='mt-2 max-w-xl text-[14px] text-[var(--muted-foreground)]'>
          최종 결과가 담긴 OPT·취업 후기를 검토한 뒤 추가 +
          {COMMUNITY_CREDIT_REVIEW_BONUS} 크레딧을 지급합니다.
        </p>

        <div className='mt-6 flex gap-2'>
          <button
            type='button'
            onClick={() => setFilter('pending')}
            className={cn(
              'h-9 rounded-full px-4 text-[13px] font-semibold',
              filter === 'pending'
                ? 'bg-[var(--foreground)] text-white'
                : 'bg-white text-[var(--muted)] ring-1 ring-black/[0.06]',
            )}
          >
            대기
          </button>
          <button
            type='button'
            onClick={() => setFilter('all')}
            className={cn(
              'h-9 rounded-full px-4 text-[13px] font-semibold',
              filter === 'all'
                ? 'bg-[var(--foreground)] text-white'
                : 'bg-white text-[var(--muted)] ring-1 ring-black/[0.06]',
            )}
          >
            전체
          </button>
        </div>

        <div className='mt-6 space-y-3'>
          {listLoading ? (
            <div className='space-y-3'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className='h-28 animate-pulse rounded-2xl bg-white ring-1 ring-black/[0.04]'
                />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <p className='rounded-2xl bg-white px-5 py-10 text-center text-[14px] text-[var(--muted)] ring-1 ring-black/[0.04]'>
              {filter === 'pending'
                ? '대기 중인 요청이 없어요.'
                : '요청 내역이 없어요.'}
            </p>
          ) : (
            requests.map((item) => (
              <article
                key={item.id}
                className='rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.05]'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]'>
                      {item.boardId} · {item.status}
                    </p>
                    <Link
                      href={`/nyc/${item.boardId === 'cpt-opt' ? 'status' : item.boardId}/${item.postId}`}
                      className='mt-1 block text-[15px] font-semibold text-[var(--foreground)] hover:underline'
                    >
                      {item.postTitle}
                    </Link>
                    <p className='mt-1 text-[12px] text-[var(--muted)]'>
                      {item.authorNickname || item.authorEmail} ·{' '}
                      {formatTime(item.createdAt)}
                    </p>
                    {item.rejectReason ? (
                      <p className='mt-1 text-[12px] text-[var(--muted)]'>
                        반려: {item.rejectReason}
                      </p>
                    ) : null}
                  </div>
                  {item.status === 'pending' ? (
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        disabled={actingId === item.id}
                        onClick={() => void decide(item.id, 'approve')}
                        className='h-9 rounded-full bg-[var(--brand)] px-3.5 text-[12px] font-semibold text-white disabled:opacity-50'
                      >
                        승인 +{COMMUNITY_CREDIT_REVIEW_BONUS}
                      </button>
                      <button
                        type='button'
                        disabled={actingId === item.id}
                        onClick={() => void decide(item.id, 'reject')}
                        className='h-9 rounded-full border border-[var(--border)] bg-white px-3.5 text-[12px] font-semibold text-[var(--foreground)] disabled:opacity-50'
                      >
                        반려
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
