import { BRAND, BRAND_CONFIG } from '@lib/brand'
import type { Locale } from '@lib/i18n/locales'
import { contentBrandOf, type ContentBrandFields } from '@lib/community/contentBrand'
import { isModerationHidden } from '@lib/community/moderation'
import { listStoredCommunityComments } from '@lib/supabase/communityComments.server'
import { postCommentsCache } from '@lib/supabase/listCache.server'
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

/**
 * Ellieo shows no Korean user content: only items whose original is in an Ellieo language (en/vi) or that have
 * a saved, up-to-date translation for the page language. Misaeng keeps its own rules (hiddenUntilTranslated).
 */
export const ELLIEO_ONLY_TRANSLATED = BRAND === 'ellieo'

/** Languages tried in order on an Ellieo page: en pages show en only, vi pages show vi and then en. */
function ellieoDisplayChain(locale: Locale): Locale[] {
  return locale === 'vi' ? ['vi', 'en'] : ['en']
}

/** Original written in a language this brand serves (an Ellieo user's own en/vi post or comment) */
function isServiceSource(item: object): boolean {
  return BRAND_CONFIG.serviceLocales.includes(sourceLocaleOf(item))
}

function localize<T extends object>(
  item: T,
  kind: ContentKind,
  locale: Locale,
  includeOriginal: boolean,
): WithI18n<T> {
  let localized = localizeContent(item as T & Record<string, unknown>, kind, locale, { includeOriginal }) as WithI18n<T>
  if (ELLIEO_ONLY_TRANSLATED && localized.i18n.state === 'pending') {
    for (const fallback of ellieoDisplayChain(locale).slice(1)) {
      const next = localizeContent(item as T & Record<string, unknown>, kind, fallback, {
        includeOriginal,
      }) as WithI18n<T>
      if (next.i18n.state !== 'pending') {
        localized = next
        break
      }
    }
  }
  if (ELLIEO_ONLY_TRANSLATED && localized.i18n.original && !isServiceSource(item)) {
    // No "view original" on Ellieo when the original is Korean
    const { original: _original, ...i18n } = localized.i18n
    void _original
    localized = { ...localized, i18n }
  }
  if ((item as { authorDeleted?: boolean }).authorDeleted !== true) return withoutKoreanNames(localized, locale)
  return { ...localized, authorNickname: deletedUserLabel(locale), authorPhotoURL: null }
}

/** Ellieo: a nickname written in Korean is shown as "Member" (names are never translated, but no Korean on Ellieo) */
const MEMBER_LABEL: Record<Locale, string> = { ko: '회원', en: 'Member', vi: 'Thành viên' }

function withoutKoreanNames<T extends object>(item: T, locale: Locale): T {
  if (!ELLIEO_ONLY_TRANSLATED) return item
  const row = item as Record<string, unknown>
  const label = MEMBER_LABEL[locale] ?? MEMBER_LABEL.en
  let next = item
  if (typeof row.authorNickname === 'string' && HANGUL.test(row.authorNickname)) {
    next = { ...next, authorNickname: label }
  }
  const guest = row.guestAuthor as { nickname?: unknown } | null | undefined
  if (guest && typeof guest.nickname === 'string' && HANGUL.test(guest.nickname)) {
    next = { ...next, guestAuthor: { ...guest, nickname: label } }
  }
  return next
}

/**
 * 목록에서 숨길 글인가
 * - misaeng: 한국어 화면에서 아직 한국어 번역이 없는 외국어 글
 * - ellieo: Misaeng content whose page language (or en on vi pages) has no version — no Korean content on Ellieo
 */
export function hiddenUntilTranslated(item: { i18n: ContentI18n } & ContentBrandFields): boolean {
  // Ellieo: posts/comments written on Ellieo (en/vi originals) always show; Misaeng ones need an en/vi version
  if (ELLIEO_ONLY_TRANSLATED) return item.i18n.state === 'pending' && contentBrandOf(item) !== 'ellieo'
  return BRAND === 'misaeng' && item.i18n.displayLocale === 'ko' && item.i18n.state === 'pending'
}

export function localizePosts<T extends CommunityPost>(
  posts: T[],
  locale: Locale,
  { hidePending = true }: { hidePending?: boolean } = {},
): WithI18n<T>[] {
  const out = posts.map((post) => localize(post, 'post', locale, false))
  if (ELLIEO_ONLY_TRANSLATED) {
    // "My posts" (hidePending: false) still lists the viewer's own en/vi posts written in the other language
    return out.filter(
      (post, index) => !hiddenUntilTranslated(post) || (!hidePending && isServiceSource(posts[index])),
    )
  }
  return hidePending ? out.filter((post) => !hiddenUntilTranslated(post)) : out
}

