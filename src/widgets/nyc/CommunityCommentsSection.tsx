'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { SchoolBadge, UserAvatar } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { maskAnonymousDisplayName } from '@lib/community/anonymous'
import {
  buildCommentThreads,
  createCommunityCommentRequest,
  deleteCommunityCommentRequest,
  fetchCommunityComments,
  updateCommunityCommentRequest,
} from '@lib/community/comments.client'
import { createCommunityReportRequest } from '@lib/community/engagement.client'
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  getSchoolVerifyHref,
  isAccountSuspended,
  isSchoolVerified,
  SCHOOL_VERIFY_REQUIRED_MESSAGE,
} from '@lib/community/schoolGate'
import { formatCommunityRelativeTime } from '@lib/constants/communityMock'
import { countOpenComments } from '@lib/constants/communityCommentsMock'
import { cn } from '@lib'
import type { CommunityComment, CommunityReportReason } from '@/types/nyc'
import { CommunityReportSheet } from '@widgets/nyc/CommunityReportSheet'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

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
  const schoolVerified = isSchoolVerified(profile)
  const schoolVerifyHref = getSchoolVerifyHref(loginNext || `/nyc`)
  const canCompose = Boolean(user) && schoolVerified && !isAccountSuspended(profile)

  async function submitComment(body: string, parentId: string | null) {
    if (!user?.uid || !user.email) return
    if (isAccountSuspended(profile)) {
      toastError(ACCOUNT_SUSPENDED_MESSAGE)
      return
    }
    if (!isSchoolVerified(profile)) {
      toastError(SCHOOL_VERIFY_REQUIRED_MESSAGE)
      return
    }
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
        authorPhotoURL: anonymousBoard
          ? null
          : (profile?.photoURL ?? null),
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

  async function handleDeleteComment(commentId: string) {
    if (!user?.uid) return
    const ok = window.confirm(
      '이 댓글을 삭제할까요?\n삭제하면 답글도 함께 삭제돼요.',
    )
    if (!ok) return

    setDeletingId(commentId)
    try {
      await deleteCommunityCommentRequest({
        postId,
        commentId,
        authorUid: user.uid,
      })
      setComments((prev) => {
        const next = prev.map((item) => {
          const shouldDelete =
            item.id === commentId || item.parentId === commentId
          return shouldDelete
            ? { ...item, status: 'deleted' as const, updatedAt: Date.now() }
            : item
        })
        onCountChange?.(countOpenComments(next))
        return next
      })
      if (replyToId === commentId) {
        setReplyToId(null)
        setReplyDraft('')
      }
      if (editingId === commentId) {
        setEditingId(null)
        setEditDraft('')
      }
      success('댓글을 삭제했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '댓글 삭제에 실패했어요'))
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(comment: CommunityComment) {
    setEditingId(comment.id)
    setEditDraft(comment.body)
    setReplyToId(null)
    setReplyDraft('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  async function handleSaveEdit(commentId: string) {
    if (!user?.uid) return
    const text = editDraft.trim()
    if (!text) {
      toastError('댓글을 입력해 주세요')
      return
    }

    setSavingEdit(true)
    try {
      const updated = await updateCommunityCommentRequest({
        postId,
        commentId,
        body: text,
        authorUid: user.uid,
      })
      setComments((prev) =>
        prev.map((item) => (item.id === commentId ? updated : item)),
      )
      setEditingId(null)
      setEditDraft('')
      success('댓글을 수정했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '댓글 수정에 실패했어요'))
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <section className='mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] sm:mt-7'>
      <div className='px-5 py-5 sm:px-6'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-[16px] font-semibold tracking-tight text-[var(--foreground)]'>
            댓글
          </h2>
          <span className='rounded-full bg-[#f4f5f7] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-[var(--muted)]'>
            {totalCount}
          </span>
        </div>

        {!authLoading && !user ? (
          <div className='mt-4 rounded-xl bg-[#f7f8fa] px-4 py-3.5 text-[13px] text-[var(--muted-foreground)]'>
            댓글을 쓰려면{' '}
            <Link
              href={loginHref}
              className='font-semibold text-[var(--brand)] underline-offset-2 hover:underline'
            >
              로그인
            </Link>
            이 필요해요.
          </div>
        ) : authLoading ? (
          <p className='mt-4 text-[13px] text-[var(--muted)]'>
            로그인 상태를 확인하는 중이에요…
          </p>
        ) : isAccountSuspended(profile) ? (
          <div className='mt-4 rounded-xl bg-red-50 px-4 py-3.5 text-[13px] text-red-700'>
            {ACCOUNT_SUSPENDED_MESSAGE}
          </div>
        ) : !schoolVerified ? (
          <div className='mt-4 rounded-xl bg-[#f7f8fa] px-4 py-3.5 text-[13px] text-[var(--muted-foreground)]'>
            댓글을 쓰려면{' '}
            <Link
              href={schoolVerifyHref}
              className='font-semibold text-[var(--brand)] underline-offset-2 hover:underline'
            >
              학교 이메일 인증
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
              className='w-full resize-none rounded-xl border-0 bg-[#f7f8fa] px-4 py-3.5 text-[14px] leading-relaxed outline-none transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/15'
            />
            <div className='mt-2.5 flex justify-end'>
              <button
                type='submit'
                disabled={submitting || !draft.trim()}
                className='inline-flex h-9 items-center rounded-full bg-[var(--foreground)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)] disabled:opacity-40'
              >
                {submitting ? '등록 중…' : '댓글 등록'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className='border-t border-black/[0.05] px-5 py-2 sm:px-6'>
        {loading && (
          <p className='py-8 text-center text-[13px] text-[var(--muted)]'>
            댓글을 불러오는 중이에요…
          </p>
        )}

        {!loading && threads.length === 0 && (
          <p className='py-8 text-center text-[13px] text-[var(--muted)]'>
            아직 댓글이 없어요. 첫 댓글을 남겨 보세요.
          </p>
        )}

        {!loading &&
          threads.map((thread, index) => (
            <div
              key={thread.id}
              className={cn(
                'py-4',
                index !== threads.length - 1 && 'border-b border-black/[0.05]',
              )}
            >
              <CommentItem
                comment={thread}
                anonymousBoard={anonymousBoard}
                isAuthor={Boolean(user?.uid && user.uid === thread.authorUid)}
                canReport={Boolean(user)}
                loginHref={loginHref}
                deleting={deletingId === thread.id}
                editing={editingId === thread.id}
                editDraft={editingId === thread.id ? editDraft : ''}
                savingEdit={savingEdit && editingId === thread.id}
                onEditDraftChange={setEditDraft}
                onReply={
                  canCompose
                    ? () => {
                        setReplyToId(thread.id)
                        setReplyDraft('')
                        setEditingId(null)
                        setEditDraft('')
                      }
                    : undefined
                }
                onReport={
                  user?.uid && user.uid !== thread.authorUid
                    ? () => setReportTargetId(thread.id)
                    : undefined
                }
                onStartEdit={
                  user?.uid && user.uid === thread.authorUid
                    ? () => startEdit(thread)
                    : undefined
                }
                onCancelEdit={cancelEdit}
                onSaveEdit={
                  user?.uid && user.uid === thread.authorUid
                    ? () => void handleSaveEdit(thread.id)
                    : undefined
                }
                onDelete={
                  user?.uid && user.uid === thread.authorUid
                    ? () => void handleDeleteComment(thread.id)
                    : undefined
                }
              />

              {thread.replies.length > 0 && (
                <div className='mt-4 ml-3 space-y-4 border-l-2 border-[var(--brand)]/25 pl-5 sm:ml-5 sm:pl-6'>
                  {thread.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      anonymousBoard={anonymousBoard}
                      isAuthor={Boolean(
                        user?.uid && user.uid === reply.authorUid,
                      )}
                      canReport={Boolean(user)}
                      loginHref={loginHref}
                      isReply
                      deleting={deletingId === reply.id}
                      editing={editingId === reply.id}
                      editDraft={editingId === reply.id ? editDraft : ''}
                      savingEdit={savingEdit && editingId === reply.id}
                      onEditDraftChange={setEditDraft}
                      onReport={
                        user?.uid && user.uid !== reply.authorUid
                          ? () => setReportTargetId(reply.id)
                          : undefined
                      }
                      onStartEdit={
                        user?.uid && user.uid === reply.authorUid
                          ? () => startEdit(reply)
                          : undefined
                      }
                      onCancelEdit={cancelEdit}
                      onSaveEdit={
                        user?.uid && user.uid === reply.authorUid
                          ? () => void handleSaveEdit(reply.id)
                          : undefined
                      }
                      onDelete={
                        user?.uid && user.uid === reply.authorUid
                          ? () => void handleDeleteComment(reply.id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}

              {replyToId === thread.id && canCompose && (
                <form
                  className='mt-4 ml-3 border-l-2 border-[var(--brand)]/25 pl-5 sm:ml-5 sm:pl-6'
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
                    className='w-full resize-none rounded-xl border-0 bg-[#f7f8fa] px-3.5 py-2.5 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/15'
                    autoFocus
                  />
                  <div className='mt-2 flex justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setReplyToId(null)
                        setReplyDraft('')
                      }}
                      className='h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                    >
                      취소
                    </button>
                    <button
                      type='submit'
                      disabled={submitting || !replyDraft.trim()}
                      className='h-8 rounded-full bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-white touch-manipulation disabled:opacity-50'
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
    </section>
  )
}

function CommentItem({
  comment,
  anonymousBoard,
  isReply = false,
  isAuthor = false,
  canReport = false,
  loginHref,
  deleting = false,
  editing = false,
  editDraft = '',
  savingEdit = false,
  onEditDraftChange,
  onReply,
  onReport,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  comment: CommunityComment
  anonymousBoard: boolean
  isReply?: boolean
  isAuthor?: boolean
  canReport?: boolean
  loginHref?: string
  deleting?: boolean
  editing?: boolean
  editDraft?: string
  savingEdit?: boolean
  onEditDraftChange?: (value: string) => void
  onReply?: () => void
  onReport?: () => void
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onSaveEdit?: () => void
  onDelete?: () => void
}) {
  const displayName = anonymousBoard
    ? maskAnonymousDisplayName('익명')
    : comment.authorNickname?.trim() ||
      comment.authorEmail.split('@')[0] ||
      '회원'
  const initial = displayName.charAt(0).toUpperCase()
  const photoURL = anonymousBoard
    ? null
    : comment.authorPhotoURL?.trim() || null

  return (
    <div className='flex gap-3'>
      {!anonymousBoard ? (
        <UserAvatar
          photoURL={photoURL}
          initial={initial}
          size={isReply ? 'sm' : 'md'}
        />
      ) : null}

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
            <span
              className={cn(
                'font-semibold text-[var(--foreground)]',
                isReply ? 'text-[13px]' : 'text-[14px]',
              )}
            >
              {displayName}
            </span>
            {!anonymousBoard && (
              <SchoolBadge schoolId={comment.authorSchoolId} />
            )}
            <time className='text-[11px] text-[var(--muted)]'>
              {formatCommunityRelativeTime(comment.createdAt)}
            </time>
          </div>

          {!editing && (
            <div className='flex shrink-0 items-center gap-2.5 pt-0.5 text-[12px] font-medium'>
              {isAuthor ? (
                <>
                  {onStartEdit ? (
                    <button
                      type='button'
                      onClick={onStartEdit}
                      className='text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)]'
                    >
                      수정
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type='button'
                      onClick={onDelete}
                      disabled={deleting}
                      className='text-red-600 touch-manipulation hover:text-red-700 disabled:opacity-50'
                    >
                      {deleting ? '삭제 중…' : '삭제'}
                    </button>
                  ) : null}
                </>
              ) : canReport && onReport ? (
                <button
                  type='button'
                  onClick={onReport}
                  className='text-[var(--muted)] touch-manipulation hover:text-red-600'
                >
                  신고
                </button>
              ) : loginHref ? (
                <Link
                  href={loginHref}
                  className='text-[var(--muted)] touch-manipulation hover:text-red-600'
                >
                  신고
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {editing ? (
          <form
            className='mt-2'
            onSubmit={(e) => {
              e.preventDefault()
              onSaveEdit?.()
            }}
          >
            <textarea
              value={editDraft}
              onChange={(e) => onEditDraftChange?.(e.target.value)}
              rows={isReply ? 2 : 3}
              maxLength={2000}
              className={cn(
                'w-full resize-none rounded-xl border-0 bg-[#f7f8fa] px-3.5 py-2.5 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/15',
                isReply ? 'text-[13px]' : 'text-[14px]',
              )}
              autoFocus
            />
            <div className='mt-2 flex justify-end gap-2'>
              <button
                type='button'
                onClick={onCancelEdit}
                disabled={savingEdit}
                className='h-8 rounded-full px-3 text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--foreground)] disabled:opacity-50'
              >
                취소
              </button>
              <button
                type='submit'
                disabled={savingEdit || !editDraft.trim()}
                className='h-8 rounded-full bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-white touch-manipulation disabled:opacity-50'
              >
                {savingEdit ? '저장 중…' : '수정 완료'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p
              className={cn(
                'mt-1.5 whitespace-pre-wrap leading-relaxed text-[var(--foreground)]',
                isReply ? 'text-[13px]' : 'text-[14px]',
              )}
            >
              {comment.body}
            </p>

            {onReply ? (
              <button
                type='button'
                onClick={onReply}
                className='mt-2 text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--brand)]'
              >
                답글 달기
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
