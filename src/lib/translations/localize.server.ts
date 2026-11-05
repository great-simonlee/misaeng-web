import { BRAND } from '@lib/brand'
import type { Locale } from '@lib/i18n/locales'
import type { CommunityComment, CommunityPost, HousingListing } from '@/types/nyc'

import { localizeContent, sourceLocaleOf, type ContentI18n, type ContentKind } from './content'

/**
 * API 응답 직전에 보는 언어로 바꾼다. 저장된 전체 번역(translations)은 응답에서 빠진다.
 *
 * 규칙
 * - 최신 번역이 있으면 번역문, 없으면 원문 + state 'pending' ("번역 준비 중")
 * - misaeng 한국어 화면에서는 아직 한국어 번역이 없는 외국어 글을 목록에서 뺀다 (한국어 중심 사이트)
 * - 상세(includeOriginal)에서는 "원문 보기"용 원문을 같이 내려 준다
 */

type WithI18n<T> = T & { i18n: ContentI18n }

/** 접근 권한 등으로 비운 필드의 원문은 내려 보내지 않는다 (잠긴 후기 본문 등) */
function pruneOriginal<T extends object>(item: WithI18n<T>): WithI18n<T> {
  const original = item.i18n.original
  if (!original) return item
  const row = item as Record<string, unknown>
  const kept = Object.fromEntries(
    Object.entries(original).filter(([key]) => {
      const value = row[key.split('.')[0]]
      if (Array.isArray(value)) return value.length > 0
      if (value && typeof value === 'object') return true
      return typeof value === 'string' && value.trim().length > 0
    }),
  )
  return { ...item, i18n: { ...item.i18n, original: kept } }
}

/** Author name of a deleted account, in the viewer's language (same text as api `account.deletedUser`). */
const DELETED_USER_LABEL: Record<Locale, string> = {
  ko: '탈퇴한 회원',
  en: 'Deleted user',
  vi: 'Người dùng đã xóa tài khoản',
}

export function deletedUserLabel(locale: Locale) {
  return DELETED_USER_LABEL[locale] ?? DELETED_USER_LABEL.en
}

function localize<T extends object>(
  item: T,
  kind: ContentKind,
  locale: Locale,
  includeOriginal: boolean,
): WithI18n<T> {
  const localized = localizeContent(item as T & Record<string, unknown>, kind, locale, { includeOriginal }) as WithI18n<T>
  if ((item as { authorDeleted?: boolean }).authorDeleted !== true) return localized
  return { ...localized, authorNickname: deletedUserLabel(locale), authorPhotoURL: null }
}

/** misaeng 한국어 목록에서 숨길 글인가 */
export function hiddenUntilTranslated(item: { i18n: ContentI18n }): boolean {
  return BRAND === 'misaeng' && item.i18n.displayLocale === 'ko' && item.i18n.state === 'pending'
}

export function localizePosts<T extends CommunityPost>(
  posts: T[],
  locale: Locale,
  { hidePending = true }: { hidePending?: boolean } = {},
): WithI18n<T>[] {
  const out = posts.map((post) => localize(post, 'post', locale, false))
  return hidePending ? out.filter((post) => !hiddenUntilTranslated(post)) : out
}

/** 작성자 본인에게는 원문을 준다 (수정 화면이 같은 API로 글을 읽으므로 번역문이 원문을 덮지 않게) */
export function localizePost<T extends CommunityPost>(
  post: T,
  locale: Locale,
  { viewerUid }: { viewerUid?: string | null } = {},
): WithI18n<T> {
  if (viewerUid && post.authorUid === viewerUid) return localize(post, 'post', sourceLocaleOf(post), false)
  return localize(post, 'post', locale, true)
}

/** 접근 제어(applyReviewBodyAccess 등)를 마친 뒤 마지막에 부른다 */
export function finalizePost<T extends object>(post: T): T {
  const item = post as WithI18n<T>
  return item.i18n ? (pruneOriginal(item) as T) : post
}

/**
 * 댓글은 글마다 원문 보기 토글이 있어서 원문을 같이 내려 준다 (짧다). 숨기지 않는다.
 * 내가 쓴 댓글은 수정할 수 있어야 하므로 번역하지 않고 원문 그대로 둔다.
 */
export function localizeComments<T extends CommunityComment>(
  comments: T[],
  locale: Locale,
  { viewerUid }: { viewerUid?: string | null } = {},
): WithI18n<T>[] {
  return comments.map((comment) =>
    viewerUid && comment.authorUid === viewerUid
      ? localize(comment, 'comment', sourceLocaleOf(comment), false)
      : localize(comment, 'comment', locale, true),
  )
}

export function localizeListings<T extends HousingListing>(listings: T[], locale: Locale): WithI18n<T>[] {
  return listings.map((listing) => localize(listing, 'listing', locale, false))
}

export function localizeListing<T extends HousingListing>(listing: T, locale: Locale): WithI18n<T> {
  return localize(listing, 'listing', locale, true)
}

export { sourceLocaleOf }
