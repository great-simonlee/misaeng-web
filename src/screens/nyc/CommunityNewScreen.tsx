'use client'

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
import { isAccountSuspended, isSchoolVerified } from '@lib/community/schoolGate'
import {
  COMMUNITY_BODY_MAX,
  FOOD_CATEGORIES,
  FOOD_CUISINES,
  FOOD_GALLERY_MAX,
  FOOD_MENU_MAX,
  FOOD_MENU_NAME_MAX,
  FOOD_MENU_CAPTION_MAX,
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
import { uploadCommunityImageFile } from '@lib/community/upload.client'
import { IMAGE_LIBRARY_ACCEPT } from '@lib/constants/imageUpload'
import {
  ANONYMOUS_TITLE_MAX,
} from '@lib/constants/anonymousTopics'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type {
  CommunityPost,
  FoodCategoryId,
  FoodMenuItem,
  PlaceSearchResult,
} from '@/types/nyc'
import {
  BoardBackLink,
  BoardPageShell,
  BoardSurface,
} from '@widgets/nyc/BoardPageShell'
import { AnonymousTopicSelect } from '@widgets/nyc/AnonymousTopicSelect'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { FoodCategoryIcon } from '@widgets/nyc/FoodCategoryBadge'
import { PlaceSearchField } from '@widgets/nyc/PlaceSearchField'
import { RestaurantNameField } from '@widgets/nyc/RestaurantNameField'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'
import { CptOptWriteScreen } from '@screens/nyc/CptOptWriteScreen'
import { JobReviewWriteScreen } from '@screens/nyc/JobReviewWriteScreen'
import { RoommateWriteScreen } from '@screens/nyc/RoommateWriteScreen'

interface CommunityNewScreenProps {
  boardId: NycCommunityBoardId
  title: string
  /** 있으면 수정 모드 */
  editPostId?: string
}

type MenuDraft = {
  key: string
  imageUrl: string
  name: string
  caption: string
}

type GalleryDraft = {
  key: string
  imageUrl: string
}

let photoKeySeq = 0

function createPhotoKey(prefix: 'menu' | 'gallery') {
  photoKeySeq += 1
  return `${prefix}_${Date.now().toString(36)}_${photoKeySeq}`
}

function isLikelyImageFile(file: File) {
  if (file.type.startsWith('image/')) return true
  // HEIC 등 일부 환경에서 type이 비어 있음
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
}

function pickImageFiles(files: FileList, remaining: number) {
  return Array.from(files).filter(isLikelyImageFile).slice(0, remaining)
}

export function CommunityNewScreen({
  boardId,
  title,
  editPostId,
}: CommunityNewScreenProps) {
  if (boardId === 'status') {
    return <CptOptWriteScreen title={title} editPostId={editPostId} />
  }
  if (boardId === 'job-review') {
    return <JobReviewWriteScreen title={title} editPostId={editPostId} />
  }
  if (boardId === 'roommate') {
    return <RoommateWriteScreen title={title} editPostId={editPostId} />
  }

  return (
    <CommunityBoardNewScreen
      boardId={boardId}
      title={title}
      editPostId={editPostId}
    />
  )
}

function CommunityBoardNewScreen({
  boardId,
  title,
  editPostId,
}: CommunityNewScreenProps) {
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const isEdit = Boolean(editPostId)
  const anonymousBoard = isAnonymousBoard(boardId)
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
  const [foodCategory, setFoodCategory] = useState<FoodCategoryId | null>(null)
  const [foodCuisine, setFoodCuisine] = useState<FoodCuisineId | null>(null)
  const [partySize, setPartySize] = useState('2')
  const [totalSpend, setTotalSpend] = useState('')
  const [waitMinutes, setWaitMinutes] = useState('')
  const [menuDrafts, setMenuDrafts] = useState<MenuDraft[]>([])
  const [galleryDrafts, setGalleryDrafts] = useState<GalleryDraft[]>([])
  const [menuUploading, setMenuUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  /** 업로드 진행 중 보이는 플레이스홀더 개수 */
  const [galleryPendingCount, setGalleryPendingCount] = useState(0)
  const [menuPendingCount, setMenuPendingCount] = useState(0)
  const captionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const pendingFocusKeyRef = useRef<string | null>(null)
  const menuFileInputRef = useRef<HTMLInputElement>(null)
  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const menuDraftsRef = useRef(menuDrafts)
  const galleryDraftsRef = useRef(galleryDrafts)
  menuDraftsRef.current = menuDrafts
  galleryDraftsRef.current = galleryDrafts

  const galleryRemaining = FOOD_GALLERY_MAX - galleryDrafts.length
  const menuRemaining = FOOD_MENU_MAX - menuDrafts.length
  const canAddGallery = galleryRemaining > 0 && !galleryUploading
  const canAddMenu = menuRemaining > 0 && !menuUploading

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
        setPostTitle(
          isAnonymousBoard(boardId)
            ? post.title.slice(0, ANONYMOUS_TITLE_MAX)
            : post.title,
        )
        setContentHtml(post.contentHtml)
        setLocation(post.location)
        setDetail(post.detail)
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
        if (post.placeId && (post.location || post.placeName)) {
          setSelectedPlace({
            placeId: post.placeId,
            name: post.location?.split(',')[0]?.trim() || post.placeName || '',
            address: post.location || post.placeName || '',
            latitude: post.latitude,
            longitude: post.longitude,
          })
        }
        if (post.menuItems?.length) {
          setMenuDrafts(
            post.menuItems.map((item, index) => ({
              key: item.id || `menu_${index + 1}`,
              imageUrl: item.imageUrl,
              name: item.name || '',
              caption: item.caption,
            })),
          )
        }
        if (post.galleryPhotos?.length) {
          setGalleryDrafts(
            post.galleryPhotos.map((item, index) => ({
              key: item.id || `gallery_${index + 1}`,
              imageUrl: item.imageUrl,
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
      nameRefs.current[key]?.focus()
    }, 280)
  }, [menuDrafts])

  function updateMenuRow(key: string, patch: Partial<MenuDraft>) {
    setMenuDrafts((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  function removeMenuRow(key: string) {
    setMenuDrafts((prev) => prev.filter((item) => item.key !== key))
  }

  function resetMenuFileInput() {
    if (menuFileInputRef.current) menuFileInputRef.current.value = ''
  }

  function resetGalleryFileInput() {
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = ''
  }

  function openMenuPicker() {
    if (!canAddMenu) return
    resetMenuFileInput()
    menuFileInputRef.current?.click()
  }

  function openGalleryPicker() {
    if (!canAddGallery) return
    resetGalleryFileInput()
    galleryFileInputRef.current?.click()
  }

  async function handleMenuFilesSelected(files: FileList | null) {
    if (!files?.length || menuUploading) {
      resetMenuFileInput()
      return
    }

    const remaining = FOOD_MENU_MAX - menuDraftsRef.current.length
    if (remaining <= 0) {
      toastError(`메뉴는 최대 ${FOOD_MENU_MAX}개까지 등록할 수 있어요`)
      resetMenuFileInput()
      return
    }

    const selected = pickImageFiles(files, remaining)
    if (selected.length === 0) {
      toastError('이미지 파일만 선택할 수 있어요')
      resetMenuFileInput()
      return
    }
    if (files.length > remaining) {
      toastError(
        `메뉴는 최대 ${FOOD_MENU_MAX}개까지예요. ${selected.length}장만 추가합니다`,
      )
    }

    setMenuUploading(true)
    setMenuPendingCount(selected.length)
    let successCount = 0
    let failCount = 0
    let didSetFocus = false

    for (const file of selected) {
      try {
        const url = await uploadCommunityImageFile(file)
        const draft: MenuDraft = {
          key: createPhotoKey('menu'),
          imageUrl: url,
          name: '',
          caption: '',
        }
        if (!didSetFocus) {
          pendingFocusKeyRef.current = draft.key
          didSetFocus = true
        }
        setMenuDrafts((prev) => {
          if (prev.length >= FOOD_MENU_MAX) return prev
          return [...prev, draft]
        })
        successCount += 1
      } catch {
        failCount += 1
      } finally {
        setMenuPendingCount((count) => Math.max(0, count - 1))
      }
    }

    if (failCount > 0) {
      toastError(
        successCount > 0
          ? `${successCount}장은 추가됐고, ${failCount}장은 실패했어요`
          : '메뉴 사진 업로드에 실패했어요',
      )
    }

    setMenuUploading(false)
    setMenuPendingCount(0)
    resetMenuFileInput()
  }

  function removeGalleryRow(key: string) {
    setGalleryDrafts((prev) => prev.filter((item) => item.key !== key))
  }

  async function handleGalleryFilesSelected(files: FileList | null) {
    if (!files?.length || galleryUploading) {
      resetGalleryFileInput()
      return
    }

    const remaining = FOOD_GALLERY_MAX - galleryDraftsRef.current.length
    if (remaining <= 0) {
      toastError(`분위기 사진은 최대 ${FOOD_GALLERY_MAX}장까지 등록할 수 있어요`)
      resetGalleryFileInput()
      return
    }

    const selected = pickImageFiles(files, remaining)
    if (selected.length === 0) {
      toastError('이미지 파일만 선택할 수 있어요')
      resetGalleryFileInput()
      return
    }
    if (files.length > remaining) {
      toastError(
        `분위기 사진은 최대 ${FOOD_GALLERY_MAX}장까지예요. ${selected.length}장만 추가합니다`,
      )
    }

    setGalleryUploading(true)
    setGalleryPendingCount(selected.length)
    let successCount = 0
    let failCount = 0

    for (const file of selected) {
      try {
        const url = await uploadCommunityImageFile(file)
        const draft: GalleryDraft = {
          key: createPhotoKey('gallery'),
          imageUrl: url,
        }
        setGalleryDrafts((prev) => {
          if (prev.length >= FOOD_GALLERY_MAX) return prev
          return [...prev, draft]
        })
        successCount += 1
      } catch {
        failCount += 1
      } finally {
        setGalleryPendingCount((count) => Math.max(0, count - 1))
      }
    }

    if (failCount > 0) {
      toastError(
        successCount > 0
          ? `${successCount}장은 추가됐고, ${failCount}장은 실패했어요`
          : '분위기 사진 업로드에 실패했어요',
      )
    }

    setGalleryUploading(false)
    setGalleryPendingCount(0)
    resetGalleryFileInput()
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
    let galleryPhotos: CommunityPost['galleryPhotos'] = []
    let thumb: string | null = null
    let locationValue = location.trim()
    let titleValue = postTitle.trim()
    let detailValue = detail.trim()

    if (anonymousBoard) {
      if (!titleValue) {
        toastError('제목을 입력해 주세요')
        return
      }
      if (titleValue.length > ANONYMOUS_TITLE_MAX) {
        toastError(`제목은 ${ANONYMOUS_TITLE_MAX}자 이내로 작성해 주세요`)
        return
      }
    }

    if (isFood) {
      if (!selectedPlace) {
        toastError('지도에서 주소를 검색해 선택해 주세요')
        return
      }
      if (
        selectedPlace.latitude == null ||
        selectedPlace.longitude == null
      ) {
        toastError('선택한 주소의 좌표를 확인하지 못했어요')
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

      const incompleteMenu = menuDrafts.find((item) => {
        const hasImage = Boolean(item.imageUrl.trim())
        const hasName = Boolean(item.name.trim())
        const hasCaption = Boolean(item.caption.trim())
        return hasImage && (!hasName || !hasCaption)
      })
      if (incompleteMenu) {
        toastError('메뉴는 사진·메뉴 이름·한 줄 평을 모두 입력해야 등록할 수 있어요')
        return
      }

      menuItems = menuDrafts
        .filter(
          (item) =>
            item.imageUrl.trim() &&
            item.name.trim() &&
            item.caption.trim(),
        )
        .map((item, index) => ({
          id: `menu_${index + 1}`,
          imageUrl: item.imageUrl.trim(),
          name: item.name.trim().slice(0, FOOD_MENU_NAME_MAX),
          caption: item.caption.trim().slice(0, FOOD_MENU_CAPTION_MAX),
        }))

      galleryPhotos = galleryDrafts
        .filter((item) => item.imageUrl.trim())
        .slice(0, FOOD_GALLERY_MAX)
        .map((item, index) => ({
          id: `gallery_${index + 1}`,
          imageUrl: item.imageUrl.trim(),
          caption: '',
        }))

      // 대표 사진은 첫 번째 메뉴 사진을 자동 사용
      thumb = menuItems[0]?.imageUrl?.trim() || null

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
        galleryPhotos: isFood ? galleryPhotos : [],
        placeId: isFood ? selectedPlace?.placeId ?? null : null,
        placeName: isFood ? titleValue : null,
        latitude: isFood ? selectedPlace?.latitude ?? null : null,
        longitude: isFood ? selectedPlace?.longitude ?? null : null,
      }

      const post = isEdit && editPostId
        ? await updateCommunityPostRequest(editPostId, payload)
        : await createCommunityPostRequest({
            categoryId: boardId,
            ...payload,
            authorNickname: anonymousBoard
              ? null
              : profile?.nickname?.trim() || null,
            authorPhotoURL: anonymousBoard
              ? null
              : profile?.photoURL?.trim() || null,
            authorSchoolId: anonymousBoard
              ? null
              : (profile?.verifiedSchoolId ?? null),
            authorSchoolName: anonymousBoard
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

  if (isAccountSuspended(profile)) {
    return <AccountSuspendedNotice />
  }

  if (!isSchoolVerified(profile)) {
    return <SchoolVerificationRequired nextPath={loginNext} />
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

          <CommunityWritingGuidelines className='mb-6' />

          <section>
            <h2 className='text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]'>
              어디서 먹었어요?
            </h2>
            <p className='mt-1 text-[13px] text-[var(--muted)]'>
              정확한 주소를 선택하면 위치가 저장돼요
            </p>
            <PlaceSearchField
              mode='address'
              value={selectedPlace}
              onChange={(place) => {
                setSelectedPlace(place)
              }}
              className='mt-3'
            />
          </section>

          <section className='mt-6'>
            <Field label='음식점 이름' required>
              <RestaurantNameField
                value={postTitle}
                onChange={setPostTitle}
                latitude={selectedPlace?.latitude ?? null}
                longitude={selectedPlace?.longitude ?? null}
                placeId={selectedPlace?.placeId ?? null}
                inputClassName={inputClass}
                placeholder={meta.titlePlaceholder}
              />
            </Field>
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
                  가게 내부 · 분위기
                </h2>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  인테리어, 좌석, 분위기 사진 · 최대 {FOOD_GALLERY_MAX}장
                </p>
              </div>
              <p className='shrink-0 pb-0.5 text-[12px] font-medium tabular-nums text-[var(--muted)]'>
                {galleryDrafts.length}/{FOOD_GALLERY_MAX}
              </p>
            </div>

            <input
              ref={galleryFileInputRef}
              type='file'
              accept={IMAGE_LIBRARY_ACCEPT}
              multiple
              className='hidden'
              onChange={(e) => void handleGalleryFilesSelected(e.target.files)}
            />

            {galleryDrafts.length === 0 && galleryPendingCount === 0 ? (
              <button
                type='button'
                disabled={!canAddGallery}
                onClick={openGalleryPicker}
                className='mt-3 flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5 text-left ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-[#fff8f5] hover:ring-[var(--brand)]/30 disabled:opacity-60'
              >
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fff1ed] text-[var(--brand)]'>
                  <PlusIcon className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-[13px] font-semibold text-[var(--foreground)]'>
                    분위기 사진 선택
                  </span>
                  <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                    갤러리에서 최대 {FOOD_GALLERY_MAX}장까지 한 번에 고를 수 있어요
                  </span>
                </span>
              </button>
            ) : (
              <div className='mt-3 grid grid-cols-4 gap-2'>
                {galleryDrafts.map((item) => (
                  <div
                    key={item.key}
                    className='relative aspect-square overflow-hidden rounded-xl bg-[#e8eaee] ring-1 ring-black/[0.06]'
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=''
                      className='h-full w-full object-cover'
                    />
                    <button
                      type='button'
                      onClick={() => removeGalleryRow(item.key)}
                      className='absolute right-1 top-1 inline-flex h-6 items-center rounded-full bg-black/55 px-2 text-[10px] font-semibold text-white touch-manipulation backdrop-blur-sm'
                    >
                      삭제
                    </button>
                  </div>
                ))}

                {Array.from({ length: galleryPendingCount }, (_, index) => (
                  <div
                    key={`gallery-pending-${index}`}
                    className='flex aspect-square items-center justify-center rounded-xl bg-[#f3f4f6] ring-1 ring-dashed ring-black/[0.1]'
                    aria-hidden
                  >
                    <span className='text-[11px] font-medium text-[var(--muted)]'>
                      …
                    </span>
                  </div>
                ))}

                {galleryDrafts.length + galleryPendingCount <
                FOOD_GALLERY_MAX ? (
                  <button
                    type='button'
                    disabled={!canAddGallery}
                    onClick={openGalleryPicker}
                    className='flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-white text-[var(--brand)] ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-[#fff8f5] hover:ring-[var(--brand)]/30 disabled:opacity-60'
                    aria-label={`분위기 사진 ${galleryRemaining}장 더 추가`}
                  >
                    <PlusIcon className='size-4' />
                    <span className='text-[10px] font-semibold tabular-nums text-[var(--muted)]'>
                      {galleryRemaining}장 더
                    </span>
                  </button>
                ) : null}
              </div>
            )}

            {galleryUploading ? (
              <p className='mt-2 text-[11px] font-medium text-[var(--muted)]'>
                업로드 중…
              </p>
            ) : null}
          </section>

          <section className='mt-8'>
            <div className='flex items-end justify-between gap-3'>
              <div>
                <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
                  메뉴 사진
                </h2>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  사진마다 메뉴 이름과 한 줄 평을 따로 적어 주세요
                </p>
              </div>
              <p className='shrink-0 pb-0.5 text-[12px] font-medium tabular-nums text-[var(--muted)]'>
                {menuDrafts.length}/{FOOD_MENU_MAX}
              </p>
            </div>

            <div className='mt-3 rounded-xl bg-[#fff8f5] px-3.5 py-2.5 ring-1 ring-[var(--brand)]/15'>
              <p className='text-[12px] font-semibold text-[var(--brand)]'>
                첫 번째 메뉴 사진이 대표 사진으로 등록돼요
              </p>
              <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
                목록 카드와 상세 상단에 첫 번째 메뉴 사진이 크게 보여요.
              </p>
            </div>

            <input
              ref={menuFileInputRef}
              type='file'
              accept={IMAGE_LIBRARY_ACCEPT}
              multiple
              className='hidden'
              onChange={(e) => void handleMenuFilesSelected(e.target.files)}
            />

            {menuDrafts.length === 0 && menuPendingCount === 0 ? (
              <button
                type='button'
                disabled={!canAddMenu}
                onClick={openMenuPicker}
                className='mt-3 flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5 text-left ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-[#fff8f5] hover:ring-[var(--brand)]/30 disabled:opacity-60'
              >
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fff1ed] text-[var(--brand)]'>
                  <PlusIcon className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-[13px] font-semibold text-[var(--foreground)]'>
                    메뉴 사진 여러 장 선택
                  </span>
                  <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                    최대 {FOOD_MENU_MAX}장 · 첫 장이 대표 사진 · 이름·한 줄 평 필수
                  </span>
                </span>
              </button>
            ) : null}

            {menuDrafts.length > 0 || menuPendingCount > 0 ? (
              <div className='mt-3 space-y-2.5'>
                {menuDrafts.map((item, index) => {
                  const isCover = index === 0
                  const missingName =
                    Boolean(item.imageUrl) && !item.name.trim()
                  const missingCaption =
                    Boolean(item.imageUrl) && !item.caption.trim()
                  return (
                    <div
                      key={item.key}
                      id={`menu-card-${item.key}`}
                      className={
                        isCover
                          ? 'rounded-2xl bg-white p-3 ring-1 ring-[var(--brand)]/25'
                          : 'rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]'
                      }
                    >
                      <div className='mb-2.5 flex items-center justify-between gap-2'>
                        <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
                          <p className='text-[12px] font-semibold text-[var(--muted)]'>
                            메뉴 {index + 1}
                          </p>
                          {isCover ? (
                            <span className='inline-flex rounded-full bg-[#fff8f5] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
                              대표 사진
                            </span>
                          ) : null}
                        </div>
                        <button
                          type='button'
                          onClick={() => removeMenuRow(item.key)}
                          className='text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
                        >
                          삭제
                        </button>
                      </div>

                      <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]'>
                        <div className='relative min-w-0'>
                          <PhotoUploadZone
                            compact
                            className='min-w-0'
                            src={item.imageUrl || null}
                            onUploaded={(url) =>
                              updateMenuRow(item.key, { imageUrl: url })
                            }
                            emptyLabel='사진'
                            emptyHint=''
                            aspectClassName='aspect-square'
                          />
                          {isCover && item.imageUrl ? (
                            <span className='pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm'>
                              대표
                            </span>
                          ) : null}
                        </div>
                        <div className='flex min-h-0 min-w-0 flex-col gap-2'>
                          <div className='relative'>
                            <input
                              ref={(el) => {
                                nameRefs.current[item.key] = el
                              }}
                              type='text'
                              value={item.name}
                              onChange={(e) =>
                                updateMenuRow(item.key, {
                                  name: e.target.value.slice(
                                    0,
                                    FOOD_MENU_NAME_MAX,
                                  ),
                                })
                              }
                              maxLength={FOOD_MENU_NAME_MAX}
                              placeholder='메뉴 이름 (필수)'
                              className={cn(
                                'w-full rounded-xl bg-[#f8f8f9] px-3 py-2.5 pr-12 text-[13px] font-semibold outline-none ring-1 transition placeholder:font-normal placeholder:text-[var(--muted)] sm:text-[14px]',
                                missingName
                                  ? 'ring-red-300 focus:ring-red-400'
                                  : 'ring-black/[0.05] focus:ring-[var(--brand)]/35',
                              )}
                              aria-label={`메뉴 ${index + 1} 이름`}
                            />
                            <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--muted)]'>
                              {item.name.length}/{FOOD_MENU_NAME_MAX}
                            </span>
                          </div>
                          <div className='relative min-h-0 flex-1'>
                            <textarea
                              ref={(el) => {
                                captionRefs.current[item.key] = el
                              }}
                              value={item.caption}
                              onChange={(e) =>
                                updateMenuRow(item.key, {
                                  caption: e.target.value.slice(
                                    0,
                                    FOOD_MENU_CAPTION_MAX,
                                  ),
                                })
                              }
                              maxLength={FOOD_MENU_CAPTION_MAX}
                              placeholder='한 줄 평 (필수)'
                              className={cn(
                                'h-[4.75rem] w-full resize-none rounded-xl bg-[#f8f8f9] px-3 py-2.5 pb-6 text-[13px] leading-relaxed outline-none ring-1 transition placeholder:text-[var(--muted)] sm:h-[5.25rem] sm:text-[14px]',
                                missingCaption
                                  ? 'ring-red-300 focus:ring-red-400'
                                  : 'ring-black/[0.05] focus:ring-[var(--brand)]/35',
                              )}
                              aria-label={`메뉴 ${index + 1} 한 줄 평`}
                            />
                            <span className='pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular-nums text-[var(--muted)]'>
                              {item.caption.length}/{FOOD_MENU_CAPTION_MAX}
                            </span>
                          </div>
                        </div>
                      </div>
                      {missingName || missingCaption ? (
                        <p className='mt-2 text-[11px] font-medium text-red-600'>
                          {missingName && missingCaption
                            ? '메뉴 이름과 한 줄 평을 입력해 주세요'
                            : missingName
                              ? '메뉴 이름을 입력해 주세요'
                              : '한 줄 평을 입력해 주세요'}
                        </p>
                      ) : null}
                    </div>
                  )
                })}

                {Array.from({ length: menuPendingCount }, (_, index) => (
                  <div
                    key={`menu-pending-${index}`}
                    className='flex h-[7.5rem] items-center justify-center rounded-2xl bg-[#f3f4f6] ring-1 ring-dashed ring-black/[0.1]'
                    aria-hidden
                  >
                    <span className='text-[12px] font-medium text-[var(--muted)]'>
                      업로드 중…
                    </span>
                  </div>
                ))}

                {menuDrafts.length + menuPendingCount < FOOD_MENU_MAX ? (
                  <button
                    type='button'
                    disabled={!canAddMenu}
                    onClick={openMenuPicker}
                    className='flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-[#fff8f5] hover:ring-[var(--brand)]/30 disabled:opacity-60'
                  >
                    <PlusIcon className='size-3.5 text-[var(--brand)]' />
                    {menuUploading
                      ? '업로드 중…'
                      : `메뉴 사진 ${menuRemaining}장 더 추가`}
                  </button>
                ) : (
                  <p className='rounded-2xl bg-[#f3f4f6] px-4 py-2.5 text-center text-[12px] font-medium text-[var(--muted)]'>
                    메뉴는 최대 {FOOD_MENU_MAX}개까지 등록할 수 있어요
                  </p>
                )}
              </div>
            ) : null}
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
                    ? '주소를 선택해 주세요'
                    : selectedPlace.latitude == null ||
                        selectedPlace.longitude == null
                      ? '주소 좌표를 확인 중이에요'
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
          <CommunityWritingGuidelines
            anonymous={anonymousBoard}
            className='mb-5'
          />
          <form onSubmit={handleSubmit} className='space-y-5'>
            <Field
              label='제목'
              required
              hint={
                anonymousBoard
                  ? `${postTitle.length}/${ANONYMOUS_TITLE_MAX}`
                  : undefined
              }
            >
              <input
                required
                value={postTitle}
                maxLength={anonymousBoard ? ANONYMOUS_TITLE_MAX : undefined}
                onChange={(e) =>
                  setPostTitle(
                    anonymousBoard
                      ? e.target.value.slice(0, ANONYMOUS_TITLE_MAX)
                      : e.target.value,
                  )
                }
                className={inputClass}
                placeholder={meta.titlePlaceholder}
              />
            </Field>

            <div
              className={cn(
                'grid gap-4',
                meta.detailInput && meta.detailLabel
                  ? 'sm:grid-cols-2'
                  : null,
              )}
            >
              <Field label={meta.locationLabel}>
                {anonymousBoard ? (
                  <AnonymousTopicSelect
                    value={location}
                    onChange={setLocation}
                    placeholder={meta.locationPlaceholder}
                  />
                ) : (
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={inputClass}
                    placeholder={meta.locationPlaceholder}
                  />
                )}
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
          {required ? (
            <span className='text-[var(--brand)]'> *</span>
          ) : null}
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
