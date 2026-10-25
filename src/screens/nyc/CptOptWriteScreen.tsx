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
  localizeCommunityError,
} from '@lib/community/client'
import {
  CPT_OPT_TIPS_MAX,
  getCptOptTypeLabel,
  getCptOptTypeStyle,
  isTimelineEntryComplete,
  normalizeCptOptTimeline,
  type CptOptTimelineEntry,
} from '@lib/community/cptOpt'
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
  isStatusCommunityBoard,
  communityBoardKey,
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
          toastError(t('write.notFound'))
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError(t('write.noPermission'))
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
          toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('write.loadFailed')))
          router.replace(href('/me/posts'))
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [city, editPostId, href, user?.uid, router, toastError, t, tCommunity])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) return

    if (!cptOptType) {
      toastError(t('cptOpt.write.errors.typeRequired'))
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(
        isEdit
          ? t('cptOpt.write.errors.tipsEmptyEdit')
          : t('cptOpt.write.errors.tipsRequired'),
      )
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        t('cptOpt.write.errors.tipsTooLong', {
          max: format.number(COMMUNITY_BODY_MAX),
        }),
      )
      return
    }

    const normalizedTimeline = normalizeCptOptTimeline(timeline)
    if (normalizedTimeline.length === 0) {
      toastError(
        isEdit
          ? t('cptOpt.write.errors.timelineRequiredEdit')
          : t('cptOpt.write.errors.timelineRequired'),
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
      toastError(t('write.errors.timelineIncomplete'))
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
          ? t('cptOpt.write.updated')
          : t('cptOpt.write.created'),
      )
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('write.saveFailed')))
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
      success(t('write.draftSaved'))
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
            cptOptType={cptOptType}
            recordCount={existingTimelineIds.length}
          />
        ) : (
          <CreateHero writeLabel={tCommunity(communityBoardKey(boardId, 'writeLabel'))} />
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
                      {t('cptOpt.write.moreSettingsTitle')}
                    </p>
                    <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                      {t('cptOpt.write.moreSettingsHint')}
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
                      onChange={setLocation}
                      label={tCommunity(communityBoardKey(boardId, 'locationLabel'))}
                    />
                    <div>
                      <p className='text-[13px] font-medium text-[var(--foreground)]'>
                        {t('cptOpt.write.tipsTitle')}
                      </p>
                      <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                        {t('cptOpt.write.tipsDescription')}
                      </p>
                      <div className='mt-1.5'>
                        <TipTapEditor
                          value={contentHtml}
                          onChange={setContentHtml}
                          placeholder={t('cptOpt.write.tipsPlaceholder')}
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
                className='inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgb(var(--brand-rgb)/0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-50'
              >
                {submitting ? t('write.updating') : t('cptOpt.write.updateSubmit')}
              </button>
              <p className='text-center text-[12px] leading-relaxed text-[var(--muted)]'>
                {t('write.updateFootnote')}
              </p>
            </>
          ) : (
            <>
              <CreateSection step={1} title={t('cptOpt.write.typeSection')}>
                <CptOptTypePicker
                  value={cptOptType}
                  onChange={setCptOptType}
                />
              </CreateSection>

              <CreateSection
                step={2}
                title={t('cptOpt.write.basicSection')}
                description={t('cptOpt.write.basicSectionDescription')}
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
                  onChange={setLocation}
                  label={tCommunity(communityBoardKey(boardId, 'locationLabel'))}
                />
              </CreateSection>

              <CreateSection
                step={3}
                title={t('cptOpt.write.timelineSection')}
                description={t('write.timelineSectionDescription')}
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
                title={t('cptOpt.write.tipsTitle')}
                description={t('cptOpt.write.tipsDescription')}
              >
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder={t('cptOpt.write.tipsPlaceholder')}
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
                    ? t('write.submitting')
                    : !cptOptType
                      ? t('write.selectTypeFirst')
                      : t('write.submit')}
                </button>
              </WriteDraftActions>
              <p className='text-center text-[12px] text-[var(--muted)]'>
                {t('cptOpt.write.createFootnote')}
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
        {t('cptOpt.write.createIntro')}
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
  const t = useT('reviews')
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
          {t('cptOpt.write.updateEyebrow')}
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          {t('cptOpt.write.updateTitle')}
        </h1>
        <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('write.updateIntro')}
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        <CptOptTypeBadge type={cptOptType} />
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
