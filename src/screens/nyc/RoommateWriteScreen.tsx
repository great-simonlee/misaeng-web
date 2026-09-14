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
} from '@lib/community/client'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import {
  getRoommateFormConfig,
  getRoommateIntent,
  getRoommateLookingForLabel,
  getRoommateLookingForOptionsByIntent,
  getRoommateLookingForStyle,
  isRoommateLookingFor,
  normalizeRoommateLookingFor,
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
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
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

interface RoommateWriteScreenProps {
  title: string
  editPostId?: string
}

export function RoommateWriteScreen({
  title,
  editPostId,
}: RoommateWriteScreenProps) {
  const city = useCity()
  const href = useCityPath()
  const boardId: NycCommunityBoardId = 'roommate'
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
  }, [editPostId, href, user?.uid, boardId, router, toastError])

  useEffect(() => {
    if (!editPostId || !user?.uid) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await fetchCommunityPost(editPostId)
        if (cancelled) return
        if (!post) {
          toastError('글을 찾을 수 없어요')
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError('수정 권한이 없어요')
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
  }, [city, editPostId, href, user?.uid, boardId, router, toastError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      toastError('로그인이 필요해요')
      router.replace(cityLoginPath(city, loginNext))
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
      success('임시 저장했어요')
    } catch {
      toastError('임시 저장에 실패했어요')
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

        {isEdit ? (
          <UpdateHero title={postTitle} lookingFor={lookingFor} />
        ) : (
          <CreateHero />
        )}

        {!isEdit ? (
          <div className='mt-4 rounded-xl bg-[#fff8f5] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-[var(--brand)]/15'>
            룸메이트·서블렛 글은{' '}
            <strong className='text-[var(--foreground)]'>계정당 1개</strong>만
            올릴 수 있어요. 상황 바뀌면 기존 글을 수정하거나 삭제한 뒤 다시
            올려 주세요.
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className='mt-6 space-y-8'>
          <CreateSection step={1} title='어떤 유형인가요?'>
            <div className='grid grid-cols-2 gap-2'>
              {ROOMMATE_INTENT_OPTIONS.map((option) => {
                const active = intent === option.id
                return (
                  <button
                    key={option.id}
                    type='button'
                    onClick={() => selectIntent(option.id)}
                    className={cn(
                      'relative rounded-2xl px-3.5 py-3.5 text-left ring-1 touch-manipulation transition',
                      active
                        ? 'bg-[#fff8f5] ring-[var(--foreground)] shadow-[0_0_0_1px_rgba(15,23,42,0.04)]'
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
                      {option.label}
                    </span>
                    <span className='mt-1 block text-[12px] font-light leading-snug text-[var(--muted-foreground)]'>
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
            {intent ? (
              <div className='mt-4'>
                <p className='text-[13px] font-medium text-[var(--foreground)]'>
                  세부 유형
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
                          {option.label}
                        </span>
                        <span className='mt-1 block text-[12px] font-light leading-snug text-[var(--muted-foreground)]'>
                          {option.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </CreateSection>

          <CreateSection
            step={2}
            title='기본 정보'
            description='제목과 위치·예산·기간을 입력해 주세요'
          >
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
                <Field
                  label={formConfig.locationLabel}
                  required={formConfig.locationRequired}
                  className='mt-4'
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
                  className='mt-4'
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
                <div className='mt-4 grid gap-4 sm:grid-cols-2'>
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
              <p className='mt-4 rounded-xl bg-[#f7f8fa] px-4 py-3 text-[13px] text-[var(--muted)]'>
                {intent
                  ? '세부 유형을 선택하면 위치·예산·입주 기간 입력란이 나타나요.'
                  : '방 올리기 / 룸메 찾기를 선택해 주세요.'}
              </p>
            )}
          </CreateSection>

          <CreateSection
            step={3}
            title='사진'
            description={`${formConfig?.photosHint ?? `최대 ${ROOMMATE_GALLERY_MAX}장 · 첫 장이 대표 사진`} · 눌러 끌어 순서 변경 · ${photoUrls.length}/${ROOMMATE_GALLERY_MAX}`}
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
                      emptyLabel='추가'
                      emptyHint=''
                      aspectClassName='aspect-square'
                    />
                  </div>
                ) : null
              }
            />
          </CreateSection>

          <CreateSection
            step={4}
            title='상세 내용'
            description='생활 패턴, 조건을 적어 주세요. 연락은 카카오톡 1:1 오픈채팅을 만들고 링크를 남기는 걸 추천해요.'
          >
            <TipTapEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder={
                formConfig?.bodyPlaceholder ?? meta.descriptionPlaceholder
              }
              minHeightClassName='min-h-[200px]'
              contentClassName='!text-[13px] !leading-[1.65]'
              simpleToolbar
              maxLength={COMMUNITY_BODY_MAX}
            />
          </CreateSection>

          {isEdit ? (
            <button
              type='submit'
              disabled={submitting || !lookingFor}
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
                disabled={submitting || !lookingFor}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
              >
                {submitting
                  ? '등록 중…'
                  : !lookingFor
                    ? '유형을 선택해 주세요'
                    : '글 등록하기'}
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
  return (
    <div>
      <h1 className='text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        룸메이트 · 서블렛 글 올리기
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        방 올리기 또는 룸메 찾기를 고르고, 위치·기간을 남겨 주세요.
      </p>
      <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
        사진은 가로 4:3으로 찍은 걸 추천해요.
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
  const style = getRoommateLookingForStyle(lookingFor)
  const typeLabel = getRoommateLookingForLabel(lookingFor)
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
          글 수정
        </p>
        <h1 className='mt-1.5 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.4rem]'>
          올린 글 수정하기
        </h1>
        <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
          상황 바뀌면 유형·위치·기간을 업데이트해 주세요.
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
  hint,
  className,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
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
    </label>
  )
}
