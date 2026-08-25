import type { FoodCategoryId, FoodMenuItem, FoodGalleryPhoto, CommunityPost } from '@/types/nyc'

export type FoodCategoryMeta = {
  id: FoodCategoryId
  label: string
  description: string
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
    label: '맛집',
    description: '꼭 가볼 만한 맛집',
    softClass: 'bg-[#fff1ed] text-[#c2410c] ring-1 ring-[#fdba74]/55',
    solidClass: 'bg-[#ea580c] text-white shadow-sm shadow-orange-500/25',
    badgeClass:
      'bg-[#ea580c]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#fed7aa] bg-[#fff7ed]',
    selectActiveClass: 'border-[#ea580c] bg-[#fff1ed] ring-1 ring-[#ea580c]/25',
  },
  {
    id: 'value',
    label: '가성비',
    description: '가격 대비 만족',
    softClass: 'bg-[#ecfdf5] text-[#047857] ring-1 ring-[#6ee7b7]/45',
    solidClass: 'bg-[#059669] text-white shadow-sm shadow-emerald-500/25',
    badgeClass:
      'bg-[#059669]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#a7f3d0] bg-[#f0fdf4]',
    selectActiveClass: 'border-[#059669] bg-[#ecfdf5] ring-1 ring-[#059669]/25',
  },
  {
    id: 'vibe',
    label: '느좋',
    description: '분위기 좋은 곳',
    softClass: 'bg-[#fff7ed] text-[#b45309] ring-1 ring-[#fcd34d]/50',
    solidClass: 'bg-[#d97706] text-white shadow-sm shadow-amber-500/25',
    badgeClass:
      'bg-[#d97706]/95 text-white shadow-sm backdrop-blur-sm',
    selectClass: 'border-[#fde68a] bg-[#fffbeb]',
    selectActiveClass: 'border-[#d97706] bg-[#fff7ed] ring-1 ring-[#d97706]/25',
  },
  {
    id: 'study',
    label: '카공',
    description: '공부·작업하기 좋은 카페',
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

export function getFoodCategoryLabel(
  id: FoodCategoryId | null | undefined,
): string | null {
  return getFoodCategory(id)?.label ?? null
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

export function getFoodCuisineLabel(
  idOrLabel: string | null | undefined,
): string | null {
  const value = String(idOrLabel || '').trim()
  if (!value) return null
  if (isFoodCuisineId(value)) return getFoodCuisine(value)?.label ?? value
  const byLabel = FOOD_CUISINES.find((item) => item.label === value)
  return byLabel?.label ?? value
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

/** 맛집: "2인 총 $45" */
export function formatFoodPartySpend(
  partySize: number | null | undefined,
  totalSpend: number | null | undefined,
): string | null {
  const people = Math.floor(Number(partySize) || 0)
  const spend = Number(totalSpend)
  if (people <= 0 && !(spend > 0)) return null
  const parts: string[] = []
  if (people > 0) parts.push(`${people}인`)
  if (spend > 0) parts.push(`총 $${formatUsd(spend)}`)
  return parts.join(' ')
}

/** 맛집: "웨이팅 25분" | "웨이팅 없음" */
export function formatFoodWait(
  waitMinutes: number | null | undefined,
): string | null {
  if (waitMinutes == null || !Number.isFinite(Number(waitMinutes))) return null
  const minutes = Math.max(0, Math.floor(Number(waitMinutes)))
  if (minutes === 0) return '웨이팅 없음'
  if (minutes < 60) return `웨이팅 ${minutes}분`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `웨이팅 ${hours}시간`
  return `웨이팅 ${hours}시간 ${rest}분`
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
  fallback = '메뉴',
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

/** 상세 상단 캐러셀: 대표 → 메뉴 → 분위기 순, URL 중복 제거 */
export function buildFoodDetailCarouselSlides(
  post: Pick<
    CommunityPost,
    'thumbnailUrl' | 'menuItems' | 'galleryPhotos'
  >,
): FoodCarouselSlide[] {
  const slides: FoodCarouselSlide[] = []
  const thumb = post.thumbnailUrl?.trim()
  if (thumb) {
    slides.push({ id: 'thumbnail', imageUrl: thumb, label: '대표' })
  }

  for (const item of post.menuItems || []) {
    const imageUrl = item.imageUrl?.trim()
    if (!imageUrl) continue
    slides.push({
      id: `menu-${item.id}`,
      imageUrl,
      label: getFoodMenuName(item),
    })
  }

  for (const photo of post.galleryPhotos || []) {
    const imageUrl = photo.imageUrl?.trim()
    if (!imageUrl) continue
    slides.push({
      id: `gallery-${photo.id}`,
      imageUrl,
      label: photo.caption?.trim() || '분위기',
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
