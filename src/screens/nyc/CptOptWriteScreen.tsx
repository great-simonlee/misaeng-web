'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { LoadingState, TipTapEditor } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { hrefForCommunityPost } from '@lib/constants/cities'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  updateCommunityPostRequest,
} from '@lib/community/client'
import {
  CPT_OPT_TIPS_MAX,
  getCptOptTypeLabel,
  getCptOptTypeStyle,
  isTimelineEntryComplete,
  normalizeCptOptTimeline,
  type CptOptTimelineEntry,
} from '@lib/community/cptOpt'
import {
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from '@lib/community/writeDraft'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import { isAccountSuspended, isIdentityVerified } from '@lib/community/schoolGate'
import {
  isStatusCommunityBoard,
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CptOptTypeId } from '@/types/nyc'
import {
  BoardBackLink,
  BoardPageShell,
} from '@widgets/nyc/BoardPageShell'
import { CptOptTimelineEditor } from '@widgets/nyc/CptOptTimelineEditor'
import { CptOptTypeBadge, CptOptTypePicker } from '@widgets/nyc/CptOptTypeBadge'
import {
  CptOptWriteOrientationModal,
  useStatusWriteOrientation,
} from '@widgets/nyc/CptOptWriteOrientationModal'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'
import { StatusEmployerSelect } from '@widgets/nyc/StatusEmployerSelect'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'

type CptOptWriteDraft = {
  postTitle: string
  contentHtml: string
  location: string
  cptOptType: CptOptTypeId | null
  timeline: CptOptTimelineEntry[]
}

interface CptOptWriteScreenProps {
  title: string
  editPostId?: string
}

export function CptOptWriteScreen({
  title,
  editPostId,
}: CptOptWriteScreenProps) {
  const city = useCity()
  const href = useCityPath()
  const boardId: NycCommunityBoardId = 'status'
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId
    ? href(`/${boardId}/${editPostId}/edit`)
    : href(`/${boardId}/new`)
  const { user, profile, loading, isAuthenticated } =
    useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editPostId))
  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [location, setLocation] = useState('')
  const [cptOptType, setCptOptType] = useState<CptOptTypeId | null>(null)
  const [timeline, setTimeline] = useState<CptOptTimelineEntry[]>([])
  const [existingTimelineIds, setExistingTimelineIds] = useState<string[]>([])
  const [showMoreSettings, setShowMoreSettings] = useState(false)
  const [draftHydrated, setDraftHydrated] = useState(isEdit)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const orientation = useStatusWriteOrientation(!isEdit)

  useEffect(() => {
    if (isEdit || !user?.uid) return
    const stored = loadWriteDraft<CptOptWriteDraft>('status', city, user.uid)
    if (stored) {
      setPostTitle(stored.data.postTitle ?? '')
      setContentHtml(stored.data.contentHtml ?? '')
      setLocation(stored.data.location ?? '')
      setCptOptType(stored.data.cptOptType ?? null)
      setTimeline(Array.isArray(stored.data.timeline) ? stored.data.timeline : [])
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
        if (!post || !isStatusCommunityBoard(post.categoryId)) {
          toastError('글을 찾을 수 없어요')
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError('수정 권한이 없어요')
          router.replace(hrefForCommunityPost(post, city))
          return
        }
        setPostTitle(post.title)
        const bodyPlain = htmlToPlainText(post.contentHtml || '')
        setContentHtml(
          bodyPlain
            ? post.contentHtml
            : post.cptOptTips?.trim()
              ? `<p>${escapeHtml(post.cptOptTips.trim())}</p>`
              : '',
        )
        setLocation(post.location)
        setCptOptType(post.cptOptType)
        const loadedTimeline = post.cptOptTimeline?.length
          ? post.cptOptTimeline
          : []
        setExistingTimelineIds(loadedTimeline.map((entry) => entry.id))
        setTimeline(loadedTimeline.length ? loadedTimeline : [])
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
    if (!user?.email) return

    if (!cptOptType) {
      toastError('CPT / OPT / STEM OPT / 비자 / 영주권 중 유형을 선택해 주세요')
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(
        isEdit
          ? '조심해야 할 점이 비어 있어요. 글 정보에서 확인해 주세요'
          : '조심해야 할 점을 입력해 주세요',
      )
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        `조심해야 할 점은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요`,
      )
      return
    }

    const normalizedTimeline = normalizeCptOptTimeline(timeline)
    if (normalizedTimeline.length === 0) {
      toastError(
        isEdit
          ? '진행 기록을 최소 1건 남겨 주세요'
          : '진행 기록(날짜 + 내용)을 최소 1건 입력해 주세요',
      )
      return
    }
    const incomplete = timeline.find(
      (entry) =>
        (entry.date.trim() ||
          entry.prepared.trim() ||
          entry.submitted.trim() ||
          entry.resultReceived.trim() ||
          entry.nextStep.trim()) &&
        !isTimelineEntryComplete(entry),
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
        detail: getCptOptTypeLabel(cptOptType),
        cptOptType,
        cptOptTimeline: normalizedTimeline,
        cptOptTips: plain.slice(0, CPT_OPT_TIPS_MAX) || null,
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

      if (!isEdit && user.uid) {
        clearWriteDraft('status', city, user.uid)
      }
      success(
        isEdit
          ? '진행 기록을 업데이트했어요. 목록 맨 위로 올라갔습니다'
          : '후기를 등록했어요. 나중에 진행 상황을 이어서 추가할 수 있어요',
      )
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(getErrorMessage(err, '저장에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    if (!user?.uid) return
    try {
      const savedAt = saveWriteDraft<CptOptWriteDraft>('status', city, user.uid, {
        postTitle,
        contentHtml,
        location,
        cptOptType,
        timeline,
      })
      setDraftSavedAt(savedAt)
      success('임시 저장했어요')
    } catch {
      toastError('임시 저장에 실패했어요')
    }
  }

  if (loading || !isAuthenticated || !draftHydrated) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState fullPage label='로그인 확인 중…' />
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
              ? href(`/${boardId}/${editPostId}`)
              : href(`/${boardId}`)
          }
          label={isEdit ? '글로 돌아가기' : `${title} 목록`}
          className='mb-5'
        />

        {isEdit ? (
          <UpdateHero
            title={postTitle}
            location={location}
            cptOptType={cptOptType}
            recordCount={existingTimelineIds.length}
          />
        ) : (
          <CreateHero writeLabel={meta.writeLabel} />
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className='mt-6 space-y-8'>
          {isEdit ? (
            <>
              <section>
                <CptOptTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  cptOptType={cptOptType}
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
                      제목·위치·조심해야 할 점을 바꾸고 싶을 때만 열어 주세요
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
                    <StatusEmployerSelect
                      value={location}
                      onChange={setLocation}
                      label={meta.locationLabel}
                    />
                    <div>
                      <p className='text-[13px] font-medium text-[var(--foreground)]'>
                        조심해야 할 점
                      </p>
                      <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                        다음 사람이 실수하지 않도록 꼭 알려주고 싶은 팁
                      </p>
                      <div className='mt-1.5'>
                        <TipTapEditor
                          value={contentHtml}
                          onChange={setContentHtml}
                          placeholder='예: 회사 시작일 2–3주 전에 OGS에 서류를 넣으세요. 학교마다 포털이 달라 OGS 체크리스트를 먼저 확인하세요.'
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

              <button
                type='submit'
                disabled={submitting || !postTitle.trim() || !cptOptType}
                className='inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-50'
              >
                {submitting ? '업데이트 중…' : '진행 기록 업데이트'}
              </button>
              <p className='text-center text-[12px] leading-relaxed text-[var(--muted)]'>
                저장하면 목록 맨 위로 올라가고, 다른 사람에게도 최신 진행
                상황이 보입니다.
              </p>
            </>
          ) : (
            <>
              <CreateSection step={1} title='어떤 유형인가요?'>
                <CptOptTypePicker
                  value={cptOptType}
                  onChange={setCptOptType}
                />
              </CreateSection>

              <CreateSection
                step={2}
                title='기본 정보'
                description='제목과 회사·기관을 입력해 주세요'
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
                <StatusEmployerSelect
                  className='mt-4'
                  value={location}
                  onChange={setLocation}
                  label={meta.locationLabel}
                />
              </CreateSection>

              <CreateSection
                step={3}
                title='진행 기록'
                description='날짜별로 여러 건을 추가·수정·삭제할 수 있어요'
              >
                <CptOptTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  cptOptType={cptOptType}
                  mode='create'
                />
              </CreateSection>

              <CreateSection
                step={4}
                title='조심해야 할 점'
                description='다음 사람이 실수하지 않도록 꼭 알려주고 싶은 팁'
              >
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder='예: 회사 시작일 2–3주 전에 OGS에 서류를 넣으세요. 학교마다 포털이 달라 OGS 체크리스트를 먼저 확인하세요.'
                  minHeightClassName='min-h-[200px]'
                  contentClassName='!text-[13px] !leading-[1.65]'
                  simpleToolbar
                  maxLength={COMMUNITY_BODY_MAX}
                />
              </CreateSection>

              <WriteDraftActions
                onSave={handleSaveDraft}
                savedAt={draftSavedAt}
                disabled={submitting}
              >
                <button
                  type='submit'
                  disabled={submitting || !postTitle.trim() || !cptOptType}
                  className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
                >
                  {submitting
                    ? '등록 중…'
                    : !cptOptType
                      ? '유형을 선택해 주세요'
                      : '후기 등록하기'}
                </button>
              </WriteDraftActions>
              <p className='text-center text-[12px] text-[var(--muted)]'>
                등록 후에도 진행 기록을 이어서 추가·수정할 수 있어요.
              </p>
            </>
          )}

          <p className='text-center text-[12px] text-[var(--muted)]'>
            <Link
              href={href(`/${boardId}`)}
              className='underline-offset-2 hover:underline'
            >
              목록으로 돌아가기
            </Link>
          </p>
        </form>
      </div>

      {!isEdit ? (
        <CptOptWriteOrientationModal
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
  return (
    <div>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        최초 등록
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {writeLabel}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        유형을 고르고 날짜별 진행 기록을 남겨 주세요. 등록 후에도 이어서 추가할
        수 있어요.
      </p>
    </div>
  )
}

function UpdateHero({
  title,
  location,
  cptOptType,
  recordCount,
}: {
  title: string
  location: string
  cptOptType: CptOptTypeId | null
  recordCount: number
}) {
  const style = getCptOptTypeStyle(cptOptType)
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
          진행 업데이트
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          새 진행 기록 추가
        </h1>
        <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
          지금 추가할 날짜와 내용만 적어 주세요. 저장하면 목록 맨 위로
          올라갑니다.
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        <CptOptTypeBadge type={cptOptType} />
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
  description?: string
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br />')
}
