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
