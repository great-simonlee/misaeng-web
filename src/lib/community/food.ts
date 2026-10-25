import type { Translate } from '@lib/i18n/translate'
import type { FoodCategoryId, FoodMenuItem, FoodGalleryPhoto, CommunityPost } from '@/types/nyc'

/**
 * 화면 표시 문구는 `food` 네임스페이스에 있다 (`const t = useT('food')`).
 * - 카테고리 이름: `t(`categories.${id}`)`, 설명: `t(`categoryDescriptions.${id}`)`
 * - 음식 종류: `t(`cuisines.${id}`)`
 * FOOD_CUISINES의 한국어 label은 글의 detail 저장값(예전 데이터 매칭·새 글 저장)이라 번역하지 않는다.
 */

export type FoodCategoryMeta = {
  id: FoodCategoryId
  /** 문구: food `categories.<id>` / `categoryDescriptions.<id>` */
  /** 비활성/연한 칩 */
  softClass: string
  /** 활성 칩·강조 */
  solidClass: string
  /** 카드/상세 뱃지 (반투명 배경) */
  badgeClass: string
  /** 글쓰기 선택 카드 테두리·배경 */
  selectClass: string
  selectActiveClass: string
}

export const FOOD_CATEGORIES: FoodCategoryMeta[] = [
  {
    id: 'restaurant',
    softClass: 'bg-brand-subtle text-[#c2410c] ring-1 ring-[#fdba74]/55',
    solidClass: 'bg-[#ea580c] text-white shadow-sm shadow-orange-500/25',
    badgeClass:
      'bg-[#ea580c]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#fed7aa] bg-[#fff7ed]',
    selectActiveClass: 'border-[#ea580c] bg-brand-subtle ring-1 ring-[#ea580c]/25',
  },
  {
    id: 'value',
    softClass: 'bg-[#ecfdf5] text-[#047857] ring-1 ring-[#6ee7b7]/45',
    solidClass: 'bg-[#059669] text-white shadow-sm shadow-emerald-500/25',
    badgeClass:
      'bg-[#059669]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#a7f3d0] bg-[#f0fdf4]',
    selectActiveClass: 'border-[#059669] bg-[#ecfdf5] ring-1 ring-[#059669]/25',
  },
  {
    id: 'vibe',
    softClass: 'bg-[#fff7ed] text-[#b45309] ring-1 ring-[#fcd34d]/50',
    solidClass: 'bg-[#d97706] text-white shadow-sm shadow-amber-500/25',
    badgeClass:
      'bg-[#d97706]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#fde68a] bg-[#fffbeb]',
    selectActiveClass: 'border-[#d97706] bg-[#fff7ed] ring-1 ring-[#d97706]/25',
  },
  {
    id: 'study',
    softClass: 'bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#93c5fd]/50',
    solidClass: 'bg-[#2563eb] text-white shadow-sm shadow-blue-500/25',
    badgeClass:
      'bg-[#2563eb]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#bfdbfe] bg-[#f8fafc]',
    selectActiveClass: 'border-[#2563eb] bg-[#eff6ff] ring-1 ring-[#2563eb]/25',
  },
]

export function isFoodCategoryId(value: unknown): value is FoodCategoryId {
  return (
    value === 'restaurant' ||
    value === 'value' ||
    value === 'vibe' ||
    value === 'study'
  )
}

export function getFoodCategory(
  id: FoodCategoryId | null | undefined,
): FoodCategoryMeta | null {
  if (!id) return null
  return FOOD_CATEGORIES.find((item) => item.id === id) ?? null
}

/** t는 `useT('food')` / `getT(locale, 'food')` */
export function getFoodCategoryLabel(
  id: FoodCategoryId | null | undefined,
  t: Translate,
): string | null {
  const meta = getFoodCategory(id)
  if (!meta) return null
  return t(`categories.${meta.id}`)
}

export function normalizeFoodCategory(raw: unknown): FoodCategoryId | null {
  const value = String(raw || '').trim()
  return isFoodCategoryId(value) ? value : null
}

/** 맛집: 음식 종류 (브런치·한식 등) */
export type FoodCuisineId =
  | 'brunch'
  | 'korean'
  | 'japanese'
  | 'chinese'
  | 'american'
  | 'french'
  | 'italian'
  | 'mexican'
  | 'thai'
  | 'vietnamese'
  | 'indian'
  | 'other'

export type FoodCuisineMeta = {
  id: FoodCuisineId
  /** 예전 글은 detail에 이 한글 라벨이 저장돼 있다 (정규화용). 표시는 `t(`cuisines.${id}`)` */
  label: string
}

