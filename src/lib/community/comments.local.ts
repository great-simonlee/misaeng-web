import type { CommunityComment } from '@/types/nyc'

const STORAGE_KEY = 'misaeng.nyc.communityComments.v1'

function readAll(): CommunityComment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCommentLike)
  } catch {
    return []
  }
}

function writeAll(comments: CommunityComment[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments))
}

function isCommentLike(value: unknown): value is CommunityComment {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.postId === 'string' &&
    typeof item.body === 'string' &&
    typeof item.authorUid === 'string'
  )
}

export function listLocalCommunityComments(
  postId: string,
): CommunityComment[] {
  return readAll()
    .filter((item) => item.postId === postId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function upsertLocalCommunityComment(comment: CommunityComment) {
  const all = readAll()
  const index = all.findIndex((item) => item.id === comment.id)
  if (index >= 0) all[index] = comment
  else all.push(comment)
  writeAll(all)
  return comment
}

/** 로컬 댓글 소프트 삭제 (대댓글 포함) */
export function markLocalCommunityCommentDeleted(
  postId: string,
  commentId: string,
): CommunityComment | null {
  const all = readAll()
  const now = Date.now()
  let found: CommunityComment | null = null
  const next = all.map((item) => {
    if (item.postId !== postId) return item
    const shouldDelete =
      item.id === commentId ||
      (item.parentId === commentId && item.status === 'open')
    if (!shouldDelete) return item
    const updated = {
      ...item,
      status: 'deleted' as const,
      updatedAt: now,
    }
    if (item.id === commentId) found = updated
    return updated
  })
  if (!found) {
    // 원격/목 댓글도 로컬에 삭제 마킹해 목록에서 숨김
    found = {
      id: commentId,
      postId,
      parentId: null,
      body: '',
      authorUid: '',
      authorEmail: '',
      authorNickname: null,
      authorPhotoURL: null,
      authorSchoolId: null,
      createdAt: now,
      updatedAt: now,
      status: 'deleted',
    }
    next.push(found)
  }
  writeAll(next)
  return found
}

export function mergeCommunityComments(
  primary: CommunityComment[],
  secondary: CommunityComment[],
): CommunityComment[] {
  const map = new Map<string, CommunityComment>()
  for (const item of [...primary, ...secondary]) {
    const prev = map.get(item.id)
    if (!prev || item.updatedAt >= prev.updatedAt) {
      map.set(item.id, item)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt)
}
