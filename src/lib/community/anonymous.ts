import { sanitizeGuestAuthorForViewer } from '@lib/community/guest'
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

/**
 * 공개 응답용 글 정리.
 * - 게스트 글: 이메일·LinkedIn 등 비공개 연락처 제거
 * - 익명 게시판: 타인에게는 작성자 식별 정보를 숨김
 */
export function sanitizeAnonymousCommunityPost(
  post: CommunityPost,
  viewerUid?: string | null,
): CommunityPost {
  const base = sanitizeGuestAuthorForViewer(post, viewerUid)
  if (!isAnonymousBoard(base.categoryId)) return base

  const isAuthor = isViewerAuthor(base.authorUid, viewerUid)

  return {
    ...base,
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
