'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath, hrefForCommunityPost } from '@lib/constants/cities'
import { COMMUNITY_CREDIT_REVIEW_BONUS } from '@lib/constants/communityCredit'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { useFormat, useT } from '@lib/i18n/client'
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

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

export function CreditReviewsScreen() {
  const { user, loading, sessionLoading, isMisaengUser } = useAuth()
  const city = useCity()
  const href = useCityPath()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const t = useT('credit')
  const format = useFormat()
  const bonus = format.number(COMMUNITY_CREDIT_REVIEW_BONUS)
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
        throw new Error(data?.error || t('reviews.loadFailed'))
      }
      setRequests(Array.isArray(data?.requests) ? data.requests : [])
    } catch (err) {
      toastError(getErrorMessage(err, t('reviews.loadFailed')))
      setRequests([])
    } finally {
      setListLoading(false)
    }
  }, [filter, toastError, t])

  useEffect(() => {
    if (loading || sessionLoading) return
    if (!user) {
      router.replace(cityLoginPath(city, href('/team/credit-reviews')))
      return
    }
    if (!isMisaengUser) {
      router.replace(href())
    }
  }, [user, loading, sessionLoading, isMisaengUser, router, city, href])

  useEffect(() => {
    if (!isMisaengUser) return
    void load()
  }, [isMisaengUser, load])

  async function decide(requestId: string, action: 'approve' | 'reject') {
    let rejectReason: string | undefined
    if (action === 'reject') {
      const input = window.prompt(t('reviews.rejectPrompt'))
      if (input === null) return
      rejectReason = input.trim() || undefined
    } else {
      const ok = window.confirm(
        t('reviews.approveConfirm', { amount: bonus }),
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
        throw new Error(data?.error || t('reviews.actionFailed'))
      }
      success(action === 'approve' ? t('reviews.approved') : t('reviews.rejected'))
      await load()
    } catch (err) {
      toastError(getErrorMessage(err, t('reviews.actionFailed')))
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
          {t('reviews.title')}
        </h1>
        <p className='mt-2 max-w-xl text-[14px] text-[var(--muted-foreground)]'>
          {t('reviews.description', { amount: bonus })}
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
            {t('reviews.filterPending')}
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
            {t('reviews.filterAll')}
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
                ? t('reviews.emptyPending')
                : t('reviews.emptyAll')}
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
                      href={hrefForCommunityPost(
                        {
                          id: item.postId,
                          categoryId: item.boardId,
                        },
                        city,
                      )}
                      className='mt-1 block text-[15px] font-semibold text-[var(--foreground)] hover:underline'
                    >
                      {item.postTitle || t('reviews.untitled')}
                    </Link>
                    <p className='mt-1 text-[12px] text-[var(--muted)]'>
                      {item.authorNickname || item.authorEmail} ·{' '}
                      {format.date(item.createdAt, TIME_FORMAT)}
                    </p>
                    {item.rejectReason ? (
                      <p className='mt-1 text-[12px] text-[var(--muted)]'>
                        {t('reviews.rejectReasonLabel', { reason: item.rejectReason })}
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
                        {t('reviews.approveButton', { amount: bonus })}
                      </button>
                      <button
                        type='button'
                        disabled={actingId === item.id}
                        onClick={() => void decide(item.id, 'reject')}
                        className='h-9 rounded-full border border-[var(--border)] bg-white px-3.5 text-[12px] font-semibold text-[var(--foreground)] disabled:opacity-50'
                      >
                        {t('reviews.rejectButton')}
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
