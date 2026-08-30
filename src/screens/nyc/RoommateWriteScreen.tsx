'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { LoadingState, PhotoUploadZone, TipTapEditor } from '@components'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  fetchMyCommunityPosts,
  updateCommunityPostRequest,
} from '@lib/community/client'
import { COMMUNITY_BODY_MAX, FOOD_GALLERY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import {
  getRoommateFormConfig,
  getRoommateIntent,
  getRoommateLookingForLabel,
  getRoommateLookingForOptionsByIntent,
  getRoommateLookingForStyle,
  normalizeRoommateLookingFor,
  ROOMMATE_BUDGET_MAX,
  ROOMMATE_INTENT_OPTIONS,
  ROOMMATE_TITLE_MAX,
  type RoommateIntent,
  type RoommateLookingFor,
} from '@lib/community/roommate'
import { isAccountSuspended, isSchoolVerified } from '@lib/community/schoolGate'
import {
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import {
  BoardBackLink,
  BoardPageShell,
  BoardSurface,
} from '@widgets/nyc/BoardPageShell'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'

interface RoommateWriteScreenProps {
  title: string
  editPostId?: string
}

export function RoommateWriteScreen({
  title,
  editPostId,
}: RoommateWriteScreenProps) {
  const boardId: NycCommunityBoardId = 'roommate'
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId
    ? `/nyc/${boardId}/${editPostId}/edit`
    : `/nyc/${boardId}/new`
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

  const formConfig = useMemo(
    () => getRoommateFormConfig(lookingFor),
    [lookingFor],
  )
  const subtypeOptions = useMemo(
    () => getRoommateLookingForOptionsByIntent(intent),
    [intent],
  )

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
          toastError(
            '이미 올린 룸메이트·서블렛 글이 있어요. 수정 화면으로 이동합니다.',
          )
          router.replace(`/nyc/${boardId}/${existing.id}/edit`)
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
  }, [editPostId, user?.uid, boardId, router, toastError])

  useEffect(() => {
    if (!editPostId || !user?.uid) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await fetchCommunityPost(editPostId)
        if (cancelled) return
        if (!post) {
          toastError('글을 찾을 수 없어요')
          router.replace('/nyc/me/posts')
          return
        }
        if (post.authorUid !== user.uid) {
          toastError('수정 권한이 없어요')
          router.replace(`/nyc/${post.categoryId}/${post.id}`)
          return
        }
        if (post.categoryId !== boardId) {
          router.replace(`/nyc/${post.categoryId}/${post.id}/edit`)
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
        setPhotoUrls([...new Set(photos)].slice(0, FOOD_GALLERY_MAX))
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
  }, [editPostId, user?.uid, boardId, router, toastError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      toastError('로그인이 필요해요')
      router.replace(`/nyc/login?next=${encodeURIComponent(loginNext)}`)
      return
    }
    if (!lookingFor || !formConfig) {
      toastError('유형을 선택해 주세요')
      return
    }
    const trimmedTitle = postTitle.trim()
    if (!trimmedTitle) {
      toastError('제목을 입력해 주세요')
      return
    }
    if (trimmedTitle.length > ROOMMATE_TITLE_MAX) {
      toastError(`제목은 ${ROOMMATE_TITLE_MAX}자 이내로 작성해 주세요`)
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
    if (formConfig.locationRequired && !location.trim()) {
      toastError(`${formConfig.locationLabel}을(를) 입력해 주세요`)
      return
    }

    const budgetValue = budgetMax.trim()
      ? Number(budgetMax.replace(/,/g, ''))
      : null
    if (formConfig.budgetRequired && budgetValue == null) {
      toastError(`${formConfig.budgetLabel}을(를) 입력해 주세요`)
      return
    }
    if (
      budgetValue != null &&
      (!Number.isFinite(budgetValue) ||
        budgetValue < 0 ||
        budgetValue > ROOMMATE_BUDGET_MAX)
    ) {
      toastError(
        `금액은 $0~$${ROOMMATE_BUDGET_MAX.toLocaleString('en-US')} 사이로 입력해 주세요`,
      )
      return
    }

    const start = moveInDate.trim()
    const end = moveOutDate.trim()
    if (formConfig.moveInStartRequired && !start) {
      toastError(`${formConfig.moveInStartLabel}을(를) 선택해 주세요`)
      return
    }
    if (formConfig.moveInEndRequired && !end) {
      toastError(`${formConfig.moveInEndLabel}을(를) 선택해 주세요`)
      return
    }
    if (start && end && end < start) {
      toastError('종료일은 시작일 이후로 선택해 주세요')
      return
    }

    setSubmitting(true)
    try {
      const galleryPhotos = photoUrls.map((imageUrl, index) => ({
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
              ...payload,
              authorNickname: profile?.nickname?.trim() || null,
              authorPhotoURL: profile?.photoURL?.trim() || null,
              authorSchoolId: profile?.verifiedSchoolId ?? null,
              authorSchoolName: profile?.verifiedSchoolName ?? null,
            })
      success(isEdit ? '글을 수정했어요' : '글을 등록했어요')
      router.push(`/nyc/${boardId}/${post.id}`)
    } catch (err) {
      toastError(
        getErrorMessage(err, isEdit ? '수정에 실패했어요' : '등록에 실패했어요'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || loadingEdit || checkingExisting || !isAuthenticated || !user) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState
          fullPage
          label={
            !loading && !isAuthenticated
              ? '로그인 페이지로 이동 중…'
              : checkingExisting
                ? '기존 글 확인 중…'
                : undefined
          }
        />
      </BoardPageShell>
    )
  }

  if (isAccountSuspended(profile)) {
    return <AccountSuspendedNotice />
  }

  if (!isSchoolVerified(profile)) {
    return <SchoolVerificationRequired nextPath={loginNext} />
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

        <BoardSurface className='p-5 sm:p-6'>
          <CommunityWritingGuidelines className='mb-5' />
          {!isEdit ? (
            <div className='mb-5 rounded-xl bg-[#fff8f5] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-[var(--brand)]/15'>
              룸메이트·서블렛 글은{' '}
              <strong className='text-[var(--foreground)]'>계정당 1개</strong>
              만 올릴 수 있어요. 상황 바뀌면 기존 글을 수정하거나 삭제한 뒤 다시
              올려 주세요.
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className='space-y-5'>
            <div>
              <p className='text-[13px] font-medium text-[var(--foreground)]'>
                무엇을 올릴까요? <span className='text-[var(--brand)]'>*</span>
              </p>
              <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                {ROOMMATE_INTENT_OPTIONS.map((option) => {
                  const active = intent === option.id
                  return (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => selectIntent(option.id)}
                      className={cn(
                        'rounded-xl px-3.5 py-3.5 text-left ring-1 touch-manipulation transition',
                        active
                          ? 'bg-[#fff8f5] ring-[var(--foreground)]'
                          : 'bg-white ring-black/[0.08] hover:ring-black/15',
                      )}
                    >
                      <span
                        className={cn(
                          'block text-[14px] font-semibold',
                          active
                            ? 'text-[var(--brand)]'
                            : 'text-[var(--foreground)]',
                        )}
                      >
                        {option.label}
                      </span>
                      <span className='mt-0.5 block text-[11px] leading-snug text-[var(--muted)]'>
                        {option.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {intent ? (
              <div>
                <p className='text-[13px] font-medium text-[var(--foreground)]'>
                  세부 유형 <span className='text-[var(--brand)]'>*</span>
                </p>
                <div className='mt-2 grid gap-2'>
                  {subtypeOptions.map((option) => {
                    const active = lookingFor === option.id
                    const style = getRoommateLookingForStyle(option.id)
                    return (
                      <button
                        key={option.id}
                        type='button'
                        onClick={() => setLookingFor(option.id)}
                        className={cn(
                          'rounded-xl px-3.5 py-3 text-left ring-1 touch-manipulation transition',
                          active
                            ? 'ring-[var(--foreground)]'
                            : 'bg-white ring-black/[0.08] hover:ring-black/15',
                        )}
                        style={
                          active ? { backgroundColor: style.soft } : undefined
                        }
                      >
                        <span
                          className='block text-[13px] font-semibold'
                          style={{ color: active ? style.accent : undefined }}
                        >
                          {option.label}
                        </span>
                        <span className='mt-0.5 block text-[11px] leading-snug text-[var(--muted)]'>
                          {option.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <Field
              label='제목'
              required
              hint={`${postTitle.length}/${ROOMMATE_TITLE_MAX}`}
            >
              <input
                required
                value={postTitle}
                maxLength={ROOMMATE_TITLE_MAX}
                onChange={(e) =>
                  setPostTitle(e.target.value.slice(0, ROOMMATE_TITLE_MAX))
                }
                className={inputClass}
                placeholder={
                  formConfig?.titlePlaceholder ?? meta.titlePlaceholder
                }
              />
            </Field>

            {formConfig ? (
              <>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <Field
                    label={formConfig.locationLabel}
                    required={formConfig.locationRequired}
                  >
                    <input
                      required={formConfig.locationRequired}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={inputClass}
                      placeholder={formConfig.locationPlaceholder}
                    />
                  </Field>
                  <Field
                    label={formConfig.budgetLabel}
                    required={formConfig.budgetRequired}
                  >
                    <input
                      type='number'
                      required={formConfig.budgetRequired}
                      min={0}
                      max={ROOMMATE_BUDGET_MAX}
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className={inputClass}
                      placeholder={formConfig.budgetPlaceholder}
                    />
                  </Field>
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <Field
                    label={formConfig.moveInStartLabel}
                    required={formConfig.moveInStartRequired}
                  >
                    <input
                      type='date'
                      required={formConfig.moveInStartRequired}
                      value={moveInDate}
                      onChange={(e) => {
                        const next = e.target.value
                        setMoveInDate(next)
                        if (moveOutDate && next && moveOutDate < next) {
                          setMoveOutDate('')
                        }
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label={formConfig.moveInEndLabel}
                    required={formConfig.moveInEndRequired}
                  >
                    <input
                      type='date'
                      required={formConfig.moveInEndRequired}
                      value={moveOutDate}
                      min={moveInDate || undefined}
                      onChange={(e) => setMoveOutDate(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <p className='rounded-xl bg-[#f7f8fa] px-4 py-3 text-[13px] text-[var(--muted)]'>
                {intent
                  ? '세부 유형을 선택하면 위치·예산·입주 기간 입력란이 나타나요.'
                  : '방 올리기 / 룸메 찾기를 선택해 주세요.'}
              </p>
            )}

            <div>
              <div className='flex items-end justify-between gap-3'>
                <div>
                  <p className='text-[13px] font-medium text-[var(--foreground)]'>
                    사진
                    {formConfig?.photosRecommended ? (
                      <span className='ml-1 text-[11px] font-medium text-[var(--muted)]'>
                        (권장)
                      </span>
                    ) : null}
                  </p>
                  <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                    {formConfig?.photosHint ??
                      `최대 ${FOOD_GALLERY_MAX}장 · 첫 장이 대표 사진`}
                  </p>
                </div>
                <p className='shrink-0 text-[12px] font-medium tabular-nums text-[var(--muted)]'>
                  {photoUrls.length}/{FOOD_GALLERY_MAX}
                </p>
              </div>
              <div className='mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {photoUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className='relative aspect-square overflow-hidden rounded-xl bg-[#e8eaee] ring-1 ring-black/[0.06]'
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=''
                      className='h-full w-full object-cover'
                    />
                    {index === 0 ? (
                      <span className='absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white'>
                        대표
                      </span>
                    ) : null}
                    <button
                      type='button'
                      onClick={() =>
                        setPhotoUrls((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className='absolute right-1 top-1 inline-flex h-6 items-center rounded-full bg-black/55 px-2 text-[10px] font-semibold text-white'
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {photoUrls.length < FOOD_GALLERY_MAX ? (
                  <div className='min-w-0'>
                    <PhotoUploadZone
                      compact
                      multiple
                      maxFiles={FOOD_GALLERY_MAX - photoUrls.length}
                      className='min-w-0'
                      src={null}
                      onUploadedMany={(urls) => {
                        setPhotoUrls((prev) =>
                          [...prev, ...urls].slice(0, FOOD_GALLERY_MAX),
                        )
                      }}
                      emptyLabel='추가'
                      emptyHint=''
                      aspectClassName='aspect-square'
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <p className='text-[13px] font-medium text-[var(--foreground)]'>
                본문 <span className='text-[var(--brand)]'>*</span>
              </p>
              <div className='mt-1.5'>
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder={
                    formConfig?.bodyPlaceholder ?? meta.descriptionPlaceholder
                  }
                  maxLength={COMMUNITY_BODY_MAX}
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={submitting || !lookingFor}
              className='h-11 w-full rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation hover:bg-[var(--brand-hover)] disabled:opacity-50'
            >
              {submitting
                ? isEdit
                  ? '저장 중…'
                  : '등록 중…'
                : isEdit
                  ? '수정 완료'
                  : '게시하기'}
            </button>
          </form>
        </BoardSurface>
      </div>
    </BoardPageShell>
  )
}

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className='block text-[13px] font-medium text-[var(--foreground)]'>
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
    </label>
  )
}
