'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AuthorBadges, UserAvatar } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath } from '@lib/constants/cities'
import { maskAnonymousDisplayName } from '@lib/community/anonymous'
import {
  getCommentAuthorDisplayName,
  resolveCommunityNickname,
} from '@lib/community/author'
import {
  buildCommentThreads,
  createCommunityCommentRequest,
  deleteCommunityCommentRequest,
  fetchCommunityComments,
  updateCommunityCommentRequest,
} from '@lib/community/comments.client'
import { localizeCommunityError } from '@lib/community/client'
import { createCommunityReportRequest } from '@lib/community/engagement.client'
import {
  getIdentityVerifyHref,
  isAccountSuspended,
  isIdentityVerified,
} from '@lib/community/schoolGate'
import { countOpenComments } from '@lib/constants/communityCommentsMock'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'
import type { CommunityComment, CommunityReportReason } from '@/types/nyc'
import { TranslationNotice, useTranslatedContent } from '@widgets/TranslationNotice'
import { useCommunityFormat } from '@widgets/nyc/CommunityPostCard'
import { CommunityReportSheet } from '@widgets/nyc/CommunityReportSheet'
import { CommunityBlockAction } from '@widgets/nyc/CommunityBlockAction'

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
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const { user, profile, nickname, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const myNickname = useMemo(
    () =>
      resolveCommunityNickname({
        nickname: nickname ?? profile?.nickname,
        displayName: profile?.displayName,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        email: user?.email ?? profile?.email,
      }),
    [
      nickname,
      user?.email,
      profile?.email,
      profile?.nickname,
      profile?.displayName,
      profile?.firstName,
      profile?.lastName,
    ],
  )
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
      const normalized =
        myNickname && user?.uid
          ? data.map((item) =>
              item.authorUid === user.uid && !item.authorNickname?.trim()
                ? { ...item, authorNickname: myNickname }
                : item,
            )
          : data
      setComments(normalized)
      onCountChange?.(countOpenComments(normalized))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('comments.loadFailed'),
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [myNickname, onCountChange, postId, t, toastError, user?.uid])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  const threads = useMemo(() => buildCommentThreads(comments), [comments])
  const totalCount = countOpenComments(comments)
  const fallbackNext = loginNext || href()
  const loginHref = cityLoginPath(city, fallbackNext)
  const identityVerified = isIdentityVerified(profile)
  const verifyHref = getIdentityVerifyHref(fallbackNext)
  const canCompose = Boolean(user) && identityVerified && !isAccountSuspended(profile)
  // 문장 가운데 링크가 들어가서 {link} 앞뒤로 나눠 그린다
  const loginPrompt = splitAroundLink(t('comments.loginPrompt'))
  const verifyPrompt = splitAroundLink(t('comments.verifyPrompt'))

  async function submitComment(body: string, parentId: string | null) {
    if (!user?.uid || !user.email) return
    if (isAccountSuspended(profile)) {
      toastError(t('verify.suspended'))
      return
    }
    if (!isIdentityVerified(profile)) {
      toastError(t('verify.required'))
      return
    }
    const text = body.trim()
    if (!text) {
      toastError(t('comments.bodyRequired'))
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
        authorNickname: anonymousBoard ? null : myNickname,
        authorPhotoURL: anonymousBoard
          ? null
          : (profile?.photoURL ?? null),
        authorSchoolId: anonymousBoard
          ? null
          : (profile?.verifiedSchoolId ?? null),
      })
      // 응답에 닉네임이 비어 있으면 내 닉네임으로 보강
      const withNickname =
        !anonymousBoard && !created.authorNickname?.trim() && myNickname
          ? { ...created, authorNickname: myNickname }
          : created
      setComments((prev) => {
        const next = [
          ...prev.filter((item) => item.id !== withNickname.id),
          withNickname,
        ]
        onCountChange?.(countOpenComments(next))
        return next
      })
      success(parentId ? t('comments.replyPosted') : t('comments.posted'))
      if (parentId) {
        setReplyToId(null)
        setReplyDraft('')
      } else {
        setDraft('')
      }
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.commentCreateFailed'),
        ),
      )
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

  async function handleDeleteComment(commentId: string) {
    if (!user?.uid) return
    const ok = window.confirm(t('comments.deleteConfirm'))
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
      success(t('comments.deleted'))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.commentDeleteFailed'),
        ),
      )
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
      toastError(t('comments.bodyRequired'))
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
      success(t('comments.updated'))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.commentUpdateFailed'),
        ),
      )
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <section className='mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] sm:mt-7'>
      <div className='px-5 py-5 sm:px-6'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-[16px] font-semibold tracking-tight text-[var(--foreground)]'>
            {t('comments.title')}
          </h2>
          <span className='rounded-full bg-[#f4f5f7] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-[var(--muted)]'>
            {totalCount}
          </span>
        </div>

        {!authLoading && !user ? (
          <div className='mt-4 rounded-xl bg-[#f7f8fa] px-4 py-3.5 text-[13px] text-[var(--muted-foreground)]'>
            {loginPrompt[0]}
            <Link
              href={loginHref}
              className='font-semibold text-[var(--brand)] underline-offset-2 hover:underline'
            >
              {t('comments.loginLink')}
            </Link>
            {loginPrompt[1]}
          </div>
        ) : authLoading ? (
          <p className='mt-4 text-[13px] text-[var(--muted)]'>
            {t('comments.checkingLogin')}
          </p>
        ) : isAccountSuspended(profile) ? (
          <div className='mt-4 rounded-xl bg-red-50 px-4 py-3.5 text-[13px] text-red-700'>
            {t('verify.suspended')}
          </div>
        ) : !identityVerified ? (
          <div className='mt-4 rounded-xl bg-[#f7f8fa] px-4 py-3.5 text-[13px] text-[var(--muted-foreground)]'>
            {verifyPrompt[0]}
            <Link
              href={verifyHref}
              className='font-semibold text-[var(--brand)] underline-offset-2 hover:underline'
            >
              {t('verify.linkLabel')}
            </Link>
            {verifyPrompt[1]}
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
              placeholder={t('comments.placeholder')}
              className='w-full resize-none rounded-xl border-0 bg-[#f7f8fa] px-4 py-3.5 text-[14px] leading-relaxed outline-none transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/15'
            />
            <div className='mt-2.5 flex justify-end'>
              <button
                type='submit'
                disabled={submitting || !draft.trim()}
                className='inline-flex h-9 items-center rounded-full bg-[var(--foreground)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)] disabled:opacity-40'
              >
                {submitting ? t('comments.submitting') : t('comments.submit')}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className='border-t border-black/[0.05] px-5 py-2 sm:px-6'>
        {loading && (
          <p className='py-8 text-center text-[13px] text-[var(--muted)]'>
            {t('comments.loading')}
          </p>
        )}

        {!loading && threads.length === 0 && (
          <p className='py-8 text-center text-[13px] text-[var(--muted)]'>
            {t('comments.empty')}
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
                viewerNickname={myNickname}
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
                blockPostId={postId}
                onBlocked={() => void loadComments()}
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
                      viewerNickname={myNickname}
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
                      blockPostId={postId}
                      onBlocked={() => void loadComments()}
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
                    placeholder={t('comments.replyPlaceholder')}
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
                      {t('comments.cancel')}
                    </button>
                    <button
                      type='submit'
                      disabled={submitting || !replyDraft.trim()}
                      className='h-8 rounded-full bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-white touch-manipulation disabled:opacity-50'
                    >
                      {t('comments.replySubmit')}
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
        target='comment'
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
  viewerNickname = null,
  canReport = false,
  loginHref,
  deleting = false,
  editing = false,
  editDraft = '',
  savingEdit = false,
  onEditDraftChange,
  onReply,
  onReport,
  blockPostId,
  onBlocked,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  comment: CommunityComment
  anonymousBoard: boolean
  isReply?: boolean
  isAuthor?: boolean
  viewerNickname?: string | null
  canReport?: boolean
  loginHref?: string
  deleting?: boolean
  editing?: boolean
  editDraft?: string
  savingEdit?: boolean
  onEditDraftChange?: (value: string) => void
  onReply?: () => void
  onReport?: () => void
  /** 있으면 "차단하기"를 함께 보여 준다 (남의 댓글) */
  blockPostId?: string
  onBlocked?: () => void
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onSaveEdit?: () => void
  onDelete?: () => void
}) {
  const t = useT('community')
  const format = useCommunityFormat()
  const translated = useTranslatedContent<CommunityComment, CommunityComment>(comment, 'comment')
  const shownComment = translated.item
  const displayName = anonymousBoard
    ? maskAnonymousDisplayName(t('author.anonymous'))
    : getCommentAuthorDisplayName(
        comment,
        isAuthor ? viewerNickname : null,
        t,
      )
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
              <AuthorBadges schoolId={comment.authorSchoolId} workplaceVerified={comment.authorWorkplaceVerified} instagramVerified={comment.authorInstagramVerified} />
            )}
            <time className='text-[11px] text-[var(--muted)]'>
              {format.relativeTime(comment.createdAt)}
            </time>
            <TranslationNotice
              i18n={comment.i18n}
              showingOriginal={translated.showingOriginal}
              onToggle={translated.toggle}
              variant='comment'
            />
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
                      {t('detail.edit')}
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type='button'
                      onClick={onDelete}
                      disabled={deleting}
                      className='text-red-600 touch-manipulation hover:text-red-700 disabled:opacity-50'
                    >
                      {deleting ? t('comments.deleting') : t('detail.delete')}
                    </button>
                  ) : null}
                </>
              ) : canReport && onReport ? (
                <>
                  <button
                    type='button'
                    onClick={onReport}
                    className='text-[var(--muted)] touch-manipulation hover:text-red-600'
                  >
                    {t('report.action')}
                  </button>
                  {blockPostId ? (
                    <CommunityBlockAction
                      postId={blockPostId}
                      commentId={comment.id}
                      onBlocked={onBlocked}
                      className='text-[12px]'
                    />
                  ) : null}
                </>
              ) : loginHref ? (
                <Link
                  href={loginHref}
                  className='text-[var(--muted)] touch-manipulation hover:text-red-600'
                >
                  {t('report.action')}
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
                {t('comments.cancel')}
              </button>
              <button
                type='submit'
                disabled={savingEdit || !editDraft.trim()}
                className='h-8 rounded-full bg-[var(--foreground)] px-3.5 text-[12px] font-semibold text-white touch-manipulation disabled:opacity-50'
              >
                {savingEdit ? t('comments.saving') : t('comments.saveEdit')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p
              lang={translated.lang}
              className={cn(
                'mt-1.5 whitespace-pre-wrap leading-relaxed text-[var(--foreground)]',
                isReply ? 'text-[13px]' : 'text-[14px]',
              )}
            >
              {shownComment.body}
            </p>

            {onReply ? (
              <button
                type='button'
                onClick={onReply}
                className='mt-2 text-[12px] font-medium text-[var(--muted)] touch-manipulation hover:text-[var(--brand)]'
              >
                {t('comments.reply')}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/** `댓글을 쓰려면 {link}이 필요해요.` → ['댓글을 쓰려면 ', '이 필요해요.'] */
function splitAroundLink(message: string): [string, string] {
  const index = message.indexOf('{link}')
  if (index < 0) return [`${message} `, '']
  return [message.slice(0, index), message.slice(index + '{link}'.length)]
}
