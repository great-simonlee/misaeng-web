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
} from '@lib/constants/anonymousTopics'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
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
  const city = useCity()
  const href = useCityPath()
  const boardId: NycCommunityBoardId = 'anonymous'
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
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
          toastError('글을 찾을 수 없어요')
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError('수정 권한이 없어요')
          router.replace(hrefForCommunityPost(post, city))
          return
        }
        setPostTitle(post.title.slice(0, ANONYMOUS_TITLE_MAX))
        setContentHtml(post.contentHtml)
        setTopic(post.location)
      } catch (err) {
        if (!cancelled) {
          toastError(getErrorMessage(err, '글을 불러오지 못했어요'))
          router.replace(href('/me/posts'))
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [city, editPostId, href, user?.uid, router, toastError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      toastError('로그인이 필요해요')
      router.replace(cityLoginPath(city, loginNext))
      return
    }

    const trimmedTitle = postTitle.trim()
    if (!trimmedTitle) {
      toastError('제목을 입력해 주세요')
      return
    }
    if (trimmedTitle.length > ANONYMOUS_TITLE_MAX) {
      toastError(`제목은 ${ANONYMOUS_TITLE_MAX}자 이내로 작성해 주세요`)
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError('본문을 입력해 주세요')
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        `본문은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요`,
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
      success(isEdit ? '글을 수정했어요' : '글을 등록했어요')
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(
        getErrorMessage(err, isEdit ? '수정에 실패했어요' : '등록에 실패했어요'),
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
      success('임시 저장했어요')
    } catch {
      toastError('임시 저장에 실패했어요')
    }
  }

  if (loading || loadingEdit || !draftHydrated || !isAuthenticated || !user) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState
          fullPage
          label={
            !loading && !isAuthenticated ? '로그인 페이지로 이동 중…' : undefined
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
          label={isEdit ? '글로 돌아가기' : `${title} 목록`}
          className='mb-5'
        />

        {isEdit ? <UpdateHero title={postTitle} topic={topic} /> : <CreateHero />}

        <form onSubmit={(e) => void handleSubmit(e)} className='mt-5 space-y-6'>
          <CreateSection
            step={1}
            title='어떤 주제인가요?'
            description='선택하지 않아도 괜찮아요'
          >
            <div className='flex flex-wrap gap-1.5' aria-label='익명게시판 주제'>
              <BoardQuickChip
                label='선택 안 함'
                active={!topic}
                onClick={() => setTopic('')}
              />
              {ANONYMOUS_TOPICS.map((item) => (
                <BoardQuickChip
                  key={item}
                  label={item}
                  active={topic === item}
                  onClick={() => setTopic(item)}
                />
              ))}
            </div>
          </CreateSection>

          <CreateSection
            step={2}
            title='제목'
            description='한눈에 보이는 짧은 제목을 적어 주세요'
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
              placeholder={meta.titlePlaceholder}
            />
          </CreateSection>

          <CreateSection
            step={3}
            title='본문'
            description='부담 없이 남겨 보세요. 작성자는 익명으로 표시돼요.'
          >
            <TipTapEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder={meta.descriptionPlaceholder}
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
              {submitting ? '저장 중…' : '수정 완료'}
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
                {submitting ? '등록 중…' : '글 등록하기'}
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
              목록으로 돌아가기
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
  return (
    <div>
      <h1 className='text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        익명게시판 글 올리기
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        이름·학교·사진은 보이지 않아요. 부담 없이 남겨 주세요.
      </p>
    </div>
  )
}

function UpdateHero({ title, topic }: { title: string; topic: string }) {
  return (
    <div className='overflow-hidden rounded-2xl bg-[#fff8f5] ring-1 ring-black/[0.06]'>
      <div className='border-b border-black/[0.06] px-4 py-4 sm:px-5'>
        <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
          글 수정
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          익명 글 수정하기
        </h1>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        {topic ? (
          <span className='inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08]'>
            {topic}
          </span>
        ) : null}
        <span className='min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]'>
          {title || '제목 없음'}
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
