'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

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
  ROOMMATE_BUDGET_MAX,
  ROOMMATE_LOOKING_FOR_OPTIONS,
  formatRoommateBudget,
  getRoommateLookingForLabel,
  getRoommateLookingForStyle,
  isRoommateLookingFor,
  type RoommateLookingFor,
} from '@lib/community/roommate'
import { isSchoolVerified } from '@lib/community/schoolGate'
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
  const [budgetMax, setBudgetMax] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

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
          toastError('이미 올린 룸메이트·서블렛 글이 있어요. 수정 화면으로 이동합니다.')
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
        setPostTitle(post.title)
        setContentHtml(post.contentHtml)
        setLocation(post.location)
        setLookingFor(
          isRoommateLookingFor(post.roommateLookingFor)
            ? post.roommateLookingFor
            : null,
        )
        setBudgetMax(
          post.roommateBudgetMax != null
            ? String(post.roommateBudgetMax)
            : '',
        )
        setMoveInDate(post.roommateMoveInDate?.trim() || '')
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
    if (!lookingFor) {
      toastError('룸메이트 / 방 / 서블렛 중 유형을 선택해 주세요')
      return
    }
    const plain = htmlToPlainText(contentHtml)
    if (!postTitle.trim() || !plain) {
      toastError('제목과 본문을 입력해 주세요')
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        `본문은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요`,
      )
      return
    }

    const budgetValue = budgetMax.trim()
      ? Number(budgetMax.replace(/,/g, ''))
      : null
    if (
      budgetValue != null &&
      (!Number.isFinite(budgetValue) ||
        budgetValue < 0 ||
        budgetValue > ROOMMATE_BUDGET_MAX)
    ) {
      toastError(
        `월 예산은 $0~$${ROOMMATE_BUDGET_MAX.toLocaleString('en-US')} 사이로 입력해 주세요`,
      )
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
        title: postTitle.trim(),
        contentHtml,
        location: location.trim(),
        detail: getRoommateLookingForLabel(lookingFor),
        roommateLookingFor: lookingFor,
        roommateBudgetMax:
          budgetValue != null ? Math.floor(budgetValue) : null,
        roommateMoveInDate: moveInDate.trim() || null,
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
          {!isEdit ? (
            <div className='mb-5 rounded-xl bg-[#fff8f5] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted-foreground)] ring-1 ring-[var(--brand)]/15'>
              룸메이트·서블렛 글은 <strong className='text-[var(--foreground)]'>계정당 1개</strong>만
              올릴 수 있어요. 상황 바뀌면 기존 글을 수정하거나 삭제한 뒤 다시 올려 주세요.
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className='space-y-5'>
            <div>
              <p className='text-[13px] font-medium text-[var(--foreground)]'>
                유형 <span className='text-[var(--brand)]'>*</span>
              </p>
              <div className='mt-2 grid gap-2 sm:grid-cols-3'>
                {ROOMMATE_LOOKING_FOR_OPTIONS.map((option) => {
                  const active = lookingFor === option.id
                  const style = getRoommateLookingForStyle(option.id)
                  return (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => setLookingFor(option.id)}
                      className={cn(
                        'rounded-xl px-3 py-3 text-left ring-1 touch-manipulation transition',
                        active
                          ? 'ring-[var(--foreground)]'
                          : 'bg-white ring-black/[0.08] hover:ring-black/15',
                      )}
                      style={
                        active
                          ? { backgroundColor: style.soft }
                          : undefined
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

            <Field label='제목' required>
              <input
                required
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className={inputClass}
                placeholder={meta.titlePlaceholder}
              />
            </Field>

            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={meta.locationLabel}>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass}
                  placeholder={meta.locationPlaceholder}
                />
              </Field>
              <Field label='월 예산 상한 ($)'>
                <input
                  type='number'
                  min={0}
                  max={ROOMMATE_BUDGET_MAX}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className={inputClass}
                  placeholder={meta.detailPlaceholder}
                />
              </Field>
            </div>

            <Field label='입주 희망일'>
              <input
                type='date'
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className={inputClass}
              />
            </Field>

            <div>
              <div className='flex items-end justify-between gap-3'>
                <div>
                  <p className='text-[13px] font-medium text-[var(--foreground)]'>
                    사진
                  </p>
                  <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                    방·집·동네 사진 · 최대 {FOOD_GALLERY_MAX}장 · 첫 장이 대표 사진
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
                      className='min-w-0'
                      src={null}
                      onUploaded={(url) => {
                        setPhotoUrls((prev) =>
                          prev.length >= FOOD_GALLERY_MAX
                            ? prev
                            : [...prev, url],
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
                  placeholder={meta.descriptionPlaceholder}
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
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className='block text-[13px] font-medium text-[var(--foreground)]'>
      {label}
      {required ? <span className='text-[var(--brand)]'> *</span> : null}
      {children}
    </label>
  )
}
