import { isLocale, type Locale } from '@lib/i18n/locales'

/**
 * 사용자 콘텐츠(글·댓글·매물) 번역 규칙. ellieo-erp `src/app/util/contentTranslations.mjs`와 쌍둥이다 —
 * segment 키와 해시가 같아야 ERP가 저장한 번역을 웹이 "최신"으로 읽는다. 바꿀 때 두 곳을 같이 바꾼다.
 *
 * 저장 형태 (Storage JSON 객체에 같이 저장):
 *   sourceLocale: 'ko'   (없으면 ko — 2026-10 이전 글은 모두 한국어)
 *   translations: { en: { segments: { title: '…' }, sourceHash, by, at }, … }
 *   translationReview: { status: 'flagged', … }  (ERP가 번역하지 않기로 한 글)
 */

export type ContentKind = 'post' | 'comment' | 'listing'

export type Segments = Record<string, string>

export type StoredTranslation = {
  segments: Segments
  sourceHash: string
  by?: string
  at?: string
}

export type TranslationFields = {
  sourceLocale?: Locale
  translations?: Partial<Record<Locale, StoredTranslation>>
  translationReview?: { status: 'flagged'; reason?: string; sourceHash: string } | null
}

/** 원문 언어 기본값 */
export const DEFAULT_SOURCE_LOCALE: Locale = 'ko'

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const CPT_OPT_ENTRY_FIELDS = ['prepared', 'submitted', 'resultReceived', 'nextStep', 'stageReviewHtml']
const JOB_REVIEW_ENTRY_FIELDS = [
  'stageLabel',
  'platform',
  'documentsSubmitted',
  'interviewRound',
  'stageReviewHtml',
  'outcome',
]
const POST_FIELDS = ['title', 'contentHtml', 'location', 'detail', 'cptOptTips', 'jobReviewTips', 'jobReviewIndustry']

type Row = Record<string, unknown>

function addListSegments(out: Segments, prefix: string, list: unknown, fields: string[]) {
  for (const entry of Array.isArray(list) ? (list as Row[]) : []) {
    const id = text(entry?.id)
    if (!id) continue
    for (const field of fields) {
      const value = text(entry?.[field])
      if (value) out[`${prefix}.${id}.${field}`] = value
    }
  }
}

export function postSegments(post: object): Segments {
  const row = post as Row
  const out: Segments = {}
  for (const field of POST_FIELDS) {
    const value = text(row[field])
    if (value) out[field] = value
  }
  addListSegments(out, 'cptOptTimeline', row.cptOptTimeline, CPT_OPT_ENTRY_FIELDS)
  addListSegments(out, 'jobReviewTimeline', row.jobReviewTimeline, JOB_REVIEW_ENTRY_FIELDS)
  addListSegments(out, 'menuItems', row.menuItems, ['name', 'caption'])
  addListSegments(out, 'galleryPhotos', row.galleryPhotos, ['caption'])
  return out
}

export function commentSegments(comment: object): Segments {
  const body = text((comment as Row).body)
  return body ? { body } : {}
}

export function listingSegments(listing: object): Segments {
  const row = listing as Row
  const out: Segments = {}
  const description = text(row.description)
  if (description) out.description = description
  const waiting = row.roommateWaiting as Row | null | undefined
  addListSegments(out, 'roommateWaiting.profiles', waiting?.profiles, ['intro'])
  return out
}

const SEGMENTS_BY_KIND: Record<ContentKind, (object: object) => Segments> = {
  post: postSegments,
  comment: commentSegments,
  listing: listingSegments,
}

