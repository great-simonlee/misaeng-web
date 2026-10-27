'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { LoadingState, PhotoUploadZone, TipTapEditor } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath, hrefForCommunityPost } from '@lib/constants/cities'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  fetchMyCommunityPosts,
  updateCommunityPostRequest,
  localizeCommunityError,
} from '@lib/community/client'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import {
  getRoommateFormConfigText,
  getRoommateIntent,
  getRoommateLookingForLabel,
  getRoommateLookingForOptionsByIntent,
  getRoommateLookingForStyle,
  getRoommateStayLength,
  isRoommateLookingFor,
  normalizeRoommateLookingFor,
  roommateToday,
  ROOMMATE_BUDGET_MAX,
  ROOMMATE_GALLERY_MAX,
  ROOMMATE_INTENT_OPTIONS,
  ROOMMATE_TITLE_MAX,
  type RoommateIntent,
  type RoommateLookingFor,
} from '@lib/community/roommate'
import {
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from '@lib/community/writeDraft'
import { isAccountSuspended, isIdentityVerified } from '@lib/community/schoolGate'
import {
  communityBoardKey,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'
import {
  BoardBackLink,
  BoardPageShell,
} from '@widgets/nyc/BoardPageShell'
import {
  RoommateWriteOrientationModal,
  useRoommateWriteOrientation,
} from '@widgets/nyc/CptOptWriteOrientationModal'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { SortablePhotoGrid } from '@widgets/nyc/SortablePhotoGrid'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'
import { RoommatePostCard, type RoommateCardPost } from '@widgets/nyc/RoommatePostCard'

type RoommateWriteDraft = {
  postTitle: string
  contentHtml: string
  location: string
  lookingFor: RoommateLookingFor | null
  intent: RoommateIntent | null
  budgetMax: string
  moveInDate: string
  moveOutDate: string
  photoUrls: string[]
}

/** 입력 칸 id (`roommate-field-<name>`) — 검증 실패 시 그 칸으로 스크롤 */
type RoommateField = 'type' | 'title' | 'location' | 'budget' | 'moveIn' | 'moveOut' | 'body'

interface RoommateWriteScreenProps {
  title: string
  editPostId?: string
}

export function RoommateWriteScreen({
  title,
  editPostId,
}: RoommateWriteScreenProps) {
  const t = useT('housing')
  const tCommunity = useT('community')
  const city = useCity()
  const href = useCityPath()
  const boardId: NycCommunityBoardId = 'roommate'
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId
    ? href(`/${boardId}/${editPostId}/edit`)
    : href(`/${boardId}/new`)
  const { user, profile, loading, isAuthenticated } = useRequireAuth(loginNext)
  const { error: toastError, success } = useToast()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editPostId))
  const [checkingExisting, setCheckingExisting] = useState(!editPostId)

  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [location, setLocation] = useState('')
  const [lookingFor, setLookingFor] = useState<RoommateLookingFor | null>(null)
  const [intent, setIntent] = useState<RoommateIntent | null>(null)
  const [budgetMax, setBudgetMax] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [moveOutDate, setMoveOutDate] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [draftHydrated, setDraftHydrated] = useState(isEdit)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RoommateField, string>>
  >({})
  const orientation = useRoommateWriteOrientation(!isEdit)

  useEffect(() => {
    if (isEdit || !user?.uid) return
    const stored = loadWriteDraft<RoommateWriteDraft>(
      'roommate',
      city,
      user.uid,
    )
    if (stored) {
      setPostTitle(stored.data.postTitle ?? '')
      setContentHtml(stored.data.contentHtml ?? '')
      setLocation(stored.data.location ?? '')
      const storedLookingFor = isRoommateLookingFor(stored.data.lookingFor)
        ? stored.data.lookingFor
        : null
      setLookingFor(storedLookingFor)
      setIntent(
        stored.data.intent ?? getRoommateIntent(storedLookingFor),
      )
      setBudgetMax(stored.data.budgetMax ?? '')
      setMoveInDate(stored.data.moveInDate ?? '')
      setMoveOutDate(stored.data.moveOutDate ?? '')
      setPhotoUrls(
        Array.isArray(stored.data.photoUrls)
          ? stored.data.photoUrls.filter(Boolean).slice(0, ROOMMATE_GALLERY_MAX)
          : [],
      )
      setDraftSavedAt(stored.savedAt)
    }
    setDraftHydrated(true)
  }, [city, isEdit, user?.uid])

  const formConfig = useMemo(
    () => getRoommateFormConfigText(lookingFor, t),
    [lookingFor, t],
  )
  const subtypeOptions = useMemo(
    () => getRoommateLookingForOptionsByIntent(intent),
    [intent],
  )
  const stayLength = getRoommateStayLength(moveInDate, moveOutDate)
  const [previewCreatedAt] = useState(() => Date.now())
  /** 목록 카드 미리보기 — 유형과 제목이 있으면 */
  const previewPost = useMemo<RoommateCardPost | null>(() => {
    if (!lookingFor || !postTitle.trim()) return null
    const budget = budgetMax.trim() ? Number(budgetMax) : null
    return {
      id: editPostId ?? 'preview',
      categoryId: boardId,
      city,
      title: postTitle.trim(),
      description: htmlToPlainText(contentHtml).slice(0, 200),
      location: location.trim(),
      detail: '',
      roommateLookingFor: lookingFor,
      roommateBudgetMax: budget != null && Number.isFinite(budget) ? budget : null,
      roommateMoveInDate: moveInDate || null,
      roommateMoveOutDate: moveOutDate || null,
      galleryPhotos: photoUrls.map((imageUrl, index) => ({
        id: `preview_${index}`,
        imageUrl,
        caption: '',
      })),
      thumbnailUrl: photoUrls[0] ?? null,
      authorNickname: profile?.nickname?.trim() || null,
      authorPhotoURL: profile?.photoURL?.trim() || null,
      authorSchoolId: profile?.verifiedSchoolId ?? null,
      viewCount: 0,
      createdAt: previewCreatedAt,
    }
  }, [
    lookingFor,
    postTitle,
    budgetMax,
    editPostId,
    boardId,
    city,
    contentHtml,
    location,
    moveInDate,
    moveOutDate,
    photoUrls,
    profile?.nickname,
    profile?.photoURL,
    profile?.verifiedSchoolId,
    previewCreatedAt,
  ])

  function selectIntent(next: RoommateIntent) {
    setIntent(next)
    setLookingFor((prev) => {
      if (prev && getRoommateIntent(prev) === next) return prev
      return null
    })
  }

  useEffect(() => {
    if (editPostId || !user?.uid) {
      setCheckingExisting(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const posts = await fetchMyCommunityPosts()
        if (cancelled) return
        const existing = posts.find(
          (item) => item.categoryId === 'roommate' && item.status === 'open',
        )
        if (existing) {
          toastError(t('roommate.write.errors.alreadyPosted'))
          router.replace(href(`/${boardId}/${existing.id}/edit`))
          return
        }
      } catch {
        // 목록 실패 시에도 작성은 서버에서 한 번 더 막음
      } finally {
        if (!cancelled) setCheckingExisting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editPostId, href, user?.uid, boardId, router, toastError, t])

  useEffect(() => {
    if (!editPostId || !user?.uid) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await fetchCommunityPost(editPostId)
        if (cancelled) return
        if (!post) {
          toastError(t('roommate.write.errors.notFound'))
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError(t('roommate.write.errors.noPermission'))
          router.replace(hrefForCommunityPost(post, city))
          return
        }
        if (post.categoryId !== boardId) {
          router.replace(hrefForCommunityPost(post, city, 'edit'))
          return
        }
        setPostTitle(post.title.slice(0, ROOMMATE_TITLE_MAX))
        setContentHtml(post.contentHtml)
        setLocation(post.location)
        const normalized = normalizeRoommateLookingFor(
          post.roommateLookingFor,
          post.detail,
        )
        setLookingFor(normalized)
        setIntent(getRoommateIntent(normalized))
        setBudgetMax(
          post.roommateBudgetMax != null
            ? String(post.roommateBudgetMax)
            : '',
        )
        setMoveInDate(post.roommateMoveInDate?.trim() || '')
        setMoveOutDate(post.roommateMoveOutDate?.trim() || '')
        const photos = [
          ...(post.galleryPhotos ?? [])
            .map((item) => item.imageUrl?.trim())
            .filter(Boolean),
          post.thumbnailUrl?.trim() || '',
        ].filter(Boolean) as string[]
        setPhotoUrls([...new Set(photos)].slice(0, ROOMMATE_GALLERY_MAX))
      } catch (err) {
        if (!cancelled) {
          toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('roommate.write.errors.loadFailed')))
          router.replace(href('/me/posts'))
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [city, editPostId, href, user?.uid, boardId, router, toastError, t, tCommunity])

  function clearFieldError(field: RoommateField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  /** 칸 아래에 문구를 띄우고 그 칸으로 스크롤 (토스트도 같이) */
  function failField(field: RoommateField, message: string) {
    setFieldErrors({ [field]: message })
    toastError(message)
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`roommate-field-${field}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    if (!user?.email) {
      toastError(t('new.errors.loginRequired'))
      router.replace(cityLoginPath(city, loginNext))
      return
    }
    if (!lookingFor || !formConfig) {
      failField('type', t('roommate.write.errors.typeRequired'))
      return
    }
    const trimmedTitle = postTitle.trim()
    if (!trimmedTitle) {
      failField('title', t('roommate.write.errors.titleRequired'))
      return
    }
    if (trimmedTitle.length > ROOMMATE_TITLE_MAX) {
      failField('title', t('roommate.write.errors.titleTooLong', { max: ROOMMATE_TITLE_MAX }))
      return
    }
    if (formConfig.locationRequired && !location.trim()) {
      failField(
        'location',
        t('roommate.write.errors.fieldRequired', { field: formConfig.locationLabel }),
      )
      return
    }

    const budgetValue = budgetMax.trim()
      ? Number(budgetMax.replace(/,/g, ''))
      : null
    if (formConfig.budgetRequired && budgetValue == null) {
      failField(
        'budget',
        t('roommate.write.errors.fieldRequired', { field: formConfig.budgetLabel }),
      )
      return
    }
    if (
      budgetValue != null &&
      (!Number.isFinite(budgetValue) ||
        budgetValue < 0 ||
        budgetValue > ROOMMATE_BUDGET_MAX)
    ) {
      failField(
        'budget',
        t('roommate.write.errors.budgetRange', {
          max: ROOMMATE_BUDGET_MAX.toLocaleString('en-US'),
        }),
      )
      return
    }

    const start = moveInDate.trim()
    const end = moveOutDate.trim()
    if (formConfig.moveInStartRequired && !start) {
      failField(
        'moveIn',
        t('roommate.write.errors.fieldSelect', { field: formConfig.moveInStartLabel }),
      )
      return
    }
    if (!isEdit && start && start < roommateToday()) {
      failField('moveIn', t('roommate.write.errors.moveInPast'))
      return
    }
    if (formConfig.moveInEndRequired && !end) {
      failField(
        'moveOut',
        t('roommate.write.errors.fieldSelect', { field: formConfig.moveInEndLabel }),
      )
      return
    }
    if (start && end && end < start) {
      failField('moveOut', t('roommate.write.errors.endBeforeStart'))
      return
    }
    // 본문은 맨 아래 칸이라 위 칸들을 먼저 확인한다
    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      failField('body', t('roommate.write.errors.bodyRequired'))
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      failField(
        'body',
        t('roommate.write.errors.bodyTooLong', {
          max: COMMUNITY_BODY_MAX.toLocaleString('en-US'),
        }),
      )
      return
    }

    setSubmitting(true)
    try {
      const galleryPhotos = photoUrls
        .slice(0, ROOMMATE_GALLERY_MAX)
        .map((imageUrl, index) => ({
          id: `gallery_${index + 1}`,
          imageUrl,
          caption: '',
        }))
      const payload = {
        title: trimmedTitle,
        contentHtml,
        location: location.trim(),
        detail: getRoommateLookingForLabel(lookingFor),
        roommateLookingFor: lookingFor,
        roommateBudgetMax:
          budgetValue != null ? Math.floor(budgetValue) : null,
        roommateMoveInDate: start || null,
        roommateMoveOutDate: end || null,
        thumbnailUrl: photoUrls[0] ?? null,
        galleryPhotos,
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
        clearWriteDraft('roommate', city, user.uid)
      }
      success(isEdit ? t('roommate.write.updated') : t('roommate.write.created'))
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(
        getErrorMessage(localizeCommunityError(err, tCommunity),
          isEdit
            ? t('roommate.write.errors.updateFailed')
            : t('new.errors.submitFailed'),
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    if (!user?.uid) return
    try {
      const savedAt = saveWriteDraft<RoommateWriteDraft>(
        'roommate',
        city,
        user.uid,
        {
          postTitle,
          contentHtml,
          location,
          lookingFor,
          intent,
          budgetMax,
          moveInDate,
          moveOutDate,
          photoUrls: photoUrls.slice(0, ROOMMATE_GALLERY_MAX),
        },
      )
      setDraftSavedAt(savedAt)
      success(t('roommate.write.draftSaved'))
    } catch {
      toastError(t('roommate.write.errors.draftSaveFailed'))
    }
  }

  if (
    loading ||
    loadingEdit ||
    checkingExisting ||
    !draftHydrated ||
    !isAuthenticated ||
    !user
  ) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState
          fullPage
          label={
            !loading && !isAuthenticated
              ? t('new.redirectingToLogin')
              : checkingExisting
                ? t('roommate.write.checkingExisting')
                : undefined
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

  const [onePostBefore, onePostAfter = ''] = t(
    'roommate.write.onePostNotice',
  ).split('{limit}')

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
            isEdit
              ? t('roommate.write.backToPost')
              : t('roommate.write.backToList', { board: title })
          }
          className='mb-5'
        />

        {isEdit ? (
          <UpdateHero title={postTitle} lookingFor={lookingFor} />
        ) : (
          <CreateHero />
        )}

        {!isEdit ? (
          <div className='mt-4 rounded-xl bg-brand-soft px-4 py-3 text-[13px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-[var(--brand)]/15'>
            {onePostBefore}
            <strong className='text-[var(--foreground)]'>
              {t('roommate.write.onePostLimit')}
            </strong>
            {onePostAfter}
          </div>
        ) : null}

        {/* 브라우저 기본 말풍선 대신 칸 아래 문구로 안내 (handleSubmit에서 모두 검사) */}
        <form noValidate onSubmit={(e) => void handleSubmit(e)} className='mt-6 space-y-8'>
          <CreateSection step={1} title={t('roommate.write.steps.type')}>
            <div id='roommate-field-type' className='grid scroll-mt-24 grid-cols-2 gap-2'>
              {ROOMMATE_INTENT_OPTIONS.map((option) => {
                const active = intent === option.id
                return (
                  <button
                    key={option.id}
                    type='button'
                    onClick={() => {
                      selectIntent(option.id)
                      clearFieldError('type')
                    }}
                    className={cn(
                      'relative rounded-2xl px-3.5 py-3.5 text-left ring-1 touch-manipulation transition',
                      active
                        ? 'bg-brand-soft ring-[var(--foreground)] shadow-[0_0_0_1px_rgba(15,23,42,0.04)]'
                        : 'bg-white ring-black/[0.06] hover:ring-black/15',
                    )}
                  >
                    {active ? (
                      <span
                        className='absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-[var(--foreground)] text-[11px] font-bold text-white'
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : null}
                    <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
                      {t(`roommate.intents.${option.id}.label`)}
                    </span>
                    <span className='mt-1 block text-[12px] font-light leading-snug text-[var(--muted-foreground)]'>
                      {t(`roommate.intents.${option.id}.description`)}
                    </span>
                  </button>
                )
              })}
            </div>
            {intent ? (
              <div className='mt-4'>
                <p className='text-[13px] font-medium text-[var(--foreground)]'>
                  {t('roommate.write.subtype')}
                </p>
                <div className='mt-2 grid gap-2'>
                  {subtypeOptions.map((option) => {
                    const active = lookingFor === option.id
                    const style = getRoommateLookingForStyle(option.id)
                    return (
                      <button
                        key={option.id}
                        type='button'
                        onClick={() => {
                          setLookingFor(option.id)
                          clearFieldError('type')
                        }}
                        className={cn(
                          'relative rounded-2xl px-3.5 py-3.5 text-left ring-1 touch-manipulation transition',
                          active
                            ? 'ring-[var(--foreground)] shadow-[0_0_0_1px_rgba(15,23,42,0.04)]'
                            : 'bg-white ring-black/[0.06] hover:ring-black/15',
                        )}
                        style={
                          active ? { backgroundColor: style.soft } : undefined
                        }
                      >
                        {active ? (
                          <span
                            className='absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white'
                            style={{ backgroundColor: style.accent }}
                            aria-hidden
                          >
                            ✓
                          </span>
                        ) : null}
                        <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
                          {t(`roommate.lookingFor.${option.id}.label`)}
                        </span>
                        <span className='mt-1 block text-[12px] font-light leading-snug text-[var(--muted-foreground)]'>
                          {t(`roommate.lookingFor.${option.id}.description`)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
            <FieldError message={fieldErrors.type} />
          </CreateSection>

          <CreateSection
            step={2}
            title={t('roommate.write.steps.basics')}
            description={t('roommate.write.steps.basicsDescription')}
          >
            <Field
              label={t('roommate.write.fields.title')}
              required
              hint={`${postTitle.length}/${ROOMMATE_TITLE_MAX}`}
              error={fieldErrors.title}
            >
              <input
                id='roommate-field-title'
                required
                value={postTitle}
                maxLength={ROOMMATE_TITLE_MAX}
                aria-invalid={Boolean(fieldErrors.title) || undefined}
                onChange={(e) => {
                  setPostTitle(e.target.value.slice(0, ROOMMATE_TITLE_MAX))
                  clearFieldError('title')
                }}
                className={cn(inputClass, fieldErrors.title && inputErrorClass)}
                placeholder={
                  formConfig?.titlePlaceholder ?? tCommunity(communityBoardKey(boardId, 'titlePlaceholder'))
                }
              />
            </Field>

            {formConfig ? (
              <>
                <Field
                  label={formConfig.locationLabel}
                  required={formConfig.locationRequired}
                  className='mt-4'
                  error={fieldErrors.location}
                >
                  <input
                    id='roommate-field-location'
                    required={formConfig.locationRequired}
                    value={location}
                    aria-invalid={Boolean(fieldErrors.location) || undefined}
                    onChange={(e) => {
                      setLocation(e.target.value)
                      clearFieldError('location')
                    }}
                    className={cn(inputClass, fieldErrors.location && inputErrorClass)}
                    placeholder={formConfig.locationPlaceholder}
                  />
                </Field>
                <Field
                  label={formConfig.budgetLabel}
                  required={formConfig.budgetRequired}
                  className='mt-4'
                  error={fieldErrors.budget}
                >
                  <span className='relative mt-1.5 block'>
                    <span
                      className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-[var(--muted)]'
                      aria-hidden
                    >
                      $
                    </span>
                    {/* type=number는 e·소수점이 들어가고 스크롤로 값이 바뀌어서 숫자만 받는 text로 */}
                    <input
                      id='roommate-field-budget'
                      type='text'
                      inputMode='numeric'
                      autoComplete='off'
                      required={formConfig.budgetRequired}
                      value={budgetMax ? Number(budgetMax).toLocaleString('en-US') : ''}
                      aria-invalid={Boolean(fieldErrors.budget) || undefined}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6)
                        setBudgetMax(digits)
                        clearFieldError('budget')
                      }}
                      className={cn(
                        inputClass,
                        '!mt-0 pl-7 pr-14 tabular-nums',
                        fieldErrors.budget && inputErrorClass,
                      )}
                      placeholder={budgetPlaceholder(formConfig.budgetPlaceholder)}
                    />
                    <span
                      className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[var(--muted)]'
                      aria-hidden
                    >
                      {t('roommate.write.perMonth')}
                    </span>
                  </span>
                </Field>
                <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                  <Field
                    label={formConfig.moveInStartLabel}
                    required={formConfig.moveInStartRequired}
                    error={fieldErrors.moveIn}
                  >
                    {/* 새 글은 지난 날짜를 막는다 (예전 글 수정은 저장되도록 그대로) */}
                    <input
                      id='roommate-field-moveIn'
                      type='date'
                      required={formConfig.moveInStartRequired}
                      value={moveInDate}
                      min={isEdit ? undefined : roommateToday()}
                      aria-invalid={Boolean(fieldErrors.moveIn) || undefined}
                      onChange={(e) => {
                        const next = e.target.value
                        setMoveInDate(next)
                        clearFieldError('moveIn')
                        if (moveOutDate && next && moveOutDate < next) {
                          setMoveOutDate('')
                        }
                      }}
                      className={cn(inputClass, fieldErrors.moveIn && inputErrorClass)}
                    />
                  </Field>
                  <Field
                    label={formConfig.moveInEndLabel}
                    required={formConfig.moveInEndRequired}
                    error={fieldErrors.moveOut}
                  >
                    <input
                      id='roommate-field-moveOut'
                      type='date'
                      required={formConfig.moveInEndRequired}
                      value={moveOutDate}
                      min={moveInDate || (isEdit ? undefined : roommateToday())}
                      aria-invalid={Boolean(fieldErrors.moveOut) || undefined}
                      onChange={(e) => {
                        setMoveOutDate(e.target.value)
                        clearFieldError('moveOut')
                      }}
                      className={cn(inputClass, fieldErrors.moveOut && inputErrorClass)}
                    />
                  </Field>
                </div>
                {stayLength ? (
                  <p className='mt-2 text-[12px] font-medium text-[var(--muted-foreground)]'>
                    {t('roommate.write.stayLength', {
                      length: t(`roommate.card.stay.${stayLength.unit}`, {
                        count: stayLength.count,
                      }),
                    })}
                  </p>
                ) : null}
              </>
            ) : (
              <p className='mt-4 rounded-xl bg-[#f7f8fa] px-4 py-3 text-[13px] text-[var(--muted)]'>
                {intent
                  ? t('roommate.write.pickSubtypeHint')
                  : t('roommate.write.pickIntentHint')}
              </p>
            )}
          </CreateSection>

          <CreateSection
            step={3}
            title={t('roommate.write.steps.photos')}
            description={t('roommate.write.steps.photosDescription', {
              hint:
                formConfig?.photosHint ??
                t('roommate.write.photosDefaultHint', { max: ROOMMATE_GALLERY_MAX }),
              current: photoUrls.length,
              max: ROOMMATE_GALLERY_MAX,
            })}
          >
            <SortablePhotoGrid
              urls={photoUrls}
              onChange={setPhotoUrls}
              trailing={
                photoUrls.length < ROOMMATE_GALLERY_MAX ? (
                  <div className='min-w-0'>
                    <PhotoUploadZone
                      compact
                      multiple
                      maxFiles={ROOMMATE_GALLERY_MAX - photoUrls.length}
                      className='min-w-0'
                      src={null}
                      onUploadedMany={(urls) => {
                        setPhotoUrls((prev) =>
                          [...prev, ...urls].slice(0, ROOMMATE_GALLERY_MAX),
                        )
                      }}
                      emptyLabel={t('roommate.write.addPhoto')}
                      emptyHint=''
                      aspectClassName='aspect-square'
                    />
                  </div>
                ) : null
              }
            />
            {formConfig?.photosRecommended && photoUrls.length === 0 ? (
              <p className='mt-3 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-[var(--brand)]/15'>
                {t('roommate.write.photosNudge')}
              </p>
            ) : null}
          </CreateSection>

          <CreateSection
            step={4}
            title={t('roommate.write.steps.details')}
            description={t('roommate.write.steps.detailsDescription')}
          >
            <div id='roommate-field-body' className='scroll-mt-24'>
              <TipTapEditor
                value={contentHtml}
                onChange={(html) => {
                  setContentHtml(html)
                  clearFieldError('body')
                }}
                placeholder={
                  formConfig?.bodyPlaceholder ?? tCommunity(communityBoardKey(boardId, 'descriptionPlaceholder'))
                }
                minHeightClassName='min-h-[200px]'
                contentClassName='!text-[13px] !leading-[1.65]'
                simpleToolbar
                maxLength={COMMUNITY_BODY_MAX}
              />
            </div>
            <FieldError message={fieldErrors.body} />
          </CreateSection>

          {previewPost ? (
            <section>
              <h2 className='mb-2.5 text-[13px] font-semibold text-[var(--muted)]'>
                {t('roommate.write.previewTitle')}
              </h2>
              <RoommatePostCard post={previewPost} preview />
            </section>
          ) : null}

          {isEdit ? (
            <button
              type='submit'
              disabled={submitting || !lookingFor}
              className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
            >
              {submitting ? t('roommate.write.saving') : t('roommate.write.saveEdit')}
            </button>
          ) : (
            <WriteDraftActions
              onSave={handleSaveDraft}
              savedAt={draftSavedAt}
              disabled={submitting}
            >
              <button
                type='submit'
                disabled={submitting || !lookingFor}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
              >
                {submitting
                  ? t('new.submitting')
                  : !lookingFor
                    ? t('roommate.write.errors.typeRequired')
                    : t('roommate.write.submit')}
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
              {t('roommate.write.backToListShort')}
            </Link>
          </p>
        </form>
      </div>

      {!isEdit ? (
        <RoommateWriteOrientationModal
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
  const t = useT('housing')
  return (
    <div>
      <h1 className='text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {t('roommate.write.createHero.title')}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        {t('roommate.write.createHero.description')}
      </p>
      <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
        {t('roommate.write.createHero.photoTip')}
      </p>
    </div>
  )
}

function UpdateHero({
  title,
  lookingFor,
}: {
  title: string
  lookingFor: RoommateLookingFor | null
}) {
  const t = useT('housing')
  const style = getRoommateLookingForStyle(lookingFor)
  const typeLabel = getRoommateLookingForLabel(lookingFor, t)
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
          {t('roommate.write.updateHero.eyebrow')}
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          {t('roommate.write.updateHero.title')}
        </h1>
        <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('roommate.write.updateHero.description')}
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2 bg-white/75 px-4 py-3 sm:px-5'>
        {typeLabel ? (
          <span
            className='inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1'
            style={{ color: style.accent, backgroundColor: style.soft }}
          >
            {typeLabel}
          </span>
        ) : null}
        <span className='min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]'>
          {title || t('roommate.write.untitled')}
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
  'mt-1.5 h-11 w-full scroll-mt-24 rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20'

const inputErrorClass = '!ring-red-400 focus:!ring-red-500'

/** "예: 1400" → "1,400" ($ 기호와 /월은 칸 양옆에 따로 보인다) */
function budgetPlaceholder(text: string) {
  const digits = text.match(/\d[\d,]*/)?.[0]?.replace(/,/g, '')
  return digits ? Number(digits).toLocaleString('en-US') : text
}

function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('block text-[13px] font-medium text-[var(--foreground)]', className)}>
      <span className='flex items-baseline justify-between gap-2'>
        <span>
          {label}
          {required ? <span className='text-[var(--brand)]'> *</span> : null}
        </span>
        {hint ? (
          <span className='text-[11px] font-medium tabular-nums text-[var(--muted)]'>
            {hint}
          </span>
        ) : null}
      </span>
      {children}
      <FieldError message={error} />
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span role='alert' className='mt-1.5 block text-[12px] font-medium text-red-600'>
      {message}
    </span>
  )
}