/**
 * 작성자 본인에게는 원문을 준다 (수정 화면이 같은 API로 글을 읽으므로 번역문이 원문을 덮지 않게).
 * On Ellieo only when the original is en/vi; a Korean original is treated like anyone else's post.
 * Returns null on Ellieo when the post has no en/vi version (the detail API answers 404).
 */
export function localizePost<T extends CommunityPost>(
  post: T,
  locale: Locale,
  { viewerUid }: { viewerUid?: string | null } = {},
): WithI18n<T> | null {
  const isAuthor = Boolean(viewerUid && post.authorUid === viewerUid)
  if (isAuthor && (!ELLIEO_ONLY_TRANSLATED || isServiceSource(post))) {
    return localize(post, 'post', sourceLocaleOf(post), false)
  }
  const localized = localize(post, 'post', locale, true)
  return ELLIEO_ONLY_TRANSLATED && hiddenUntilTranslated(localized) ? null : localized
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
  const out = comments.map((comment) =>
    viewerUid && comment.authorUid === viewerUid && (!ELLIEO_ONLY_TRANSLATED || isServiceSource(comment))
      ? localize(comment, 'comment', sourceLocaleOf(comment), false)
      : localize(comment, 'comment', locale, true),
  )
  return ELLIEO_ONLY_TRANSLATED ? keepEllieoComments(out) : out
}

/**
 * Ellieo: drop comments without an en/vi version. Deleted comments carry no text: keep them only as the
 * parent of a visible reply. Replies whose parent was dropped go too (no orphan replies).
 */
function keepEllieoComments<T extends CommunityComment & { i18n: ContentI18n }>(comments: T[]): T[] {
  const shown = (c: T) => c.status !== 'deleted' && !hiddenUntilTranslated(c)
  const visibleReplyParents = new Set(
    comments.filter((c) => c.parentId && shown(c)).map((c) => c.parentId as string),
  )
  const keptTop = new Set(
    comments
      .filter((c) => !c.parentId && (shown(c) || (c.status === 'deleted' && visibleReplyParents.has(c.id))))
      .map((c) => c.id),
  )
  return comments.filter((c) => (c.parentId ? keptTop.has(c.parentId) && shown(c) : keptTop.has(c.id)))
}

/** Ellieo: how many comments a viewer on this page language sees (list cards, post detail) */
export function countVisibleComments(comments: CommunityComment[], locale: Locale): number {
  return localizeComments(
    comments.filter((c) => c.status === 'open' && !isModerationHidden(c)),
    locale,
  ).filter((c) => c.status === 'open').length
}

/** Ellieo: replace stored comment counts (which include Korean comments) with what this page shows */
export async function withEllieoCommentCounts<T extends CommunityPost>(posts: T[], locale: Locale): Promise<T[]> {
  if (!ELLIEO_ONLY_TRANSLATED) return posts
  return Promise.all(
    posts.map(async (post) => {
      const comments = await postCommentsCache
        .get(post.id, () => listStoredCommunityComments(post.id))
        .catch(() => [] as CommunityComment[])
      return { ...post, commentCount: countVisibleComments(comments, locale) }
    }),
  )
}

const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/

/**
 * Ellieo: listings are not translated any more (ERP, 2026-11-05) and are shown as data (price, rooms,
 * photos). Free text without an en/vi version is dropped when it is Korean.
 */
function withoutKoreanListingText<T extends HousingListing>(listing: WithI18n<T>): WithI18n<T> {
  if (!ELLIEO_ONLY_TRANSLATED || listing.i18n.state !== 'pending') return listing
  const waiting = listing.roommateWaiting
  return {
    ...listing,
    // Shown as written (no "translation pending" note): what is left is not Korean
    i18n: { ...listing.i18n, state: 'original' },
    description: HANGUL.test(listing.description || '') ? '' : listing.description,
    roommateWaiting: waiting
      ? {
          ...waiting,
          profiles: (waiting.profiles || []).map((profile) =>
            HANGUL.test(profile.intro || '') ? { ...profile, intro: '' } : profile,
          ),
        }
      : waiting,
  }
}

export function localizeListings<T extends HousingListing>(listings: T[], locale: Locale): WithI18n<T>[] {
  return listings.map((listing) => withoutKoreanListingText(localize(listing, 'listing', locale, false)))
}

export function localizeListing<T extends HousingListing>(listing: T, locale: Locale): WithI18n<T> {
  return withoutKoreanListingText(localize(listing, 'listing', locale, true))
}

export { sourceLocaleOf }
