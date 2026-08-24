'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  buildCommentThreads,
  createCommunityCommentRequest,
  fetchCommunityComments,
} from '@lib/community/comments.client'
import { createCommunityReportRequest } from '@lib/community/engagement.client'
import { formatCommunityRelativeTime } from '@lib/constants/communityMock'
import { countOpenComments } from '@lib/constants/communityCommentsMock'
import { cn } from '@lib'
import type { CommunityComment, CommunityReportReason } from '@/types/nyc'
import { CommunityReportSheet } from '@widgets/nyc/CommunityReportSheet'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'

type CommunityCommentsSectionProps = {
  postId: string
  boardId: string
  anonymousBoard?: boolean
  loginNext?: string
  onCountChange?: (count: number) => void
}

export function CommunityCommentsSection({
  postId,
  boardId,
  anonymousBoard = false,
  loginNext,
  onCountChange,
}: CommunityCommentsSectionProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCommunityComments(postId)
      setComments(data)
      onCountChange?.(countOpenComments(data))
    } catch (err) {
      toastError(getErrorMessage(err, '댓글을 불러오지 못했어요'))
    } finally {
      setLoading(false)
    }
  }, [onCountChange, postId, toastError])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  const threads = useMemo(() => buildCommentThreads(comments), [comments])
  const totalCount = countOpenComments(comments)
  const loginHref = `/nyc/login?next=${encodeURIComponent(
    loginNext || `/nyc`,
  )}`

  async function submitComment(body: string, parentId: string | null) {
    if (!user?.uid || !user.email) return
    const text = body.trim()
    if (!text) {
      toastError('댓글을 입력해 주세요')
      return
    }

    setSubmitting(true)
    try {
      const created = await createCommunityCommentRequest({
        postId,
        body: text,
        parentId,
        authorUid: user.uid,
        authorEmail: user.email,
        authorNickname: anonymousBoard
          ? null
          : (profile?.nickname ?? null),
        authorSchoolId: anonymousBoard
          ? null
          : (profile?.verifiedSchoolId ?? null),
      })
      setComments((prev) => {
        const next = [...prev.filter((item) => item.id !== created.id), created]
        onCountChange?.(countOpenComments(next))
        return next
      })
      success(parentId ? '답글을 남겼어요' : '댓글을 남겼어요')
      if (parentId) {
        setReplyToId(null)
        setReplyDraft('')
      } else {
        setDraft('')
      }
    } catch (err) {
      toastError(getErrorMessage(err, '댓글 등록에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReportSubmit(input: {
    reason: CommunityReportReason
    detail: string
  }) {
    if (!user?.uid || !user.email || !reportTargetId) return
    setReporting(true)
    try {
      await createCommunityReportRequest({
        reporterUid: user.uid,
        reporterEmail: user.email,
        report: {
          targetType: 'comment',
          targetId: reportTargetId,
          postId,
          boardId,
          reason: input.reason,
          detail: input.detail,
        },
      })
      setReportTargetId(null)
      success('신고가 접수되었어요. 관리자가 확인합니다.')
    } catch (err) {
      toastError(getErrorMessage(err, '신고에 실패했어요'))
    } finally {
      setReporting(false)
    }
  }

  return (
    <BoardSurface as='section' className='mt-5 p-5 sm:mt-6 sm:p-6'>
      <div className='flex items-baseline justify-between gap-3'>
        <h2 className='text-[16px] font-semibold tracking-tight text-[var(--foreground)]'>
          댓글
        </h2>
        <span className='text-[12px] font-medium text-[var(--muted)]'>
          {totalCount}개
        </span>
      </div>

      {!authLoading && !user ? (
        <div className='mt-4 rounded-xl bg-[#f4f5f7] px-4 py-3 text-[13px] text-[var(--muted-foreground)]'>
          댓글을 쓰려면{' '}
          <Link
            href={loginHref}
            className='font-semibold text-[var(--brand)] underline-offset-2 hover:underline'
          >
            로그인
          </Link>
          이 필요해요.
        </div>
      ) : (
        <form
          className='mt-4'
          onSubmit={(e) => {
            e.preventDefault()
            void submitComment(draft, null)
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder='댓글을 남겨 보세요'
            className='w-full resize-none rounded-xl border border-black/[0.07] bg-[#fafbfc] px-3.5 py-3 text-[14px] leading-relaxed outline-none transition placeholder:text-[var(--muted)] focus:border-black/20 focus:bg-white'
          />
          <div className='mt-2 flex justify-end'>
            <button
              type='submit'
              disabled={submitting || !draft.trim()}
              className='inline-flex h-10 items-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-50'
            >
              {submitting ? '등록 중…' : '댓글 등록'}
            </button>
          </div>
        </form>
      )}

      <div className='mt-5 space-y-4 border-t border-black/[0.04] pt-5'>
        {loading && (
          <p className='py-6 text-center text-[13px] text-[var(--muted)]'>
            댓글을 불러오는 중이에요…
          </p>
        )}

        {!loading && threads.length === 0 && (
          <p className='py-6 text-center text-[13px] text-[var(--muted)]'>
            아직 댓글이 없어요. 첫 댓글을 남겨 보세요.
          </p>
        )}

        {!loading &&
          threads.map((thread) => (
            <div key={thread.id} className='space-y-3'>
              <CommentItem
                comment={thread}
                anonymousBoard={anonymousBoard}
                canReport={Boolean(user)}
                loginHref={loginHref}
                onReply={() => {
                  setReplyToId(thread.id)
                  setReplyDraft('')
                }}
                onReport={() => setReportTargetId(thread.id)}
              />

              {thread.replies.length > 0 && (
                <div className='space-y-3 border-l-2 border-[var(--brand)]/20 pl-4 sm:ml-3'>
                  {thread.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      anonymousBoard={anonymousBoard}
                      canReport={Boolean(user)}
                      loginHref={loginHref}
                      isReply
                      onReport={() => setReportTargetId(reply.id)}
                    />
                  ))}
                </div>
              )}

              {replyToId === thread.id && user && (
                <form
                  className='sm:ml-3'
                  onSubmit={(e) => {
                    e.preventDefault()
                    void submitComment(replyDraft, thread.id)
                  }}
                >
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder='답글을 입력하세요'
                    className='w-full resize-none rounded-xl border border-black/[0.07] bg-[#fafbfc] px-3 py-2.5 text-[13px] outline-none focus:border-black/20 focus:bg-white'
                    autoFocus
                  />
                  <div className='mt-2 flex justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setReplyToId(null)
                        setReplyDraft('')
                      }}
                      className='h-9 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                    >
                      취소
                    </button>
                    <button
                      type='submit'
                      disabled={submitting || !replyDraft.trim()}
                      className='h-9 rounded-full bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-white touch-manipulation disabled:opacity-50'
                    >
                      답글 등록
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
      </div>

      <CommunityReportSheet
        open={Boolean(reportTargetId)}
        onClose={() => setReportTargetId(null)}
        targetLabel='이 댓글'
        submitting={reporting}
        onSubmit={handleReportSubmit}
      />
    </BoardSurface>
  )
}

function CommentItem({
  comment,
  anonymousBoard,
  isReply = false,
  canReport = false,
  loginHref,
  onReply,
  onReport,
}: {
  comment: CommunityComment
  anonymousBoard: boolean
  isReply?: boolean
  canReport?: boolean
  loginHref?: string
  onReply?: () => void
  onReport?: () => void
}) {
  const displayName = anonymousBoard
    ? '익명'
    : comment.authorNickname?.trim() ||
      comment.authorEmail.split('@')[0] ||
      '회원'

  return (
    <div className={cn(!isReply && 'rounded-xl bg-[#f4f5f7]/80 p-3.5 sm:p-4')}>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-[13px] font-semibold text-[var(--foreground)]'>
          {displayName}
        </span>
        {!anonymousBoard && <SchoolBadge schoolId={comment.authorSchoolId} />}
        <time className='text-[11px] text-[var(--muted)]'>
          {formatCommunityRelativeTime(comment.createdAt)}
        </time>
      </div>
      <p className='mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--foreground)]'>
        {comment.body}
      </p>
      <div className='mt-2 flex flex-wrap items-center gap-3'>
        {onReply && (
          <button
            type='button'
            onClick={onReply}
            className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--brand)]'
          >
            답글 달기
          </button>
        )}
        {canReport && onReport ? (
          <button
            type='button'
            onClick={onReport}
            className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
          >
            신고
          </button>
        ) : loginHref ? (
          <Link
            href={loginHref}
            className='text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
          >
            신고
          </Link>
        ) : null}
      </div>
    </div>
  )
}