export const FOOD_CUISINES: FoodCuisineMeta[] = [
  { id: 'brunch', label: '브런치' },
  { id: 'korean', label: '한식' },
  { id: 'japanese', label: '일식' },
  { id: 'chinese', label: '중식' },
  { id: 'american', label: '양식' },
  { id: 'french', label: '프랑스' },
  { id: 'italian', label: '이탈리안' },
  { id: 'mexican', label: '멕시칸' },
  { id: 'thai', label: '태국' },
  { id: 'vietnamese', label: '베트남' },
  { id: 'indian', label: '인도' },
  { id: 'other', label: '기타' },
]

export function isFoodCuisineId(value: unknown): value is FoodCuisineId {
  return FOOD_CUISINES.some((item) => item.id === value)
}

export function getFoodCuisine(
  id: FoodCuisineId | null | undefined,
): FoodCuisineMeta | null {
  if (!id) return null
  return FOOD_CUISINES.find((item) => item.id === id) ?? null
}

/** t는 `useT('food')` / `getT(locale, 'food')`. 없으면 한국어 원문 */
export function getFoodCuisineLabel(
  idOrLabel: string | null | undefined,
  t?: Translate,
): string | null {
  const value = String(idOrLabel || '').trim()
  if (!value) return null
  const meta = isFoodCuisineId(value)
    ? getFoodCuisine(value)
    : FOOD_CUISINES.find((item) => item.label === value) ?? null
  if (!meta) return value
  return t ? t(`cuisines.${meta.id}`) : meta.label
}

export function normalizeFoodCuisine(raw: unknown): FoodCuisineId | null {
  const value = String(raw || '').trim()
  if (isFoodCuisineId(value)) return value
  const byLabel = FOOD_CUISINES.find((item) => item.label === value)
  return byLabel?.id ?? null
}

/** 맛집 방문 정보 — 정수만 */
export const FOOD_PARTY_MIN = 1
export const FOOD_PARTY_MAX = 20
export const FOOD_SPEND_MIN = 0
export const FOOD_SPEND_MAX = 9999
export const FOOD_WAIT_MIN = 0
export const FOOD_WAIT_MAX = 300
export const FOOD_GALLERY_MAX = 4
export const FOOD_MENU_MAX = 8
export const FOOD_MENU_NAME_MAX = 20
export const FOOD_MENU_CAPTION_MAX = 120

export type FoodCarouselSlide = {
  id: string
  imageUrl: string
  label: string
}

/** 맛집·커뮤니티 본문 플레인 텍스트 최대 글자 수 */
export const COMMUNITY_BODY_MAX = 2000

/** 숫자 문자열을 정수로만 정리 (음수·소수·비숫자 제거) */
export function sanitizeFoodIntInput(
  raw: string,
  min: number,
  max: number,
): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  const n = Number.parseInt(digits, 10)
  if (!Number.isFinite(n)) return ''
  return String(Math.min(max, Math.max(0, n)))
}

export function parseFoodInt(
  raw: string,
  min: number,
  max: number,
): number | null {
  const cleaned = sanitizeFoodIntInput(raw, min, max)
  if (cleaned === '') return null
  const n = Number.parseInt(cleaned, 10)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

/**
 * 맛집: "2인 총 $45 · 팁 포함"
 * t는 `useT('food')` / `getT(locale, 'food')`
 */
export function formatFoodPartySpend(
  partySize: number | null | undefined,
  totalSpend: number | null | undefined,
  tipIncluded: boolean | null | undefined,
  t: Translate,
): string | null {
  const people = Math.floor(Number(partySize) || 0)
  const spend = Number(totalSpend)
  if (people <= 0 && !(spend > 0)) return null
  if (!(spend > 0)) return t('spend.people', { count: people })
  const tip =
    tipIncluded === true ? 'WithTip' : tipIncluded === false ? 'WithoutTip' : ''
  const amount = formatUsd(spend)
  return people > 0
    ? t(`spend.peopleTotal${tip}`, { count: people, amount })
    : t(`spend.total${tip}`, { amount })
}

/** t는 `useT('food')` */
export function formatFoodTipIncluded(
  tipIncluded: boolean | null | undefined,
  t: Translate,
): string | null {
  if (tipIncluded === true) return t('spend.tipIncluded')
  if (tipIncluded === false) return t('spend.tipExcluded')
  return null
}

export function normalizeTipIncluded(raw: unknown): boolean | null {
  if (raw === true || raw === false) return raw
  if (raw === 'true' || raw === 1 || raw === '1') return true
  if (raw === 'false' || raw === 0 || raw === '0') return false
  return null
}

/** 맛집: "웨이팅 25분" | "웨이팅 없음". t는 `useT('food')` */
export function formatFoodWait(
  waitMinutes: number | null | undefined,
  t: Translate,
): string | null {
  if (waitMinutes == null || !Number.isFinite(Number(waitMinutes))) return null
  const minutes = Math.max(0, Math.floor(Number(waitMinutes)))
  if (minutes === 0) return t('wait.none')
  if (minutes < 60) return t('wait.minutes', { minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return t('wait.hours', { hours })
  return t('wait.hoursMinutes', { hours, minutes: rest })
}

export function normalizeWaitMinutes(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(FOOD_WAIT_MAX, Math.max(FOOD_WAIT_MIN, Math.floor(n)))
}

export function normalizePartySize(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < FOOD_PARTY_MIN) return null
  return Math.min(FOOD_PARTY_MAX, Math.floor(n))
}

export function normalizeTotalSpend(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < FOOD_SPEND_MIN) return null
  return Math.min(FOOD_SPEND_MAX, Math.floor(n))
}

export function formatUsd(value: number): string {
  const n = Math.max(0, Math.floor(Number(value) || 0))
  return n.toLocaleString('en-US')
}

export function normalizeFoodMenuItems(raw: unknown): FoodMenuItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const data = item as Record<string, unknown>
      const imageUrl = String(data.imageUrl || '').trim()
      if (!imageUrl) return null
      const name = String(data.name || '').trim()
      const caption = String(data.caption || '').trim()
      return {
        id:
          String(data.id || '').trim() ||
          `menu_${index}_${Math.random().toString(36).slice(2, 7)}`,
        imageUrl,
        name,
        caption,
      }
    })
    .filter((item): item is FoodMenuItem => Boolean(item))
}

