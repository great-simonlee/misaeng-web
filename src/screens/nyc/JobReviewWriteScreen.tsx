'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { LoadingState, TipTapEditor } from '@components'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  updateCommunityPostRequest,
} from '@lib/community/client'
import {
  JOB_REVIEW_TIPS_MAX,
  JOB_REVIEW_TYPES,
  createEmptyJobReviewTimelineEntry,
  getJobReviewTypeLabel,
  getJobReviewTypeStyle,
  isJobReviewBoard,
  isJobReviewTimelineEntryComplete,
  isJobReviewTimelineEntryFilled,
  normalizeJobReviewTimeline,
  type JobReviewTimelineEntry,
} from '@lib/community/jobReview'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import { isSchoolVerified } from '@lib/community/schoolGate'
import {
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { JobReviewTypeId } from '@/types/nyc'
import {
  BoardBackLink,
  BoardPageShell,
} from '@widgets/nyc/BoardPageShell'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { JobReviewTimelineEditor } from '@widgets/nyc/JobReviewTimelineEditor'
import { JobReviewTypeBadge, JobReviewTypePicker } from '@widgets/nyc/JobReviewTypeBadge'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'

interface JobReviewWriteScreenProps {
  title: string
  editPostId?: string
}

export function JobReviewWriteScreen({
  title,
  editPostId,
}: JobReviewWriteScreenProps) {
  const boardId: NycCommunityBoardId = 'job-review'
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId
    ? `/nyc/${boardId}/${editPostId}/edit`
    : `/nyc/${boardId}/new`
  const { user, profile, loading, isAuthenticated } =
    useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editPostId))
  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [jobReviewType, setJobReviewType] = useState<JobReviewTypeId | null>(null)
  const [timeline, setTimeline] = useState<JobReviewTimelineEntry[]>([
    createEmptyJobReviewTimelineEntry(),
  ])
  const [existingTimelineIds, setExistingTimelineIds] = useState<string[]>([])
  const [showMoreSettings, setShowMoreSettings] = useState(false)

  useEffect(() => {
    if (!editPostId || !user?.uid) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await fetchCommunityPost(editPostId)
        if (cancelled) return
        if (!post || !isJobReviewBoard(post.categoryId)) {
          toastError('글을 찾을 수 없어요')
          router.replace('/nyc/me/posts')
          return
        }
        if (post.authorUid !== user.uid) {
          toastError('수정 권한이 없어요')
          router.replace(`/nyc/${boardId}/${post.id}`)
          return
        }
        setPostTitle(post.title)
        const bodyPlain = htmlToPlainText(post.contentHtml || '')
        setContentHtml(
          bodyPlain
            ? post.contentHtml
            : post.jobReviewTips?.trim()
              ? `<p>${escapeHtml(post.jobReviewTips.trim())}</p>`
              : '',
        )
        setLocation(post.location)
        setIndustry(post.jobReviewIndustry?.trim() || '')
        setJobReviewType(post.jobReviewType)
        const loadedTimeline = post.jobReviewTimeline?.length
          ? post.jobReviewTimeline
          : []
        setExistingTimelineIds(loadedTimeline.map((entry) => entry.id))
        setTimeline(loadedTimeline.length ? loadedTimeline : [])
      } catch (err) {
        if (!cancelled) {
          toastError(getErrorMessage(err, '글을 불러오지 못했어요'))
          router.replace('/nyc/me/posts')
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editPostId, user?.uid, router, toastError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) return

    if (!jobReviewType) {
      toastError('인턴 / 신입 / 경력 / 계약 중 유형을 선택해 주세요')
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(
        isEdit
          ? '다음 지원자에게 전할 팁이 비어 있어요. 글 정보에서 확인해 주세요'
          : '다음 지원자에게 전할 팁을 입력해 주세요',
      )
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        `팁은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요`,
      )
      return
    }

    const normalizedTimeline = normalizeJobReviewTimeline(timeline)
    if (normalizedTimeline.length === 0) {
      toastError(
        isEdit
          ? '채용 단계 기록을 최소 1건 남겨 주세요'
          : '첫 채용 단계(날짜 + 내용)를 입력해 주세요',
      )
      return
    }
    const incomplete = timeline.find(
      (entry) =>
        isJobReviewTimelineEntryFilled(entry) &&
        !isJobReviewTimelineEntryComplete(entry),
    )
    if (incomplete) {
      toastError('작성 중인 기록에 날짜와 내용을 함께 입력해 주세요')
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
      }

      const post =
        isEdit && editPostId
          ? await updateCommunityPostRequest(editPostId, payload)
          : await createCommunityPostRequest({
              categoryId: boardId,
              ...payload,
              authorNickname: profile?.nickname?.trim() || null,
              authorPhotoURL: profile?.photoURL?.trim() || null,
              authorSchoolId: profile?.verifiedSchoolId ?? null,
              authorSchoolName: profile?.verifiedSchoolName ?? null,
            })

      success(
        isEdit
          ? '진행 기록을 업데이트했어요. 목록 맨 위로 올라갔습니다'
          : '후기를 등록했어요. 나중에 진행 상황을 이어서 추가할 수 있어요',
      )
      router.push(`/nyc/${boardId}/${post.id}`)
    } catch (err) {
      toastError(getErrorMessage(err, '저장에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !isAuthenticated) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState fullPage label='로그인 확인 중…' />
      </BoardPageShell>
    )
  }

  if (!isSchoolVerified(profile)) {
    return <SchoolVerificationRequired nextPath={loginNext} />
  }

  if (loadingEdit) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState fullPage label='글을 불러오는 중…' />
      </BoardPageShell>
    )
  }

  return (
    <BoardPageShell width='narrow'>
      <div className='pb-16 pt-4 sm:pt-6'>
        <BoardBackLink
          href={
            isEdit && editPostId
              ? `/nyc/${boardId}/${editPostId}`
              : `/nyc/${boardId}`
          }
          label={isEdit ? '글로 돌아가기' : `${title} 목록`}
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
          <CreateHero writeLabel={meta.writeLabel} />
        )}

        <CommunityWritingGuidelines className='mt-5' />

        <form onSubmit={(e) => void handleSubmit(e)} className='mt-6 space-y-8'>
          {isEdit ? (
            <>
              <section>
                <JobReviewTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  jobReviewType={jobReviewType}
                  mode='update'
                  existingEntryIds={existingTimelineIds}
                />
              </section>

              <section className='overflow-hidden rounded-2xl ring-1 ring-black/[0.06]'>
                <button
                  type='button'
                  onClick={() => setShowMoreSettings((prev) => !prev)}
                  className='flex w-full items-center justify-between gap-3 bg-[#fafafa] px-4 py-3.5 text-left touch-manipulation'
                >
                  <div>
                    <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                      글 정보 수정
                    </p>
                    <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                      제목·회사·팁을 바꾸고 싶을 때만 열어 주세요
                    </p>
                  </div>
                  <span className='text-[12px] font-medium text-[var(--brand)]'>
                    {showMoreSettings ? '접기' : '열기'}
                  </span>
                </button>
                {showMoreSettings ? (
                  <div className='space-y-5 border-t border-black/[0.04] bg-white p-4 sm:p-5'>
                    <Field label='제목' required>
                      <input
                        required
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className={inputClass}
                        placeholder={meta.titlePlaceholder}
                      />
                    </Field>
                    <Field label={meta.locationLabel}>
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className={inputClass}
                        placeholder={meta.locationPlaceholder}
                      />
                    </Field>
                    <Field label='업계 (선택)' className='mt-4'>
                      <input
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className={inputClass}
                        placeholder='테크, 금융, 컨설팅'
                      />
                    </Field>
                    <div>
                      <p className='text-[13px] font-medium text-[var(--foreground)]'>
                        다음 지원자에게
                      </p>
                      <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                        면접·서류·플랫폼 선택 등 꼭 알려주고 싶은 팁
                      </p>
                      <div className='mt-1.5'>
                        <TipTapEditor
                          value={contentHtml}
                          onChange={setContentHtml}
                          placeholder='예: OA 전에 LC medium 2문제 타입 연습하면 좋아요.'
                          minHeightClassName='min-h-[160px]'
                          maxLength={COMMUNITY_BODY_MAX}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <button
                type='submit'
                disabled={submitting || !postTitle.trim() || !jobReviewType}
                className='inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-50'
              >
                {submitting ? '업데이트 중…' : '채용 단계 업데이트'}
              </button>
              <p className='text-center text-[12px] leading-relaxed text-[var(--muted)]'>
                저장하면 목록 맨 위로 올라가고, 다른 사람에게도 최신 채용
                과정이 보입니다.
              </p>
            </>
          ) : (
            <>
              <CreateSection
                step={1}
                title='어떤 유형인가요?'
                description='인턴 · 신입 · 경력 · 계약 중 해당하는 것을 선택해 주세요'
              >
                <JobReviewTypePicker
                  value={jobReviewType}
                  onChange={setJobReviewType}
                />
                {jobReviewType ? (
                  <div
                    className='mt-3 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-black/[0.05]'
                    style={{
                      backgroundColor: getJobReviewTypeStyle(jobReviewType).soft,
                    }}
                  >
                    {
                      JOB_REVIEW_TYPES.find((item) => item.id === jobReviewType)
                        ?.summary
                    }
                  </div>
                ) : null}
              </CreateSection>

              <CreateSection
                step={2}
                title='기본 정보'
                description='제목, 회사, 업계를 적어 주세요'
              >
                <Field label='제목' required>
                  <input
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className={inputClass}
                    placeholder={meta.titlePlaceholder}
                  />
                </Field>
                <Field label='회사 (선택)' className='mt-4'>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={inputClass}
                    placeholder='Google, Meta, JP Morgan'
                  />
                </Field>
                <Field label='업계 (선택)' className='mt-4'>
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={inputClass}
                    placeholder='테크, 금융, 컨설팅'
                  />
                </Field>
              </CreateSection>

              <CreateSection
                step={3}
                title='첫 채용 단계'
                description='날짜를 고른 뒤, 단계·플랫폼·서류·면접·결과 중 필요한 항목을 선택하고, 단계 후기를 작성하세요'
              >
                <JobReviewTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  jobReviewType={jobReviewType}
                  mode='create'
                />
              </CreateSection>

              <CreateSection
                step={4}
                title='다음 지원자에게'
                description='면접·서류·플랫폼 선택 등 꼭 알려주고 싶은 팁'
              >
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder='예: OA 전에 LC medium 2문제 타입 연습하면 좋아요. Handshake보다 LinkedIn referral이 응답률 높았습니다.'
                  minHeightClassName='min-h-[200px]'
                  maxLength={COMMUNITY_BODY_MAX}
                />
              </CreateSection>

              <button
                type='submit'
                disabled={submitting || !postTitle.trim() || !jobReviewType}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
              >
                {submitting
                  ? '등록 중…'
                  : !jobReviewType
                    ? '유형을 선택해 주세요'
                    : '후기 등록하기'}
              </button>
              <p className='text-center text-[12px] text-[var(--muted)]'>
                등록 후에도 면접·오퍼 등 새 단계를 이어서 추가할 수 있어요.
              </p>
            </>
          )}

          <p className='text-center text-[12px] text-[var(--muted)]'>
            <Link
              href={`/nyc/${boardId}`}
              className='underline-offset-2 hover:underline'
            >
              목록으로 돌아가기
            </Link>
          </p>
        </form>
      </div>
    </BoardPageShell>
  )
}

