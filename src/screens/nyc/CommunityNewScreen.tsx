'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import {
  LoadingState,
  PhotoUploadZone,
  TipTapEditor,
} from '@components'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  updateCommunityPostRequest,
} from '@lib/community/client'
import {
  COMMUNITY_BODY_MAX,
  FOOD_CATEGORIES,
  FOOD_CUISINES,
  FOOD_PARTY_MAX,
  FOOD_PARTY_MIN,
  FOOD_SPEND_MAX,
  FOOD_SPEND_MIN,
  FOOD_WAIT_MAX,
  FOOD_WAIT_MIN,
  getFoodCuisineLabel,
  normalizeFoodCuisine,
  parseFoodInt,
  sanitizeFoodIntInput,
  type FoodCuisineId,
} from '@lib/community/food'
import { htmlToPlainText } from '@lib/community/html'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type {
  FoodCategoryId,
  FoodMenuItem,
  PlaceSearchResult,
} from '@/types/nyc'
import {
  BoardBackLink,
  BoardPageShell,
  BoardSurface,
} from '@widgets/nyc/BoardPageShell'
import { FoodCategoryIcon } from '@widgets/nyc/FoodCategoryBadge'
import { PlaceSearchField } from '@widgets/nyc/PlaceSearchField'

interface CommunityNewScreenProps {
  boardId: NycCommunityBoardId
  title: string
  /** 있으면 수정 모드 */
  editPostId?: string
}

type MenuDraft = {
  key: string
  imageUrl: string
  caption: string
}

const FOOD_MENU_MAX = 8

