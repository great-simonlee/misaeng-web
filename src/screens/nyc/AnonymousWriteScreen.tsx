'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { LoadingState, TipTapEditor } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath, hrefForCommunityPost } from '@lib/constants/cities'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  localizeCommunityError,
  updateCommunityPostRequest,
} from '@lib/community/client'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import { isAccountSuspended, isIdentityVerified } from '@lib/community/schoolGate'
import {
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from '@lib/community/writeDraft'
import {
  ANONYMOUS_TITLE_MAX,
  ANONYMOUS_TOPICS,
  anonymousTopicKey,
} from '@lib/constants/anonymousTopics'
import {
  communityBoardKey,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { useFormat, useT } from '@lib/i18n/client'
import { BoardBackLink, BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { BoardQuickChip } from '@widgets/nyc/BoardListToolbar'
import {
  AnonymousWriteOrientationModal,
  useAnonymousWriteOrientation,
} from '@widgets/nyc/CptOptWriteOrientationModal'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'

type AnonymousWriteDraft = {
  postTitle: string
  contentHtml: string
  topic: string
}

interface AnonymousWriteScreenProps {
  title: string
  editPostId?: string
}

export function AnonymousWriteScreen({
  title,
  editPostId,
}: AnonymousWriteScreenProps) {
  const t = useT('community')
  const fmt = useFormat()
  const city = useCity()
  const href = useCityPath()
  const boardId: NycCommunityBoardId = 'anonymous'
  const topicLabel = (value: string) => {
    const key = anonymousTopicKey(value)
    return key ? t(key) : value
  }
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId
    ? href(`/${boardId}/${editPostId}/edit`)
    : href(`/${boardId}/new`)
  const { user, profile, loading, isAuthenticated } = useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editPostId))
  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [topic, setTopic] = useState('')
  const [draftHydrated, setDraftHydrated] = useState(isEdit)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const orientation = useAnonymousWriteOrientation(!isEdit)

  useEffect(() => {
    if (isEdit || !user?.uid) return
    const stored = loadWriteDraft<AnonymousWriteDraft>(
      'anonymous',
      city,
      user.uid,
    )
    if (stored) {
      setPostTitle(stored.data.postTitle ?? '')
      setContentHtml(stored.data.contentHtml ?? '')
      setTopic(stored.data.topic ?? '')
      setDraftSavedAt(stored.savedAt)
    }
    setDraftHydrated(true)
  }, [city, isEdit, user?.uid])

  useEffect(() => {
    if (!editPostId || !user?.uid) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await fetchCommunityPost(editPostId)
        if (cancelled) return
        if (!post || !isAnonymousBoard(post.categoryId)) {
          toastError(t('write.errors.postNotFound'))
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError(t('write.errors.noEditPermission'))
          router.replace(hrefForCommunityPost(post, city))
          return
        }
        setPostTitle(post.title.slice(0, ANONYMOUS_TITLE_MAX))
        setContentHtml(post.contentHtml)
        setTopic(post.location)
      } catch (err) {
        if (!cancelled) {
          toastError(
            getErrorMessage(
              localizeCommunityError(err, t),
              t('detail.loadFailed'),
            ),
          )
          router.replace(href('/me/posts'))
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [city, editPostId, href, user?.uid, router, t, toastError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      toastError(t('errors.loginRequired'))
      router.replace(cityLoginPath(city, loginNext))
      return
    }

    const trimmedTitle = postTitle.trim()
    if (!trimmedTitle) {
      toastError(t('write.errors.titleRequired'))
      return
    }
    if (trimmedTitle.length > ANONYMOUS_TITLE_MAX) {
      toastError(t('write.errors.titleTooLong', { max: ANONYMOUS_TITLE_MAX }))
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(t('write.errors.bodyRequired'))
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        t('write.errors.bodyTooLong', { max: fmt.number(COMMUNITY_BODY_MAX) }),
      )
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: trimmedTitle,
        contentHtml,
        location: topic.trim(),
        detail: '',
      }
      const post =
        isEdit && editPostId
          ? await updateCommunityPostRequest(editPostId, payload)
          : await createCommunityPostRequest({
              categoryId: boardId,
              city,
              ...payload,
              authorNickname: null,
              authorPhotoURL: null,
              authorSchoolId: null,
              authorSchoolName: null,
            })
      if (!isEdit && user.uid) {
        clearWriteDraft('anonymous', city, user.uid)
      }
      success(isEdit ? t('write.updated') : t('write.created'))
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          isEdit ? t('errors.updateFailed') : t('errors.createFailed'),
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    if (!user?.uid) return
    try {
      const savedAt = saveWriteDraft<AnonymousWriteDraft>(
        'anonymous',
        city,
        user.uid,
        {
          postTitle,
          contentHtml,
          topic,
        },
      )
      setDraftSavedAt(savedAt)
      success(t('write.draftSaved'))
    } catch {
      toastError(t('write.draftSaveFailed'))
    }
  }

  if (loading || loadingEdit || !draftHydrated || !isAuthenticated || !user) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState
          fullPage
          label={
            !loading && !isAuthenticated ? t('write.redirectingToLogin') : undefined
          }
        />
      </BoardPageShell>
    )
  }

  if (isAccountSuspended(profile)) {
    return <AccountSuspendedNotice />
  }

  if (!isIdentityVerified(profile)) {
    return <SchoolVerificationRequired nextPath={loginNext} />
  }

  return (
    <BoardPageShell width='narrow'>
      <div className='pb-16 pt-4 sm:pt-6'>
        <BoardBackLink
          href={
            isEdit && editPostId
              ? href(`/${boardId}/${editPostId}`)
              : href(`/${boardId}`)
          }
          label={
            isEdit ? t('write.backToPost') : t('detail.backToList', { board: title })
          }
          className='mb-5'
        />

        {isEdit ? (
          <UpdateHero title={postTitle} topic={topic ? topicLabel(topic) : ''} />
        ) : (
          <CreateHero />
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className='mt-5 space-y-6'>
          <CreateSection
            step={1}
            title={t('anonymousWrite.topicTitle')}
            description={t('anonymousWrite.topicDescription')}
          >
            <div
              className='flex flex-wrap gap-1.5'
              aria-label={t('anonymousWrite.topicAria')}
            >
              <BoardQuickChip
                label={t('list.none')}
                active={!topic}
                onClick={() => setTopic('')}
              />
              {ANONYMOUS_TOPICS.map((item) => (
                <BoardQuickChip
                  key={item}
                  label={topicLabel(item)}
                  active={topic === item}
                  onClick={() => setTopic(item)}
                />
              ))}
            </div>
          </CreateSection>

          <CreateSection
            step={2}
            title={t('write.titleLabel')}
            description={t('anonymousWrite.titleDescription')}
            trailing={`${postTitle.length}/${ANONYMOUS_TITLE_MAX}`}
          >
            <input
              required
              value={postTitle}
              maxLength={ANONYMOUS_TITLE_MAX}
              onChange={(e) =>
                setPostTitle(e.target.value.slice(0, ANONYMOUS_TITLE_MAX))
              }
              className={inputClass}
              placeholder={t(communityBoardKey(boardId, 'titlePlaceholder'))}
            />
          </CreateSection>

          <CreateSection
            step={3}
            title={t('write.bodyLabel')}
            description={t('anonymousWrite.bodyDescription')}
          >
            <TipTapEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder={t(communityBoardKey(boardId, 'descriptionPlaceholder'))}
              minHeightClassName='min-h-[200px]'
              contentClassName='!text-[13px] !leading-[1.65]'
              simpleToolbar
              maxLength={COMMUNITY_BODY_MAX}
            />
          </CreateSection>

          {isEdit ? (
            <button
              type='submit'
              disabled={submitting || !postTitle.trim()}
              className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
            >
              {submitting ? t('comments.saving') : t('comments.saveEdit')}
            </button>
          ) : (
            <WriteDraftActions
              onSave={handleSaveDraft}
              savedAt={draftSavedAt}
              disabled={submitting}
            >
              <button
                type='submit'
                disabled={submitting || !postTitle.trim()}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
              >
                {submitting ? t('comments.submitting') : t('write.submit')}
              </button>
            </WriteDraftActions>
          )}

          <p className='text-center text-[12px] text-[var(--muted)]'>
            <Link
              href={
                isEdit && editPostId
                  ? href(`/${boardId}/${editPostId}`)
                  : href(`/${boardId}`)
              }
              className='underline-offset-2 hover:underline'
            >
              {t('write.backToList')}
            </Link>
          </p>
        </form>
      </div>

      {!isEdit ? (
        <AnonymousWriteOrientationModal
          open={orientation.open}
          agreeing={orientation.agreeing}
          error={orientation.error}
          onClose={() => void orientation.agree()}
          listHref={href(`/${boardId}`)}
        />
      ) : null}
    </BoardPageShell>
  )
}

function CreateHero() {
  const t = useT('community')
  return (
    <div>
      <h1 className='text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {t('anonymousWrite.createTitle')}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        {t('anonymousWrite.createDescription')}
      </p>
    </div>
  )
}

function UpdateHero({ title, topic }: { title: string; topic: string }) {
  const t = useT('community')
  return (
    <div className='overflow-hidden rounded-2xl bg-brand-soft ring-1 ring-black/[0.06]'>
      <div className='border-b border-black/[0.06] px-4 py-4 sm:px-5'>
        <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
          {t('write.editEyebrow')}
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          {t('anonymousWrite.editTitle')}
        </h1>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        {topic ? (
          <span className='inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08]'>
            {topic}
          </span>
        ) : null}
        <span className='min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]'>
          {title || t('write.untitled')}
        </span>
      </div>
    </div>
  )
}

function CreateSection({
  step,
  title,
  description,
  trailing,
  children,
}: {
  step: number
  title: string
  description?: string
  trailing?: string
  children: ReactNode
}) {
  return (
    <section>
      <div className='mb-2 flex items-start gap-3'>
        <span className='inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[12px] font-bold text-white'>
          {step}
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex items-baseline justify-between gap-3'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              {title}
            </h2>
            {trailing ? (
              <span className='shrink-0 text-[11px] font-medium tabular-nums text-[var(--muted)]'>
                {trailing}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className='pl-10'>{children}</div>
    </section>
  )
}

const inputClass =
  'h-11 w-full rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20'