/** 상세·라이트박스용 메뉴 표시 문구 */
export function formatFoodMenuDisplay(
  item: Pick<FoodMenuItem, 'name' | 'caption'>,
): string {
  const name = item.name?.trim() || ''
  const caption = item.caption?.trim() || ''
  if (name && caption) return `${name} — ${caption}`
  return name || caption || ''
}

/** 메뉴 이름 (없으면 캡션·기본값) */
export function getFoodMenuName(
  item: Pick<FoodMenuItem, 'name' | 'caption'>,
  fallback: string,
): string {
  return item.name?.trim() || item.caption?.trim() || fallback
}

export function normalizeFoodGalleryPhotos(raw: unknown): FoodGalleryPhoto[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const data = item as Record<string, unknown>
      const imageUrl = String(data.imageUrl || '').trim()
      if (!imageUrl) return null
      return {
        id:
          String(data.id || '').trim() ||
          `gallery_${index}_${Math.random().toString(36).slice(2, 7)}`,
        imageUrl,
        caption: String(data.caption || '').trim(),
      }
    })
    .filter((item): item is FoodGalleryPhoto => Boolean(item))
}

/** 상세 상단 캐러셀: 대표 → 메뉴 → 분위기 순, URL 중복 제거. t는 `useT('food')` */
export function buildFoodDetailCarouselSlides(
  post: Pick<
    CommunityPost,
    'thumbnailUrl' | 'menuItems' | 'galleryPhotos'
  >,
  t: Translate,
): FoodCarouselSlide[] {
  const slides: FoodCarouselSlide[] = []
  const thumb = post.thumbnailUrl?.trim()
  if (thumb) {
    slides.push({ id: 'thumbnail', imageUrl: thumb, label: t('carousel.cover') })
  }

  for (const item of post.menuItems || []) {
    const imageUrl = item.imageUrl?.trim()
    if (!imageUrl) continue
    slides.push({
      id: `menu-${item.id}`,
      imageUrl,
      label: getFoodMenuName(item, t('carousel.menu')),
    })
  }

  for (const photo of post.galleryPhotos || []) {
    const imageUrl = photo.imageUrl?.trim()
    if (!imageUrl) continue
    slides.push({
      id: `gallery-${photo.id}`,
      imageUrl,
      label: photo.caption?.trim() || t('carousel.vibe'),
    })
  }

  const seen = new Set<string>()
  return slides.filter((slide) => {
    if (seen.has(slide.imageUrl)) return false
    seen.add(slide.imageUrl)
    return true
  })
}

export function resolveCommunityThumbnail(post: {
  thumbnailUrl?: string | null
  menuItems?: FoodMenuItem[] | null
  contentHtml?: string | null
}): string | null {
  const direct = post.thumbnailUrl?.trim()
  if (direct) return direct
  const fromMenu = post.menuItems?.find((item) => item.imageUrl)?.imageUrl
  if (fromMenu) return fromMenu
  return extractFirstImageFromHtml(post.contentHtml)
}

function extractFirstImageFromHtml(html: string | null | undefined) {
  if (!html) return null
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1]?.trim() || null
}