function createMenuKey() {
  return `menu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function CommunityNewScreen({
  boardId,
  title,
  editPostId,
}: CommunityNewScreenProps) {
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
  const isFood = boardId === 'food'

  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [location, setLocation] = useState('')
  const [detail, setDetail] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null,
  )
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [foodCategory, setFoodCategory] = useState<FoodCategoryId | null>(null)
  const [foodCuisine, setFoodCuisine] = useState<FoodCuisineId | null>(null)
  const [partySize, setPartySize] = useState('2')
  const [totalSpend, setTotalSpend] = useState('')
  const [waitMinutes, setWaitMinutes] = useState('')
  const [menuDrafts, setMenuDrafts] = useState<MenuDraft[]>([
    { key: 'menu_1', imageUrl: '', caption: '' },
  ])
  const captionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const pendingFocusKeyRef = useRef<string | null>(null)

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
        setDetail(post.detail)
        setThumbnailUrl(post.thumbnailUrl || '')
        setFoodCategory(post.foodCategory)
        setFoodCuisine(normalizeFoodCuisine(post.detail))
        setPartySize(
          post.partySize != null ? String(post.partySize) : '2',
        )
        setTotalSpend(
          post.totalSpend != null ? String(Math.floor(post.totalSpend)) : '',
        )
        setWaitMinutes(
          post.waitMinutes != null ? String(post.waitMinutes) : '',
        )
        if (post.placeId && post.placeName) {
          setSelectedPlace({
            placeId: post.placeId,
            name: post.placeName,
            address: post.location || post.placeName,
            latitude: post.latitude,
            longitude: post.longitude,
          })
        }
        if (post.menuItems?.length) {
          setMenuDrafts(
            post.menuItems.map((item, index) => ({
              key: item.id || `menu_${index + 1}`,
              imageUrl: item.imageUrl,
              caption: item.caption,
            })),
          )
        }
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

  useEffect(() => {
    const key = pendingFocusKeyRef.current
    if (!key) return
    pendingFocusKeyRef.current = null
    const card = document.getElementById(`menu-card-${key}`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      captionRefs.current[key]?.focus()
    }, 280)
  }, [menuDrafts])

  function updateMenuRow(key: string, patch: Partial<MenuDraft>) {
    setMenuDrafts((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  function removeMenuRow(key: string) {
    setMenuDrafts((prev) =>
      prev.length <= 1 ? prev : prev.filter((item) => item.key !== key),
    )
  }

  function requestAddMenu() {
    if (menuDrafts.length >= FOOD_MENU_MAX) {
      toastError(`메뉴는 최대 ${FOOD_MENU_MAX}개까지 등록할 수 있어요`)
      return
    }
    const key = createMenuKey()
    pendingFocusKeyRef.current = key
    setMenuDrafts((prev) => [...prev, { key, imageUrl: '', caption: '' }])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      toastError('로그인이 필요해요')
      router.replace(`/nyc/login?next=${encodeURIComponent(loginNext)}`)
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

    let partySizeNum: number | null = null
    let totalSpendNum: number | null = null
    let waitMinutesNum: number | null = null
    let menuItems: FoodMenuItem[] = []
    let thumb = thumbnailUrl.trim() || null
    let locationValue = location.trim()
    let titleValue = postTitle.trim()
    let detailValue = detail.trim()

    if (isFood) {
      if (!selectedPlace?.name) {
        toastError('지도에서 식당을 검색해 선택해 주세요')
        return
      }
      if (
        selectedPlace.latitude == null ||
        selectedPlace.longitude == null
      ) {
        toastError('선택한 장소의 좌표를 확인하지 못했어요')
        return
      }
      if (!foodCategory) {
        toastError('카테고리를 선택해 주세요')
        return
      }
      if (!foodCuisine) {
        toastError('어떤 음식인지 선택해 주세요')
        return
      }
      if (!postTitle.trim()) {
        toastError('음식점 이름을 입력해 주세요')
        return
      }
      partySizeNum = parseFoodInt(
        partySize,
        FOOD_PARTY_MIN,
        FOOD_PARTY_MAX,
      )
      totalSpendNum = parseFoodInt(
        totalSpend,
        FOOD_SPEND_MIN,
        FOOD_SPEND_MAX,
      )
      waitMinutesNum = parseFoodInt(
        waitMinutes,
        FOOD_WAIT_MIN,
        FOOD_WAIT_MAX,
      )
      if (partySizeNum == null) {
        toastError(`방문 인원을 ${FOOD_PARTY_MIN}~${FOOD_PARTY_MAX}명으로 입력해 주세요`)
        return
      }
      if (totalSpendNum == null) {
        toastError(`총 금액을 $0~$${FOOD_SPEND_MAX.toLocaleString('en-US')} 정수로 입력해 주세요`)
        return
      }
      if (waitMinutesNum == null) {
        toastError(`웨이팅을 0~${FOOD_WAIT_MAX}분 정수로 입력해 주세요`)
        return
      }

      menuItems = menuDrafts
        .filter((item) => item.imageUrl.trim())
        .map((item, index) => ({
          id: `menu_${index + 1}`,
          imageUrl: item.imageUrl.trim(),
          caption: item.caption.trim(),
        }))

      if (!thumb && menuItems[0]?.imageUrl) {
        thumb = menuItems[0].imageUrl
      }

      titleValue = postTitle.trim()
      locationValue =
        selectedPlace.address?.trim() || selectedPlace.name.trim()
      detailValue = getFoodCuisineLabel(foodCuisine) || ''
    } else if (!titleValue) {
      toastError('제목과 본문을 입력해 주세요')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: titleValue,
        contentHtml,
        location: locationValue,
        detail: detailValue,
        thumbnailUrl: isFood ? thumb : null,
        partySize: isFood ? partySizeNum : null,
        totalSpend: isFood ? totalSpendNum : null,
        waitMinutes: isFood ? waitMinutesNum : null,
        foodCategory: isFood ? foodCategory : null,
        menuItems: isFood ? menuItems : [],
        placeId: isFood ? selectedPlace?.placeId ?? null : null,
        placeName: isFood ? selectedPlace?.name ?? null : null,
        latitude: isFood ? selectedPlace?.latitude ?? null : null,
        longitude: isFood ? selectedPlace?.longitude ?? null : null,
      }

      const post = isEdit && editPostId
        ? await updateCommunityPostRequest(editPostId, payload)
        : await createCommunityPostRequest({
            categoryId: boardId,
            ...payload,
            authorNickname: profile?.nickname?.trim() || null,
            authorSchoolId: isAnonymousBoard(boardId)
              ? null
              : (profile?.verifiedSchoolId ?? null),
            authorSchoolName: isAnonymousBoard(boardId)
              ? null
              : (profile?.verifiedSchoolName ?? null),
          })
      success(isEdit ? '글을 수정했어요' : '글을 등록했어요')
      router.push(`/nyc/${boardId}/${post.id}`)
    } catch (err) {
      toastError(getErrorMessage(err, isEdit ? '수정에 실패했어요' : '등록에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || loadingEdit || !isAuthenticated || !user) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState
          fullPage
          label={
            !loading && !isAuthenticated
              ? '로그인 페이지로 이동 중…'
              : undefined
          }
        />
      </BoardPageShell>
    )
  }

  if (isFood) {
    return (
      <BoardPageShell width='narrow'>
        <form
          onSubmit={handleSubmit}
          className='relative pb-8 pt-4 sm:pt-6'
        >
          <BoardBackLink
            href={
              isEdit && editPostId
                ? `/nyc/${boardId}/${editPostId}`
                : `/nyc/${boardId}`
            }
            label={isEdit ? '글로 돌아가기' : `${title} 목록`}
            className='mb-6'
          />

          <section>
            <h2 className='text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]'>
              어디서 먹었어요?
            </h2>
            <PlaceSearchField
              value={selectedPlace}
              onChange={(place) => {
                setSelectedPlace(place)
                if (place?.name?.trim()) {
                  setPostTitle((prev) => prev.trim() || place.name.trim())
                }
              }}
              className='mt-3'
            />
          </section>

          <section className='mt-6'>
            <Field label='음식점 이름' required>
              <input
                required
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className={inputClass}
                placeholder={meta.titlePlaceholder}
                maxLength={80}
              />
            </Field>
            <p className='mt-1.5 text-[12px] text-[var(--muted)]'>
              목록·상세 페이지에 표시되는 이름이에요
            </p>
          </section>

          <section className='mt-8'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              카테고리
            </h2>
            <div className='mt-2.5 flex flex-wrap gap-2'>
              {FOOD_CATEGORIES.map((cat) => {
                const active = foodCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type='button'
                    onClick={() => setFoodCategory(cat.id)}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium touch-manipulation transition',
                      active
                        ? cat.solidClass
                        : 'bg-white text-[var(--foreground)] ring-1 ring-black/[0.08] hover:ring-black/15',
                    )}
                  >
                    <FoodCategoryIcon
                      categoryId={cat.id}
                      className='size-3.5 opacity-90'
                    />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section className='mt-8'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              어떤 음식인가요?
            </h2>
            <div className='mt-2.5 flex flex-wrap gap-2'>
              {FOOD_CUISINES.map((cuisine) => {
                const active = foodCuisine === cuisine.id
                return (
                  <button
                    key={cuisine.id}
                    type='button'
                    onClick={() => setFoodCuisine(cuisine.id)}
                    className={cn(
                      'inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium touch-manipulation transition',
                      active
                        ? 'bg-[var(--foreground)] text-white'
                        : 'bg-white text-[var(--foreground)] ring-1 ring-black/[0.08] hover:ring-black/15',
                    )}
                  >
                    {cuisine.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section className='mt-8'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              방문 정보
            </h2>
            <div className='mt-2.5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]'>
              <VisitIntField
                label='인원'
                hint={`최대 ${FOOD_PARTY_MAX}명`}
                unit='명'
                value={partySize}
                min={FOOD_PARTY_MIN}
                max={FOOD_PARTY_MAX}
                onChange={setPartySize}
              />
              <div className='mx-4 border-t border-black/[0.05]' />
              <VisitIntField
                label='총 금액'
                hint={`$0 ~ $${FOOD_SPEND_MAX.toLocaleString('en-US')} · 정수`}
                unit='$'
                unitPrefix
                value={totalSpend}
                min={FOOD_SPEND_MIN}
                max={FOOD_SPEND_MAX}
                onChange={setTotalSpend}
                placeholder='0'
              />
              <div className='mx-4 border-t border-black/[0.05]' />
              <VisitIntField
                label='웨이팅'
                hint={`없으면 0 · 최대 ${FOOD_WAIT_MAX}분`}
                unit='분'
                value={waitMinutes}
                min={FOOD_WAIT_MIN}
                max={FOOD_WAIT_MAX}
                onChange={setWaitMinutes}
                placeholder='0'
              />
            </div>
          </section>

          <section className='mt-8'>
            <div className='flex items-end justify-between gap-3'>
              <div>
                <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
                  대표 사진
                </h2>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  목록 카드에 크게 보여요
                </p>
              </div>
            </div>
            <PhotoUploadZone
              className='mt-3 w-full sm:max-w-[18rem]'
              src={thumbnailUrl || null}
              onUploaded={setThumbnailUrl}
              onRemove={() => setThumbnailUrl('')}
              emptyLabel='대표 사진 추가'
              emptyHint='맛있는 한 컷을 올려 주세요'
              aspectClassName='aspect-[4/3]'
            />
          </section>

          <section className='mt-8'>
            <div className='flex items-end justify-between gap-3'>
              <div>
                <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
                  메뉴 사진
                </h2>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  메뉴마다 한 줄 평을 남기고, 사진은 선택해 올려 주세요
                </p>
              </div>
              <p className='shrink-0 pb-0.5 text-[12px] font-medium tabular-nums text-[var(--muted)]'>
                {menuDrafts.length}/{FOOD_MENU_MAX}
              </p>
            </div>

            <div className='mt-3 space-y-2.5'>
              {menuDrafts.map((item, index) => (
                <div
                  key={item.key}
                  id={`menu-card-${item.key}`}
                  className='rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]'
                >
                  <div className='mb-2.5 flex items-center justify-between gap-2'>
                    <p className='text-[12px] font-semibold text-[var(--muted)]'>
                      메뉴 {index + 1}
                    </p>
                    {menuDrafts.length > 1 ? (
                      <button
                        type='button'
                        onClick={() => removeMenuRow(item.key)}
                        className='text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>

                  <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]'>
                    <PhotoUploadZone
                      compact
                      className='min-w-0'
                      src={item.imageUrl || null}
                      onUploaded={(url) =>
                        updateMenuRow(item.key, { imageUrl: url })
                      }
                      onRemove={() =>
                        updateMenuRow(item.key, { imageUrl: '' })
                      }
                      emptyLabel='사진'
                      emptyHint=''
                      aspectClassName='aspect-square'
                    />
                    <div className='relative flex min-h-0 min-w-0 flex-col'>
                      <textarea
                        ref={(el) => {
                          captionRefs.current[item.key] = el
                        }}
                        value={item.caption}
                        onChange={(e) =>
                          updateMenuRow(item.key, {
                            caption: e.target.value,
                          })
                        }
                        maxLength={120}
                        placeholder='한 줄 평 (예: 칼국수 — 육수 깔끔)'
                        className='h-[6.5rem] w-full resize-none rounded-xl bg-[#f8f8f9] px-3 py-2.5 pb-6 text-[13px] leading-relaxed outline-none ring-1 ring-black/[0.05] transition placeholder:text-[var(--muted)] focus:ring-[var(--brand)]/35 sm:h-[7.5rem] sm:text-[14px]'
                        aria-label={`메뉴 ${index + 1} 한 줄 평`}
                      />
                      <span className='pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular-nums text-[var(--muted)]'>
                        {item.caption.length}/120
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {menuDrafts.length < FOOD_MENU_MAX ? (
                <button
                  type='button'
                  onClick={requestAddMenu}
                  className='group flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-[#fff8f5] hover:ring-[var(--brand)]/30 active:scale-[0.995]'
                >
                  <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fff1ed] text-[var(--brand)]'>
                    <PlusIcon className='size-3.5' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-[13px] font-semibold text-[var(--foreground)]'>
                      다음 메뉴 추가
                    </span>
                    <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                      사진 없이도 추가할 수 있어요
                    </span>
                  </span>
                </button>
              ) : (
                <p className='rounded-2xl bg-[#f3f4f6] px-4 py-2.5 text-center text-[12px] font-medium text-[var(--muted)]'>
                  메뉴는 최대 {FOOD_MENU_MAX}개까지 등록할 수 있어요
                </p>
              )}
            </div>
          </section>

          <section className='mt-8'>
            <div>
              <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
                본문
              </h2>
              <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                추천 포인트, 가는 길, 팁을 자유롭게 적어 주세요
              </p>
            </div>
            <div className='mt-3'>
              <TipTapEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder={meta.descriptionPlaceholder}
                minHeightClassName='min-h-[200px]'
                maxLength={COMMUNITY_BODY_MAX}
              />
            </div>
          </section>

          <div className='mt-8'>
            <button
              type='submit'
              disabled={
                submitting ||
                !postTitle.trim() ||
                !selectedPlace?.placeId ||
                selectedPlace.latitude == null ||
                selectedPlace.longitude == null ||
                !foodCategory ||
                !foodCuisine
              }
              className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] active:scale-[0.99] disabled:opacity-50 sm:h-12 sm:text-[15px]'
            >
              {submitting
                ? isEdit
                  ? '저장 중…'
                  : '등록 중…'
                : !postTitle.trim()
                  ? '음식점 이름을 입력해 주세요'
                  : !selectedPlace
                    ? '장소를 선택해 주세요'
                    : !foodCategory
                      ? '카테고리를 선택해 주세요'
                      : !foodCuisine
                        ? '음식을 선택해 주세요'
                        : isEdit
                          ? '수정 완료'
                          : '올리기'}
            </button>
          </div>
        </form>
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

        <BoardSurface className='p-5 sm:p-6'>
          <form onSubmit={handleSubmit} className='space-y-5'>
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
              {meta.detailInput && meta.detailLabel && (
                <Field label={meta.detailLabel}>
                  <input
                    type={
                      meta.detailInput === 'number'
                        ? 'number'
                        : meta.detailInput
                    }
                    min={meta.detailInput === 'number' ? 0 : undefined}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    className={inputClass}
                    placeholder={meta.detailPlaceholder}
                  />
                </Field>
              )}
            </div>

            <div>
              <p className='text-[13px] font-medium text-[var(--foreground)]'>
                본문 *
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
              disabled={submitting}
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
      {required ? (
        <span className='text-[var(--brand)]'> *</span>
      ) : null}
      {children}
    </label>
  )
}

function VisitIntField({
  label,
  hint,
  unit,
  unitPrefix,
  value,
  min,
  max,
  onChange,
  placeholder = '0',
}: {
  label: string
  hint: string
  unit: string
  unitPrefix?: boolean
  value: string
  min: number
  max: number
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className='flex cursor-text items-center justify-between gap-3 px-4 py-3.5'>
      <span className='min-w-0'>
        <span className='block text-[14px] font-semibold tracking-tight text-[var(--foreground)]'>
          {label}
        </span>
        <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
          {hint}
        </span>
      </span>

      <span className='flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-xl bg-[#f8f8f9] px-3 ring-1 ring-black/[0.05] transition focus-within:ring-[var(--brand)]/40'>
        {unitPrefix ? (
          <span className='mr-1 text-[14px] font-semibold text-[var(--muted)]'>
            {unit}
          </span>
        ) : null}
        <input
          required
          type='text'
          inputMode='numeric'
          pattern='[0-9]*'
          autoComplete='off'
          enterKeyHint='done'
          placeholder={placeholder}
          value={value}
          onChange={(e) =>
            onChange(sanitizeFoodIntInput(e.target.value, min, max))
          }
          onBlur={() => {
            if (value === '') return
            const parsed = parseFoodInt(value, min, max)
            if (parsed != null) onChange(String(parsed))
            else onChange(String(min))
          }}
          className='w-14 bg-transparent text-center text-[18px] font-semibold tabular-nums tracking-tight text-[var(--foreground)] outline-none'
          aria-label={label}
        />
        {!unitPrefix ? (
          <span className='ml-1 text-[12px] font-medium text-[var(--muted)]'>
            {unit}
          </span>
        ) : null}
      </span>
    </label>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.4'
      className={className}
      aria-hidden
    >
      <path strokeLinecap='round' d='M12 6v12M6 12h12' />
    </svg>
  )
}
