import { isAnonymousBoard } from '@lib/constants/nyc'
import type { CommunityComment, CommunityPost } from '@/types/nyc'

function isViewerAuthor(
  authorUid: string | undefined,
  viewerUid?: string | null,
): boolean {
  return Boolean(viewerUid && authorUid && viewerUid === authorUid)
}

/** 익명 표시명 — 첫 글자만 보이고 나머지는 ** (예: 익명 → 익**) */
export function maskAnonymousDisplayName(name?: string | null): string {
  const base = name?.trim() || '익명'
  const first = Array.from(base)[0]
  if (!first) return '**'
  return `${first}**`
}

/** 익명 게시판 글 — 타인에게는 작성자 식별 정보를 숨김 */
export function sanitizeAnonymousCommunityPost(
  post: CommunityPost,
  viewerUid?: string | null,
): CommunityPost {
  if (!isAnonymousBoard(post.categoryId)) return post

  const isAuthor = isViewerAuthor(post.authorUid, viewerUid)

  return {
    ...post,
    authorNickname: null,
    authorPhotoURL: null,
    authorSchoolId: null,
    authorSchoolName: null,
    authorEmail: isAuthor ? post.authorEmail : '',
    authorUid: isAuthor ? post.authorUid : '',
  }
}

/** 익명 게시판 댓글 — 표시명·프로필을 숨김 */
export function sanitizeAnonymousCommunityComment(
  comment: CommunityComment,
  viewerUid?: string | null,
): CommunityComment {
  const isAuthor = isViewerAuthor(comment.authorUid, viewerUid)

  return {
    ...comment,
    authorNickname: null,
    authorPhotoURL: null,
    authorSchoolId: null,
    authorEmail: isAuthor ? comment.authorEmail : '',
    authorUid: isAuthor ? comment.authorUid : '',
  }
}
