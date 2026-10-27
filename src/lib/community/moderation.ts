import type { CommunityComment, ContentModeration } from '@/types/nyc'

/**
 * Hidden posts/comments (reports or ERP) and per-viewer "I reported this" hiding.
 * Stored on the post/comment JSON as `moderation` (the ERP widget restores it with hidden: false).
 */

/** Distinct reporters (excluding dismissed reports) that hide a post or comment for everyone. */
export const AUTO_HIDE_REPORTERS = 3

/** Detail response for a hidden or reported post */
export const CONTENT_HIDDEN_CODE = 'CONTENT_HIDDEN'

export function normalizeModeration(raw: unknown): ContentModeration | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const at = Number(data.at)
  return {
    hidden: data.hidden === true,
    reason: data.reason === 'admin' ? 'admin' : 'reports',
    at: Number.isFinite(at) && at > 0 ? at : 0,
    reportCount: Number.isFinite(Number(data.reportCount)) ? Number(data.reportCount) : null,
    restoredAt: Number(data.restoredAt) || null,
    restoredBy: typeof data.restoredBy === 'string' ? data.restoredBy : null,
  }
}

export function isModerationHidden(item: { moderation?: ContentModeration | null } | null | undefined): boolean {
  return item?.moderation?.hidden === true
}

/** `post:<id>` / `comment:<id>` keys of what a viewer reported */
export function reportKey(targetType: 'post' | 'comment', targetId: string) {
  return `${targetType}:${targetId}`
}

/** Posts the viewer may see in lists: not hidden, not reported by the viewer. */
export function withoutModeratedPosts<T extends { id: string; moderation?: ContentModeration | null }>(
  posts: T[],
  reported: Set<string>,
): T[] {
  return posts.filter((post) => !isModerationHidden(post) && !reported.has(reportKey('post', post.id)))
}

/**
 * Comments for one viewer. A hidden (or viewer-reported) comment with visible replies stays as a "deleted" placeholder
 * without body or author, so the other people's replies keep their thread; without replies it is dropped.
 * `canSeeHidden` (the team) gets everything unchanged. The viewer's own hidden comments stay visible to them.
 */
export function moderateComments<T extends CommunityComment>(
  comments: T[],
  options: { reported: Set<string>; viewerUid?: string | null; canSeeHidden?: boolean },
): T[] {
  if (options.canSeeHidden) return comments
  const hide = (item: T) =>
    (isModerationHidden(item) && !(options.viewerUid && item.authorUid === options.viewerUid)) ||
    options.reported.has(reportKey('comment', item.id))
  const hiddenIds = new Set(comments.filter(hide).map((item) => item.id))
  if (hiddenIds.size === 0) return comments
  const out: T[] = []
  for (const item of comments) {
    if (!hiddenIds.has(item.id)) {
      out.push(item)
      continue
    }
    const hasVisibleReplies = comments.some(
      (reply) => reply.parentId === item.id && reply.status === 'open' && !hiddenIds.has(reply.id),
    )
    if (!hasVisibleReplies) continue
    out.push({
      ...item,
      body: '',
      status: 'deleted',
      authorUid: '',
      authorEmail: '',
      authorNickname: null,
      authorPhotoURL: null,
      authorSchoolId: null,
      authorWorkplaceVerified: false,
      authorInstagramVerified: false,
      translations: undefined,
      moderation: null,
    })
  }
  return out
}
