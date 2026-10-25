'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { LoadingState, TipTapEditor } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { useStepAutosave } from '@hooks/useStepAutosave'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { hrefForCommunityPost } from '@lib/constants/cities'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  updateCommunityPostRequest,
  localizeCommunityError,
} from '@lib/community/client'
import {
  JOB_REVIEW_TIPS_MAX,
  getJobReviewTypeLabel,
  getJobReviewTypeStyle,
  isJobReviewBoard,
  isJobReviewTimelineEntryComplete,
  isJobReviewTimelineEntryFilled,
  normalizeJobReviewTimeline,
  type JobReviewTimelineEntry,
} from '@lib/community/jobReview'
import { useFormat, useT } from '@lib/i18n/client'
import {
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from '@lib/community/writeDraft'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import { isAccountSuspended, isIdentityVerified } from '@lib/community/schoolGate'
import {
  communityBoardKey,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { JobReviewTypeId } from '@/types/nyc'
import {
  BoardBackLink,
  BoardPageShell,
} from '@widgets/nyc/BoardPageShell'
import { JobReviewTimelineEditor } from '@widgets/nyc/JobReviewTimelineEditor'
import { JobReviewTypeBadge, JobReviewTypePicker } from '@widgets/nyc/JobReviewTypeBadge'
import {
  isJobReviewSourceComplete,
  JobReviewOutcomePicker,
  JobReviewSourcePicker,
} from '@widgets/nyc/JobReviewSourcePicker'
import type { JobReviewOutcomeId, JobReviewSourceId } from '@lib/community/jobReview'
import {
  JobReviewWriteOrientationModal,
  useJobReviewWriteOrientation,
} from '@widgets/nyc/CptOptWriteOrientationModal'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { AutosaveNotice } from '@widgets/nyc/AutosaveNotice'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'
import { StatusEmployerSelect } from '@widgets/nyc/StatusEmployerSelect'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'

type JobReviewWriteDraft = {
  postTitle: string
  contentHtml: string
  location: string
  industry: string
  jobReviewType: JobReviewTypeId | null
  timeline: JobReviewTimelineEntry[]
}

interface JobReviewWriteScreenProps {
  title: string
  editPostId?: string
}

export function JobReviewWriteScreen({
  title,
  editPostId,
}: JobReviewWriteScreenProps) {
  const city = useCity()
  const href = useCityPath()
  const boardId: NycCommunityBoardId = 'job-review'
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId
    ? href(`/${boardId}/${editPostId}/edit`)
    : href(`/${boardId}/new`)
  const { user, profile, loading, isAuthenticated } =
    useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const t = useT('reviews')
  const tCommunity = useT('community')
  const format = useFormat()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editPostId))
  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [jobReviewType, setJobReviewType] = useState<JobReviewTypeId | null>(null)
  const [jobReviewSource, setJobReviewSource] = useState<JobReviewSourceId | null>(null)
  const [jobReviewSourceOrgId, setJobReviewSourceOrgId] = useState<string | null>(null)
  const [jobReviewOutcome, setJobReviewOutcome] = useState<JobReviewOutcomeId | null>(null)
  const sourceComplete = isJobReviewSourceComplete(jobReviewSource, jobReviewSourceOrgId)
  const [timeline, setTimeline] = useState<JobReviewTimelineEntry[]>([])
  const [existingTimelineIds, setExistingTimelineIds] = useState<string[]>([])
  const [showMoreSettings, setShowMoreSettings] = useState(false)
  const [draftHydrated, setDraftHydrated] = useState(isEdit)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const orientation = useJobReviewWriteOrientation(!isEdit)

  // 수정 중인 글은 글마다 따로 보관한다.
  const draftKeyUid = user?.uid
    ? editPostId
      ? `${user.uid}:edit:${editPostId}`
      : user.uid
    : null

  // 제출이 끝난 뒤 화면 이탈 저장이 지운 초안을 되살리지 않도록 렌더와 무관하게 즉시 막는다.
  const submittedRef = useRef(false)
  // 수정 모드: 불러온 글 그대로면 저장하지 않는다 (다음 방문 때 "불러왔어요"가 뜨지 않게).
  const editBaselineRef = useRef<string | null>(null)

  function applyDraftData(data: JobReviewWriteDraft) {
    setPostTitle(data.postTitle)
    setContentHtml(data.contentHtml)
    setLocation(data.location)
    setIndustry(data.industry)
    setJobReviewType(data.jobReviewType)
    setTimeline(data.timeline)
  }

  function persistDraft(): number | null {
    if (!draftKeyUid || submittedRef.current) return null
    const data: JobReviewWriteDraft = {
      postTitle,
      contentHtml,
      location,
      industry,
      jobReviewType,
      timeline,
    }
    if (isEdit) {
      if (JSON.stringify(data) === editBaselineRef.current) {
        clearWriteDraft('job-review', city, draftKeyUid)
        setDraftSavedAt(null)
        return null
      }
    } else if (!hasJobReviewDraftContent(data)) {
      return null
    }
    const savedAt = saveWriteDraft<JobReviewWriteDraft>(
      'job-review',
      city,
      draftKeyUid,
      data,
    )
    setDraftSavedAt(savedAt)
    return savedAt
  }

  const { requestSave, handleSectionFocus } = useStepAutosave(
    () => {
      try {
        persistDraft()
      } catch (err) {
        console.error('Job review autosave error:', err)
      }
    },
    draftHydrated && !loadingEdit && !submitting && !submitted,
  )

  useEffect(() => {
    if (isEdit || !user?.uid) return
    const stored = loadWriteDraft<JobReviewWriteDraft>(
      'job-review',
      city,
      user.uid,
    )
    if (stored) {
      setPostTitle(stored.data.postTitle ?? '')
      setContentHtml(stored.data.contentHtml ?? '')
      setLocation(stored.data.location ?? '')
      setIndustry(stored.data.industry ?? '')
      setJobReviewType(stored.data.jobReviewType ?? null)
      setTimeline(Array.isArray(stored.data.timeline) ? stored.data.timeline : [])
      setDraftSavedAt(stored.savedAt)
    }
    setDraftHydrated(true)
  }, [city, isEdit, user?.uid])

  // 글 불러오기는 글·사용자가 바뀔 때만 — 다시 실행되면 작성 중인 내용을 서버 값으로 덮어쓴다.
  const loadEditPost = useEffectEvent(
    async (postId: string, uid: string, signal: { cancelled: boolean }) => {
      try {
        const post = await fetchCommunityPost(postId)
        if (signal.cancelled) return
        if (!post || !isJobReviewBoard(post.categoryId)) {
          toastError(t('write.notFound'))
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== uid) {
          toastError(t('write.noPermission'))
          router.replace(hrefForCommunityPost(post, city))
          return
        }
        const loadedTimeline = post.jobReviewTimeline?.length
          ? post.jobReviewTimeline
          : []
        setExistingTimelineIds(loadedTimeline.map((entry) => entry.id))
        setJobReviewSource(post.jobReviewSource ?? null)
        setJobReviewSourceOrgId(post.jobReviewSourceOrgId ?? null)
        setJobReviewOutcome(post.jobReviewOutcome ?? null)

        const bodyPlain = htmlToPlainText(post.contentHtml || '')
        const fromPost: JobReviewWriteDraft = {
          postTitle: post.title,
          contentHtml: bodyPlain
            ? post.contentHtml
            : post.jobReviewTips?.trim()
              ? `<p>${escapeHtml(post.jobReviewTips.trim())}</p>`
              : '',
          location: post.location,
          industry: post.jobReviewIndustry?.trim() || '',
          jobReviewType: post.jobReviewType,
          timeline: loadedTimeline,
        }
        editBaselineRef.current = JSON.stringify(fromPost)

        // 제출 전에 자동 저장된 수정본이 글보다 최신이면 그걸 이어서 보여 준다.
        const editDraftUid = `${uid}:edit:${postId}`
        const stored = loadWriteDraft<JobReviewWriteDraft>(
          'job-review',
          city,
          editDraftUid,
        )
        if (stored && stored.savedAt > (post.updatedAt || post.createdAt)) {
          applyDraftData({
            postTitle: stored.data.postTitle ?? fromPost.postTitle,
            contentHtml: stored.data.contentHtml ?? fromPost.contentHtml,
            location: stored.data.location ?? fromPost.location,
            industry: stored.data.industry ?? fromPost.industry,
            jobReviewType: stored.data.jobReviewType ?? fromPost.jobReviewType,
            timeline: Array.isArray(stored.data.timeline)
              ? stored.data.timeline
              : fromPost.timeline,
          })
          setDraftSavedAt(stored.savedAt)
          success(t('write.restoredAutosave'))
          return
        }
        if (stored) clearWriteDraft('job-review', city, editDraftUid)
        applyDraftData(fromPost)
      } catch (err) {
        if (!signal.cancelled) {
          toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('write.loadFailed')))
          router.replace(href('/me/posts'))
        }
      } finally {
        if (!signal.cancelled) setLoadingEdit(false)
      }
    },
  )

  const editUid = user?.uid
  useEffect(() => {
    if (!editPostId || !editUid) return
    const signal = { cancelled: false }
    void loadEditPost(editPostId, editUid, signal)
    return () => {
      signal.cancelled = true
    }
  }, [editPostId, editUid])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) return

    if (!jobReviewType) {
      toastError(t('jobReview.write.errors.typeRequired'))
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(
        isEdit
          ? t('jobReview.write.errors.tipsEmptyEdit')
          : t('jobReview.write.errors.tipsRequired'),
      )
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        t('jobReview.write.errors.tipsTooLong', {
          max: format.number(COMMUNITY_BODY_MAX),
        }),
      )
      return
    }

    // 「이 기록 추가」를 누르지 않아도, 작성칸에 완료된 초안은 함께 저장
    const readyTimeline = timeline.filter(isJobReviewTimelineEntryComplete)
    const normalizedTimeline = normalizeJobReviewTimeline(readyTimeline)
    if (normalizedTimeline.length === 0) {
      toastError(
        isEdit
          ? t('jobReview.write.errors.timelineRequiredEdit')
          : t('jobReview.write.errors.timelineRequired'),
      )
      return
    }
    const incomplete = timeline.find(
      (entry) =>
        isJobReviewTimelineEntryFilled(entry) &&
        !isJobReviewTimelineEntryComplete(entry),
    )
    if (incomplete) {
      toastError(t('write.errors.timelineIncomplete'))
      return
    }
    if (!jobReviewOutcome) {
      toastError(t('jobReview.write.errors.outcomeRequired'))
      return
    }
    if (!jobReviewSource || !sourceComplete) {
      toastError(
        jobReviewSource === 'student-org'
          ? t('jobReview.write.errors.orgRequired')
          : t('jobReview.write.errors.sourceRequired'),
      )
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: postTitle.trim(),
        contentHtml,
        location: location.trim(),
        jobReviewIndustry: industry.trim() || null,
        detail: getJobReviewTypeLabel(jobReviewType),
        jobReviewType,
        jobReviewTimeline: normalizedTimeline,
        jobReviewTips: plain.slice(0, JOB_REVIEW_TIPS_MAX) || null,
        jobReviewSource,
        jobReviewSourceOrgId,
        jobReviewOutcome,
      }

      const post =
        isEdit && editPostId
          ? await updateCommunityPostRequest(editPostId, payload)
          : await createCommunityPostRequest({
              categoryId: boardId,
              city,
              ...payload,
              authorNickname: profile?.nickname?.trim() || null,
              authorPhotoURL: profile?.photoURL?.trim() || null,
              authorSchoolId: profile?.verifiedSchoolId ?? null,
              authorSchoolName: profile?.verifiedSchoolName ?? null,
            })

      submittedRef.current = true
      setSubmitted(true)
      if (draftKeyUid) clearWriteDraft('job-review', city, draftKeyUid)
      success(
        isEdit
          ? t('jobReview.write.updated')
          : t('jobReview.write.created'),
      )
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('write.saveFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    try {
      if (persistDraft()) success(t('write.draftSaved'))
      else toastError(t('write.draftEmpty'))
    } catch {
      toastError(t('write.draftSaveFailed'))
    }
  }

  if (loading || !isAuthenticated || !draftHydrated) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState fullPage label={t('write.checkingLogin')} />
      </BoardPageShell>
    )
  }

  if (isAccountSuspended(profile)) {
    return <AccountSuspendedNotice />
  }

  if (!isIdentityVerified(profile)) {
    return <SchoolVerificationRequired nextPath={loginNext} />
  }

  if (loadingEdit) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState fullPage label={t('write.loadingPost')} />
      </BoardPageShell>
    )
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
          label={isEdit ? t('write.backToPost') : t('write.boardList', { board: title })}
          className='mb-5'
        />

        {isEdit ? (
          <UpdateHero
            title={postTitle}
            location={location}
            jobReviewType={jobReviewType}
            recordCount={existingTimelineIds.length}
          />
        ) : (
          <CreateHero writeLabel={tCommunity(communityBoardKey(boardId, 'writeLabel'))} />
        )}

        <form
          onSubmit={(e) => void handleSubmit(e)}
          onFocus={handleSectionFocus}
          className='mt-6 space-y-8'
        >
          <AutosaveNotice savedAt={draftSavedAt} />
          {isEdit ? (
            <>
              <section data-autosave-section='timeline'>
                <JobReviewTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  jobReviewType={jobReviewType}
                  mode='update'
                  existingEntryIds={existingTimelineIds}
                  onEntryCommit={requestSave}
                />
              </section>

              <section
                data-autosave-section='info'
                className='overflow-hidden rounded-2xl ring-1 ring-black/[0.06]'
              >
                <button
                  type='button'
                  onClick={() => setShowMoreSettings((prev) => !prev)}
                  className='flex w-full items-center justify-between gap-3 bg-[#fafafa] px-4 py-3.5 text-left touch-manipulation'
                >
                  <div>
                    <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                      {t('jobReview.write.moreSettingsTitle')}
                    </p>
                    <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                      {t('jobReview.write.moreSettingsHint')}
                    </p>
                  </div>
                  <span className='text-[12px] font-medium text-[var(--brand)]'>
                    {showMoreSettings ? t('write.collapse') : t('write.expand')}
                  </span>
                </button>
                {showMoreSettings ? (
                  <div className='space-y-5 border-t border-black/[0.04] bg-white p-4 sm:p-5'>
                    <Field label={t('write.titleLabel')} required>
                      <input
                        required
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className={inputClass}
                        placeholder={tCommunity(communityBoardKey(boardId, 'titlePlaceholder'))}
                      />
                    </Field>
                    <StatusEmployerSelect
                      value={location}
                      onChange={(next) => {
                        setLocation(next)
                        requestSave()
                      }}
                      label={tCommunity(communityBoardKey(boardId, 'locationLabel'))}
                    />
                    <div>
                      <p className='text-[13px] font-medium text-[var(--foreground)]'>
                        {t('jobReview.write.tipsTitle')}
                      </p>
                      <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                        {t('jobReview.write.tipsDescription')}
                      </p>
                      <div className='mt-1.5'>
                        <TipTapEditor
                          value={contentHtml}
                          onChange={setContentHtml}
                          placeholder={t('jobReview.write.tipsPlaceholder')}
                          minHeightClassName='min-h-[160px]'
                          contentClassName='!text-[13px] !leading-[1.65]'
                          simpleToolbar
                          maxLength={COMMUNITY_BODY_MAX}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section
                data-autosave-section='outcome'
                className='rounded-2xl p-4 ring-1 ring-black/[0.06] sm:p-5'
              >
                <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                  {t('jobReview.write.outcomeSection')}
                  <span className='text-[var(--brand)]'> *</span>
                </p>
                <p className='mb-3 mt-0.5 text-[11px] text-[var(--muted)]'>
                  {t('jobReview.write.outcomeEditHint')}
                </p>
                <JobReviewOutcomePicker value={jobReviewOutcome} onChange={setJobReviewOutcome} />
              </section>

              <section
                data-autosave-section='source'
                className='rounded-2xl p-4 ring-1 ring-black/[0.06] sm:p-5'
              >
                <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                  {t('jobReview.write.sourceSection')}
                  <span className='text-[var(--brand)]'> *</span>
                </p>
                <p className='mb-3 mt-0.5 text-[11px] text-[var(--muted)]'>
                  {t('jobReview.write.sourceSectionDescription')}
                </p>
                <JobReviewSourcePicker
                  value={jobReviewSource}
                  orgId={jobReviewSourceOrgId}
                  onChange={(source, orgId) => {
                    setJobReviewSource(source)
                    setJobReviewSourceOrgId(orgId)
                  }}
                />
              </section>

              <button
                type='submit'
                disabled={
                  submitting || !postTitle.trim() || !jobReviewType || !jobReviewOutcome || !sourceComplete
                }
                className='inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgb(var(--brand-rgb)/0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-50'
              >
                {submitting
                  ? t('write.updating')
                  : !jobReviewOutcome
                    ? t('jobReview.write.errors.outcomeRequired')
                    : !sourceComplete
                      ? t('jobReview.write.selectSourceFirst')
                      : t('jobReview.write.updateSubmit')}
              </button>
              <p className='text-center text-[12px] leading-relaxed text-[var(--muted)]'>
                {t('write.updateFootnote')}
              </p>
            </>
          ) : (
            <>
              <CreateSection step={1} title={t('jobReview.write.typeSection')}>
                <JobReviewTypePicker
                  value={jobReviewType}
                  onChange={(next) => {
                    setJobReviewType(next)
                    requestSave()
                  }}
                />
              </CreateSection>

              <CreateSection
                step={2}
                title={t('jobReview.write.basicSection')}
                description={t('jobReview.write.basicSectionDescription')}
              >
                <Field label={t('write.titleLabel')} required>
                  <input
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className={inputClass}
                    placeholder={tCommunity(communityBoardKey(boardId, 'titlePlaceholder'))}
                  />
                </Field>
                <StatusEmployerSelect
                  className='mt-4'
                  value={location}
                  onChange={(next) => {
                    setLocation(next)
                    requestSave()
                  }}
                  label={tCommunity(communityBoardKey(boardId, 'locationLabel'))}
                />
              </CreateSection>

              <CreateSection
                step={3}
                title={t('jobReview.write.timelineSection')}
                description={t('write.timelineSectionDescription')}
              >
                <JobReviewTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  jobReviewType={jobReviewType}
                  mode='create'
                  onEntryCommit={requestSave}
                />
              </CreateSection>

              <CreateSection
                step={4}
                title={t('jobReview.write.tipsTitle')}
                description={t('jobReview.write.tipsDescription')}
              >
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder={t('jobReview.write.tipsPlaceholder')}
                  minHeightClassName='min-h-[200px]'
                  contentClassName='!text-[13px] !leading-[1.65]'
                  simpleToolbar
                  maxLength={COMMUNITY_BODY_MAX}
                />
              </CreateSection>

              <CreateSection
                step={5}
                title={t('jobReview.write.outcomeSection')}
                description={t('jobReview.write.outcomeSectionDescription')}
              >
                <JobReviewOutcomePicker value={jobReviewOutcome} onChange={setJobReviewOutcome} />
              </CreateSection>

              <CreateSection
                step={6}
                title={t('jobReview.write.sourceSection')}
                description={t('jobReview.write.sourceSectionDescription')}
              >
                <JobReviewSourcePicker
                  value={jobReviewSource}
                  orgId={jobReviewSourceOrgId}
                  onChange={(source, orgId) => {
                    setJobReviewSource(source)
                    setJobReviewSourceOrgId(orgId)
                  }}
                />
              </CreateSection>

              <WriteDraftActions
                onSave={handleSaveDraft}
                savedAt={draftSavedAt}
                disabled={submitting}
              >
                <button
                  type='submit'
                  disabled={
                    submitting || !postTitle.trim() || !jobReviewType || !jobReviewOutcome || !sourceComplete
                  }
                  className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
                >
                  {submitting
                    ? t('write.submitting')
                    : !jobReviewType
                      ? t('write.selectTypeFirst')
                      : !jobReviewOutcome
                        ? t('jobReview.write.errors.outcomeRequired')
                        : !sourceComplete
                          ? t('jobReview.write.selectSourceFirst')
                          : t('write.submit')}
                </button>
              </WriteDraftActions>
              <p className='text-center text-[12px] text-[var(--muted)]'>
                {t('jobReview.write.createFootnote')}
              </p>
            </>
          )}

          <p className='text-center text-[12px] text-[var(--muted)]'>
            <Link
              href={href(`/${boardId}`)}
              className='underline-offset-2 hover:underline'
            >
              {t('write.backToList')}
            </Link>
          </p>
        </form>
      </div>

      {!isEdit ? (
        <JobReviewWriteOrientationModal
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

function CreateHero({ writeLabel }: { writeLabel: string }) {
  const t = useT('reviews')
  return (
    <div>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        {t('write.createEyebrow')}
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {writeLabel}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        {t('jobReview.write.createIntro')}
      </p>
    </div>
  )
}

function UpdateHero({
  title,
  location,
  jobReviewType,
  recordCount,
}: {
  title: string
  location: string
  jobReviewType: JobReviewTypeId | null
  recordCount: number
}) {
  const t = useT('reviews')
  const style = getJobReviewTypeStyle(jobReviewType)
  return (
    <div
      className='overflow-hidden rounded-2xl ring-1 ring-black/[0.06]'
      style={{ backgroundColor: style.soft }}
    >
      <div className='border-b border-black/[0.06] px-4 py-4 sm:px-5'>
        <p
          className='text-[11px] font-semibold tracking-[0.08em]'
          style={{ color: style.accent }}
        >
          {t('jobReview.write.updateEyebrow')}
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          {t('jobReview.write.updateTitle')}
        </h1>
        <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('write.updateIntro')}
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        <JobReviewTypeBadge type={jobReviewType} />
        <span className='min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]'>
          {title || t('write.untitled')}
        </span>
        {location.trim() ? (
          <span className='text-[12px] text-[var(--muted)]'>
            · {location.trim()}
          </span>
        ) : null}
        <span className='ml-auto text-[11px] font-medium text-[var(--muted)]'>
          {t('write.existingCount', { count: recordCount })}
        </span>
      </div>
    </div>
  )
}

function CreateSection({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section data-autosave-section={`step-${step}`}>
      <div className='mb-3 flex items-start gap-3'>
        <span className='inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[12px] font-bold text-white'>
          {step}
        </span>
        <div className='min-w-0'>
          <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
            {title}
          </h2>
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
  'mt-1.5 h-11 w-full rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20'

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn(className)}>
      <span className='block text-[13px] font-medium text-[var(--foreground)]'>
        {label}
        {required ? <span className='text-[var(--brand)]'> *</span> : null}
      </span>
      {children}
    </label>
  )
}

function hasJobReviewDraftContent(data: JobReviewWriteDraft) {
  return Boolean(
    data.postTitle.trim() ||
      htmlToPlainText(data.contentHtml) ||
      data.location.trim() ||
      data.jobReviewType ||
      data.timeline.some(isJobReviewTimelineEntryFilled),
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br />')
}