/** FNV-1a (32-bit) — ERP의 segmentsHash와 같은 결과 */
export function segmentsHash(segments: Segments): string {
  const source = JSON.stringify(
    Object.keys(segments)
      .sort()
      .map((key) => [key, segments[key]]),
  )
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** 저장된 JSON에서 번역 필드만 골라 정리한다 (normalize 단계에서 버려지지 않게). */
export function pickTranslationFields(raw: unknown): TranslationFields {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as Row
  const out: TranslationFields = {}
  if (isLocale(row.sourceLocale)) out.sourceLocale = row.sourceLocale
  if (row.translations && typeof row.translations === 'object') {
    const translations: Partial<Record<Locale, StoredTranslation>> = {}
    for (const [code, value] of Object.entries(row.translations as Row)) {
      const entry = value as Row | null
      if (!isLocale(code) || !entry || typeof entry.segments !== 'object' || !entry.segments) continue
      const segments: Segments = {}
      for (const [key, segment] of Object.entries(entry.segments as Row)) {
        if (typeof segment === 'string') segments[key] = segment
      }
      translations[code] = {
        segments,
        sourceHash: String(entry.sourceHash || ''),
        by: typeof entry.by === 'string' ? entry.by : undefined,
        at: typeof entry.at === 'string' ? entry.at : undefined,
      }
    }
    out.translations = translations
  }
  const review = row.translationReview as Row | null | undefined
  if (review?.status === 'flagged') {
    out.translationReview = {
      status: 'flagged',
      reason: typeof review.reason === 'string' ? review.reason : undefined,
      sourceHash: String(review.sourceHash || ''),
    }
  }
  return out
}

export function sourceLocaleOf(object: TranslationFields): Locale {
  return object.sourceLocale ?? DEFAULT_SOURCE_LOCALE
}

/**
 * 화면에 보여 줄 번역 상태
 * - original: 보는 언어가 원문 언어
 * - translated: 최신 번역이 있음
 * - pending: 번역이 없거나 원문이 바뀐 뒤라 아직 원문을 보여 줌
 */
export type DisplayState = 'original' | 'translated' | 'pending'

/** 화면에 내려 줄 번역 정보. `original`은 "원문 보기"용 (상세 화면에서만 채운다) */
export type ContentI18n = {
  sourceLocale: Locale
  displayLocale: Locale
  state: DisplayState
  original?: Segments
}

/** 같은 경로 문자열(`menuItems.<id>.name`)로 객체 안의 값을 바꾼 사본 */
function applySegments<T extends object>(object: T, kind: ContentKind, segments: Segments): T {
  const next = { ...(object as Row) }
  for (const [key, value] of Object.entries(segments)) {
    const parts = key.split('.')
    if (parts.length === 1) {
      if (typeof next[key] === 'string') next[key] = value
      continue
    }
    // `<list>.<id>.<field>` 또는 `roommateWaiting.profiles.<id>.intro`
    const field = parts[parts.length - 1]
    const id = parts[parts.length - 2]
    const listPath = parts.slice(0, -2)
    let container: Row = next
    for (let i = 0; i < listPath.length - 1; i += 1) {
      const child = container[listPath[i]]
      if (!child || typeof child !== 'object') break
      container[listPath[i]] = { ...(child as Row) }
      container = container[listPath[i]] as Row
    }
    const listKey = listPath[listPath.length - 1]
    const list = container[listKey]
    if (!Array.isArray(list)) continue
    container[listKey] = list.map((entry: Row) =>
      entry && entry.id === id && typeof entry[field] === 'string' ? { ...entry, [field]: value } : entry,
    )
  }
  if (kind === 'post' && segments.contentHtml) {
    // 목록 카드 요약은 번역된 본문에서 다시 만든다
    next.description = stripHtml(segments.contentHtml)
  }
  return next as T
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 보는 언어에 맞게 내용을 바꾼다. 번역이 없거나 낡았으면 원문 그대로 + state 'pending'.
 * includeOriginal: 상세 화면에서 "원문 보기"용 원문 segments를 같이 내려 준다.
 */
export function localizeContent<T extends TranslationFields & object>(
  object: T,
  kind: ContentKind,
  displayLocale: Locale,
  { includeOriginal = false }: { includeOriginal?: boolean } = {},
): T & { i18n: ContentI18n } {
  const sourceLocale = sourceLocaleOf(object)
  const base = stripTranslationFields(object)
  if (sourceLocale === displayLocale) {
    return { ...base, i18n: { sourceLocale, displayLocale, state: 'original' } } as T & { i18n: ContentI18n }
  }
  const source = SEGMENTS_BY_KIND[kind](object)
  const translation = object.translations?.[displayLocale]
  const fresh = Boolean(
    translation && Object.keys(source).length && translation.sourceHash === segmentsHash(source),
  )
  if (!fresh || !translation) {
    return { ...base, i18n: { sourceLocale, displayLocale, state: 'pending' } } as T & { i18n: ContentI18n }
  }
  const localized = applySegments(base, kind, translation.segments)
  return {
    ...localized,
    i18n: {
      sourceLocale,
      displayLocale,
      state: 'translated',
      ...(includeOriginal ? { original: source } : {}),
    },
  } as T & { i18n: ContentI18n }
}

/** 공개 응답에서는 모든 언어 번역을 통째로 보내지 않는다. */
function stripTranslationFields<T extends TranslationFields & object>(object: T): T {
  const { translations: _t, translationReview: _r, ...rest } = object
  void _t
  void _r
  return rest as T
}

/** 원문 segments를 다시 객체에 덮어 "원문 보기" 상태를 만든다 (클라이언트용) */
export function restoreOriginal<T extends object>(object: T, kind: ContentKind, original: Segments): T {
  return applySegments(object, kind, original)
}
