'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import {
  LoadingState,
  PhotoUploadZone,
  TipTapEditor,
} from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cityLoginPath, hrefForCommunityPost } from '@lib/constants/cities'
import {
  createCommunityPostRequest,
  fetchCommunityPost,
  localizeCommunityError,
  updateCommunityPostRequest,
} from '@lib/community/client'
import {
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from '@lib/community/writeDraft'
import { isAccountSuspended, isIdentityVerified } from '@lib/community/schoolGate'
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
  communityBoardKey,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { useFormat, useT } from '@lib/i18n/client'
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
import { AnonymousWriteScreen } from '@screens/nyc/AnonymousWriteScreen'
import { RoommateWriteScreen } from '@screens/nyc/RoommateWriteScreen'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'

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

type FoodWriteDraft = {
  postTitle: string
  contentHtml: string
  location: string
  detail: string
  selectedPlace: PlaceSearchResult | null
  foodCategory: FoodCategoryId | null
  foodCuisine: FoodCuisineId | null
  partySize: string
  totalSpend: string
  tipIncluded: boolean | null
  waitMinutes: string
  menuDrafts: MenuDraft[]
  galleryDrafts: GalleryDraft[]
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
  if (boardId === 'anonymous') {
    return <AnonymousWriteScreen title={title} editPostId={editPostId} />
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
  const t = useT('community')
  const tFood = useT('food')
  const fmt = useFormat()
  const city = useCity()
  const href = useCityPath()
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const boardText = (field: Parameters<typeof communityBoardKey>[1]) =>
    t(communityBoardKey(boardId, field))
  const isEdit = Boolean(editPostId)
  const anonymousBoard = isAnonymousBoard(boardId)
  const loginNext = editPostId
    ? href(`/${boardId}/${editPostId}/edit`)
    : href(`/${boardId}/new`)
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
  const [tipIncluded, setTipIncluded] = useState<boolean | null>(null)
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

  const [draftHydrated, setDraftHydrated] = useState(!isFood || isEdit)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!isFood || isEdit || !user?.uid) return
    const stored = loadWriteDraft<FoodWriteDraft>('food', city, user.uid)
    if (stored) {
      setPostTitle(stored.data.postTitle ?? '')
      setContentHtml(stored.data.contentHtml ?? '')
      setLocation(stored.data.location ?? '')
      setDetail(stored.data.detail ?? '')
      setSelectedPlace(stored.data.selectedPlace ?? null)
      setFoodCategory(stored.data.foodCategory ?? null)
      setFoodCuisine(stored.data.foodCuisine ?? null)
      setPartySize(stored.data.partySize ?? '2')
      setTotalSpend(stored.data.totalSpend ?? '')
      setTipIncluded(stored.data.tipIncluded ?? null)
      setWaitMinutes(stored.data.waitMinutes ?? '')
      setMenuDrafts(Array.isArray(stored.data.menuDrafts) ? stored.data.menuDrafts : [])
      setGalleryDrafts(
        Array.isArray(stored.data.galleryDrafts) ? stored.data.galleryDrafts : [],
      )
      setDraftSavedAt(stored.savedAt)
    }
    setDraftHydrated(true)
  }, [city, isEdit, isFood, user?.uid])

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
          toastError(t('write.errors.postNotFound'))
          router.replace(href('/me/posts'))
          return
        }
        if (post.authorUid !== user.uid) {
          toastError(t('write.errors.noEditPermission'))
          router.replace(hrefForCommunityPost(post, city))
          return
        }
        if (post.categoryId !== boardId) {
          router.replace(hrefForCommunityPost(post, city, 'edit'))
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
        setTipIncluded(
          post.tipIncluded === true || post.tipIncluded === false
            ? post.tipIncluded
            : null,
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
          toastError(
            getErrorMessage(
              localizeCommunityError(err, t),
              t('detail.loadFailed'),
            ),
          )
          router.replace(href('/me/posts'))
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [city, editPostId, href, user?.uid, boardId, router, t, toastError])

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
      toastError(t('write.food.menuMaxReached', { max: FOOD_MENU_MAX }))
      resetMenuFileInput()
      return
    }

    const selected = pickImageFiles(files, remaining)
    if (selected.length === 0) {
      toastError(t('write.food.imagesOnly'))
      resetMenuFileInput()
      return
    }
    if (files.length > remaining) {
      toastError(
        t('write.food.menuMaxPartial', {
          max: FOOD_MENU_MAX,
          count: selected.length,
        }),
      )
    }

    setMenuUploading(true)
    setMenuPendingCount(selected.length)
    let successCount = 0
    let failCount = 0
    let didSetFocus = false

    for (const file of selected) {
      try {
        const url = await uploadCommunityImageFile(file, t)
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
          ? t('write.food.uploadPartial', {
              success: successCount,
              failed: failCount,
            })
          : t('write.food.menuUploadFailed'),
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
      toastError(t('write.food.galleryMaxReached', { max: FOOD_GALLERY_MAX }))
      resetGalleryFileInput()
      return
    }

    const selected = pickImageFiles(files, remaining)
    if (selected.length === 0) {
      toastError(t('write.food.imagesOnly'))
      resetGalleryFileInput()
      return
    }
    if (files.length > remaining) {
      toastError(
        t('write.food.galleryMaxPartial', {
          max: FOOD_GALLERY_MAX,
          count: selected.length,
        }),
      )
    }

    setGalleryUploading(true)
    setGalleryPendingCount(selected.length)
    let successCount = 0
    let failCount = 0

    for (const file of selected) {
      try {
        const url = await uploadCommunityImageFile(file, t)
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
          ? t('write.food.uploadPartial', {
              success: successCount,
              failed: failCount,
            })
          : t('write.food.galleryUploadFailed'),
      )
    }

    setGalleryUploading(false)
    setGalleryPendingCount(0)
    resetGalleryFileInput()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      toastError(t('errors.loginRequired'))
      router.replace(cityLoginPath(city, loginNext))
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(t('write.errors.bodyRequired'))
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        t('write.errors.bodyTooLong', { max: fmt.number(COMMUNITY_BODY_MAX) }),
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
        toastError(t('write.errors.titleRequired'))
        return
      }
      if (titleValue.length > ANONYMOUS_TITLE_MAX) {
        toastError(t('write.errors.titleTooLong', { max: ANONYMOUS_TITLE_MAX }))
        return
      }
    }

    if (isFood) {
      if (!selectedPlace) {
        toastError(t('write.food.errors.addressRequired'))
        return
      }
      if (
        selectedPlace.latitude == null ||
        selectedPlace.longitude == null
      ) {
        toastError(t('write.food.errors.coordinatesMissing'))
        return
      }
      if (!foodCategory) {
        toastError(t('write.food.errors.categoryRequired'))
        return
      }
      if (!foodCuisine) {
        toastError(t('write.food.errors.cuisineRequired'))
        return
      }
      if (!postTitle.trim()) {
        toastError(t('write.food.errors.nameRequired'))
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
        toastError(
          t('write.food.errors.partySizeRange', {
            min: FOOD_PARTY_MIN,
            max: FOOD_PARTY_MAX,
          }),
        )
        return
      }
      if (totalSpendNum == null) {
        toastError(
          t('write.food.errors.spendRange', {
            max: fmt.usd(FOOD_SPEND_MAX),
          }),
        )
        return
      }
      if (tipIncluded == null) {
        toastError(t('write.food.errors.tipRequired'))
        return
      }
      if (waitMinutesNum == null) {
        toastError(t('write.food.errors.waitRange', { max: FOOD_WAIT_MAX }))
        return
      }

      const incompleteMenu = menuDrafts.find((item) => {
        const hasImage = Boolean(item.imageUrl.trim())
        const hasName = Boolean(item.name.trim())
        const hasCaption = Boolean(item.caption.trim())
        return hasImage && (!hasName || !hasCaption)
      })
      if (incompleteMenu) {
        toastError(t('write.food.errors.menuIncomplete'))
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
      toastError(t('write.errors.titleAndBodyRequired'))
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
        tipIncluded: isFood ? tipIncluded : null,
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
            city,
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
      if (!isEdit && isFood && user.uid) {
        clearWriteDraft('food', city, user.uid)
      }
      success(isEdit ? t('write.updated') : t('write.created'))
      router.push(hrefForCommunityPost(post, city))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          isEdit ? t('errors.updateFailed') : t('errors.createFailed'),
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    if (!user?.uid || !isFood) return
    try {
      const savedAt = saveWriteDraft<FoodWriteDraft>('food', city, user.uid, {
        postTitle,
        contentHtml,
        location,
        detail,
        selectedPlace,
        foodCategory,
        foodCuisine,
        partySize,
        totalSpend,
        tipIncluded,
        waitMinutes,
        menuDrafts,
        galleryDrafts,
      })
      setDraftSavedAt(savedAt)
      success(t('write.draftSaved'))
    } catch {
      toastError(t('write.draftSaveFailed'))
    }
  }

  if (loading || loadingEdit || !isAuthenticated || !user || !draftHydrated) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState
          fullPage
          label={
            !loading && !isAuthenticated
              ? t('write.redirectingToLogin')
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
                ? href(`/${boardId}/${editPostId}`)
                : href(`/${boardId}`)
            }
            label={
              isEdit
                ? t('write.backToPost')
                : t('detail.backToList', { board: title })
            }
            className='mb-6'
          />

          <CommunityWritingGuidelines className='mb-6' />

          <section>
            <h2 className='text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]'>
              {t('write.food.whereTitle')}
            </h2>
            <p className='mt-1 text-[13px] text-[var(--muted)]'>
              {t('write.food.whereDescription')}
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
            <Field label={t('write.food.nameLabel')} required>
              <RestaurantNameField
                value={postTitle}
                onChange={setPostTitle}
                latitude={selectedPlace?.latitude ?? null}
                longitude={selectedPlace?.longitude ?? null}
                placeId={selectedPlace?.placeId ?? null}
                inputClassName={inputClass}
                placeholder={boardText('titlePlaceholder')}
              />
            </Field>
          </section>

          <section className='mt-8'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              {t('write.food.categoryTitle')}
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
                    {tFood(`categories.${cat.id}`)}
                  </button>
                )
              })}
            </div>
          </section>

          <section className='mt-8'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              {t('write.food.cuisineTitle')}
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
                    {getFoodCuisineLabel(cuisine.id, tFood) ?? cuisine.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section className='mt-8'>
            <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
              {t('write.food.visitTitle')}
            </h2>
            <div className='mt-2.5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]'>
              <VisitIntField
                label={t('write.food.partySize')}
                hint={t('write.food.partySizeHint', { max: FOOD_PARTY_MAX })}
                unit={t('write.food.partySizeUnit')}
                value={partySize}
                min={FOOD_PARTY_MIN}
                max={FOOD_PARTY_MAX}
                onChange={setPartySize}
              />
              <div className='mx-4 border-t border-black/[0.05]' />
              <div className='flex items-center justify-between gap-2.5 px-4 py-3.5'>
                <div className='min-w-0 shrink'>
                  <p className='text-[14px] font-semibold tracking-tight text-[var(--foreground)]'>
                    {t('write.food.totalSpend')}
                  </p>
                  <p className='mt-0.5 text-[11px] text-[var(--muted)]'>
                    {t('write.food.totalSpendHint', {
                      max: fmt.usd(FOOD_SPEND_MAX),
                    })}
                  </p>
                </div>

                <div className='flex shrink-0 items-center gap-1.5'>
                  <div
                    role='group'
                    aria-label={t('write.food.tipAria')}
                    className='inline-flex h-9 items-center rounded-full bg-[#f1f2f4] p-0.5 ring-1 ring-black/[0.04]'
                  >
                    {(
                      [
                        { value: true, label: t('write.food.tipIncluded') },
                        { value: false, label: t('write.food.tipExcluded') },
                      ] as const
                    ).map((option) => {
                      const active = tipIncluded === option.value
                      return (
                        <button
                          key={option.label}
                          type='button'
                          onClick={() => setTipIncluded(option.value)}
                          className={cn(
                            'h-8 min-w-[3.25rem] rounded-full px-2 text-[11px] font-semibold tracking-tight touch-manipulation transition',
                            active
                              ? 'bg-white text-[var(--foreground)] shadow-[0_1px_3px_rgba(15,23,42,0.12)]'
                              : 'text-[var(--muted)]',
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>

                  <label className='flex h-11 min-w-[5.5rem] cursor-text items-center justify-center rounded-xl bg-[#f8f8f9] px-3 ring-1 ring-black/[0.05] transition focus-within:ring-[var(--brand)]/40'>
                    <span className='mr-1 text-[14px] font-semibold text-[var(--muted)]'>
                      $
                    </span>
                    <input
                      required
                      type='text'
                      inputMode='numeric'
                      pattern='[0-9]*'
                      autoComplete='off'
                      enterKeyHint='done'
                      placeholder='0'
                      value={totalSpend}
                      onChange={(e) =>
                        setTotalSpend(
                          sanitizeFoodIntInput(
                            e.target.value,
                            FOOD_SPEND_MIN,
                            FOOD_SPEND_MAX,
                          ),
                        )
                      }
                      onBlur={() => {
                        if (totalSpend === '') return
                        const parsed = parseFoodInt(
                          totalSpend,
                          FOOD_SPEND_MIN,
                          FOOD_SPEND_MAX,
                        )
                        if (parsed != null) setTotalSpend(String(parsed))
                        else setTotalSpend(String(FOOD_SPEND_MIN))
                      }}
                      className='w-14 bg-transparent text-center text-[18px] font-semibold tabular-nums tracking-tight text-[var(--foreground)] outline-none'
                      aria-label={t('write.food.totalSpend')}
                    />
                  </label>
                </div>
              </div>
              <div className='mx-4 border-t border-black/[0.05]' />
              <VisitIntField
                label={t('write.food.wait')}
                hint={t('write.food.waitHint', { max: FOOD_WAIT_MAX })}
                unit={t('write.food.waitUnit')}
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
                  {t('write.food.galleryTitle')}
                </h2>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  {t('write.food.galleryDescription', { max: FOOD_GALLERY_MAX })}
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
                className='mt-3 flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5 text-left ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-brand-soft hover:ring-[var(--brand)]/30 disabled:opacity-60'
              >
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-[var(--brand)]'>
                  <PlusIcon className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-[13px] font-semibold text-[var(--foreground)]'>
                    {t('write.food.galleryPick')}
                  </span>
                  <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                    {t('write.food.galleryPickHint', { max: FOOD_GALLERY_MAX })}
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
                      {t('detail.delete')}
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
                    className='flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-white text-[var(--brand)] ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-brand-soft hover:ring-[var(--brand)]/30 disabled:opacity-60'
                    aria-label={t('write.food.galleryAddMoreAria', {
                      count: galleryRemaining,
                    })}
                  >
                    <PlusIcon className='size-4' />
                    <span className='text-[10px] font-semibold tabular-nums text-[var(--muted)]'>
                      {t('write.food.galleryAddMore', { count: galleryRemaining })}
                    </span>
                  </button>
                ) : null}
              </div>
            )}

            {galleryUploading ? (
              <p className='mt-2 text-[11px] font-medium text-[var(--muted)]'>
                {t('write.food.uploading')}
              </p>
            ) : null}
          </section>

          <section className='mt-8'>
            <div className='flex items-end justify-between gap-3'>
              <div>
                <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
                  {t('write.food.menuTitle')}
                </h2>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  {t('write.food.menuDescription')}
                </p>
              </div>
              <p className='shrink-0 pb-0.5 text-[12px] font-medium tabular-nums text-[var(--muted)]'>
                {menuDrafts.length}/{FOOD_MENU_MAX}
              </p>
            </div>

            <div className='mt-3 rounded-xl bg-brand-soft px-3.5 py-2.5 ring-1 ring-[var(--brand)]/15'>
              <p className='text-[12px] font-semibold text-[var(--brand)]'>
                {t('write.food.coverNoticeTitle')}
              </p>
              <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]'>
                {t('write.food.coverNoticeBody')}
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
                className='mt-3 flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5 text-left ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-brand-soft hover:ring-[var(--brand)]/30 disabled:opacity-60'
              >
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-[var(--brand)]'>
                  <PlusIcon className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-[13px] font-semibold text-[var(--foreground)]'>
                    {t('write.food.menuPick')}
                  </span>
                  <span className='mt-0.5 block text-[11px] text-[var(--muted)]'>
                    {t('write.food.menuPickHint', { max: FOOD_MENU_MAX })}
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
                            {t('write.food.menuNumber', { n: index + 1 })}
                          </p>
                          {isCover ? (
                            <span className='inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] ring-1 ring-[var(--brand)]/15'>
                              {t('write.food.coverPhoto')}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type='button'
                          onClick={() => removeMenuRow(item.key)}
                          className='text-[11px] font-medium text-[var(--muted)] touch-manipulation hover:text-red-600'
                        >
                          {t('detail.delete')}
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
                            emptyLabel={t('write.food.photo')}
                            emptyHint=''
                            aspectClassName='aspect-square'
                          />
                          {isCover && item.imageUrl ? (
                            <span className='pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm'>
                              {t('write.food.cover')}
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
                              placeholder={t('write.food.menuNamePlaceholder')}
                              className={cn(
                                'w-full rounded-xl bg-[#f8f8f9] px-3 py-2.5 pr-12 text-[13px] font-semibold outline-none ring-1 transition placeholder:font-normal placeholder:text-[var(--muted)] sm:text-[14px]',
                                missingName
                                  ? 'ring-red-300 focus:ring-red-400'
                                  : 'ring-black/[0.05] focus:ring-[var(--brand)]/35',
                              )}
                              aria-label={t('write.food.menuNameAria', { n: index + 1 })}
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
                              placeholder={t('write.food.menuCaptionPlaceholder')}
                              className={cn(
                                'h-[4.75rem] w-full resize-none rounded-xl bg-[#f8f8f9] px-3 py-2.5 pb-6 text-[13px] leading-relaxed outline-none ring-1 transition placeholder:text-[var(--muted)] sm:h-[5.25rem] sm:text-[14px]',
                                missingCaption
                                  ? 'ring-red-300 focus:ring-red-400'
                                  : 'ring-black/[0.05] focus:ring-[var(--brand)]/35',
                              )}
                              aria-label={t('write.food.menuCaptionAria', { n: index + 1 })}
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
                            ? t('write.food.missingNameAndCaption')
                            : missingName
                              ? t('write.food.missingName')
                              : t('write.food.missingCaption')}
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
                      {t('write.food.uploading')}
                    </span>
                  </div>
                ))}

                {menuDrafts.length + menuPendingCount < FOOD_MENU_MAX ? (
                  <button
                    type='button'
                    disabled={!canAddMenu}
                    onClick={openMenuPicker}
                    className='flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-[13px] font-semibold text-[var(--foreground)] ring-1 ring-dashed ring-black/[0.12] touch-manipulation transition hover:bg-brand-soft hover:ring-[var(--brand)]/30 disabled:opacity-60'
                  >
                    <PlusIcon className='size-3.5 text-[var(--brand)]' />
                    {menuUploading
                      ? t('write.food.uploading')
                      : t('write.food.menuAddMore', { count: menuRemaining })}
                  </button>
                ) : (
                  <p className='rounded-2xl bg-[#f3f4f6] px-4 py-2.5 text-center text-[12px] font-medium text-[var(--muted)]'>
                    {t('write.food.menuMaxReached', { max: FOOD_MENU_MAX })}
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <section className='mt-8'>
            <div>
              <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
                {t('write.bodyLabel')}
              </h2>
              <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                {t('write.food.bodyDescription')}
              </p>
            </div>
            <div className='mt-3'>
              <TipTapEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder={boardText('descriptionPlaceholder')}
                minHeightClassName='min-h-[200px]'
                maxLength={COMMUNITY_BODY_MAX}
              />
            </div>
          </section>

          <div className='mt-8'>
            {isEdit ? (
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
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white shadow-[0_4px_14px_rgb(var(--brand-rgb)/0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] active:scale-[0.99] disabled:opacity-50 sm:h-12 sm:text-[15px]'
              >
                {submitting ? t('comments.saving') : t('comments.saveEdit')}
              </button>
            ) : (
              <WriteDraftActions
                onSave={handleSaveDraft}
                savedAt={draftSavedAt}
                disabled={submitting}
              >
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
                  className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white shadow-[0_4px_14px_rgb(var(--brand-rgb)/0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] active:scale-[0.99] disabled:opacity-50 sm:h-12 sm:text-[15px]'
                >
                  {submitting
                    ? t('comments.submitting')
                    : !postTitle.trim()
                      ? t('write.food.errors.nameRequired')
                      : !selectedPlace
                        ? t('write.food.selectAddress')
                        : selectedPlace.latitude == null ||
                            selectedPlace.longitude == null
                          ? t('write.food.checkingCoordinates')
                          : !foodCategory
                            ? t('write.food.errors.categoryRequired')
                            : !foodCuisine
                              ? t('write.food.selectCuisine')
                              : t('write.food.submit')}
                </button>
              </WriteDraftActions>
            )}
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
                ? href(`/${boardId}/${editPostId}`)
                : href(`/${boardId}`)
            }
            label={
              isEdit
                ? t('write.backToPost')
                : t('detail.backToList', { board: title })
            }
            className='mb-5'
        />

        <BoardSurface className='p-5 sm:p-6'>
          <CommunityWritingGuidelines
            anonymous={anonymousBoard}
            className='mb-5'
          />
          <form onSubmit={handleSubmit} className='space-y-5'>
            <Field
              label={t('write.titleLabel')}
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
                placeholder={boardText('titlePlaceholder')}
              />
            </Field>

            <div
              className={cn(
                'grid gap-4',
                meta.detailInput && meta.hasDetail
                  ? 'sm:grid-cols-2'
                  : null,
              )}
            >
              <Field label={boardText('locationLabel')}>
                {anonymousBoard ? (
                  <AnonymousTopicSelect
                    value={location}
                    onChange={setLocation}
                    placeholder={boardText('locationPlaceholder')}
                  />
                ) : (
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={inputClass}
                    placeholder={boardText('locationPlaceholder')}
                  />
                )}
              </Field>
              {meta.detailInput && meta.hasDetail && (
                <Field label={boardText('detailLabel')}>
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
                    placeholder={
                      meta.hasDetailPlaceholder ? boardText('detailPlaceholder') : ''
                    }
                  />
                </Field>
              )}
            </div>

            <div>
              <p className='text-[13px] font-medium text-[var(--foreground)]'>
                {t('write.bodyLabel')} *
              </p>
              <div className='mt-1.5'>
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder={boardText('descriptionPlaceholder')}
                  maxLength={COMMUNITY_BODY_MAX}
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={submitting}
              className='h-11 w-full rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white shadow-[0_4px_14px_rgb(var(--brand-rgb)/0.28)] touch-manipulation hover:bg-[var(--brand-hover)] disabled:opacity-50'
            >
              {submitting
                ? isEdit
                  ? t('comments.saving')
                  : t('comments.submitting')
                : isEdit
                  ? t('comments.saveEdit')
                  : t('write.publish')}
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