function CreateHero({ writeLabel }: { writeLabel: string }) {
  return (
    <div className='rounded-2xl bg-[#f7f8fa] px-4 py-5 ring-1 ring-black/[0.04] sm:px-5'>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        최초 등록
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {writeLabel}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        유형·회사·첫 채용 단계를 한 번에 세팅하는 화면이에요. 서류부터
        면접·오퍼까지 단계별로 남기고, 이후 새 단계는 업데이트에서
        한 건씩 추가하면 됩니다.
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
          채용 과정 업데이트
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          새 채용 단계 추가
        </h1>
        <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
          지금 추가할 날짜와 내용만 적어 주세요. 저장하면 목록 맨 위로
          올라갑니다.
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        <JobReviewTypeBadge type={jobReviewType} />
        <span className='min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]'>
          {title || '제목 없음'}
        </span>
        {location.trim() ? (
          <span className='text-[12px] text-[var(--muted)]'>
            · {location.trim()}
          </span>
        ) : null}
        <span className='ml-auto text-[11px] font-medium text-[var(--muted)]'>
          기존 {recordCount}건
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
  description: string
  children: ReactNode
}) {
  return (
    <section>
      <div className='mb-3 flex items-start gap-3'>
        <span className='inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[12px] font-bold text-white'>
          {step}
        </span>
        <div className='min-w-0'>
          <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
            {title}
          </h2>
          <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
            {description}
          </p>
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br />')
}
