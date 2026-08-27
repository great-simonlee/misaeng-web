/** 개인 찜(좋아요) — 브라우저 localStorage */

export type PostLikeKind = 'housing' | 'community'

export type PostLikeEntry = {
  kind: PostLikeKind
  id: string
  /** community일 때 보드 (food, status 등) */
  boardId?: string
}

const STORAGE_KEY = 'misaeng.nyc.postLikes.v1'
const LEGACY_HOUSING_KEY = 'misaeng.nyc.housingLikes'
const CHANGE_EVENT = 'misaeng:post-likes-changed'

function likeKey(entry: Pick<PostLikeEntry, 'kind' | 'id'>): string {
  return `${entry.kind}:${entry.id}`
}

function normalizeEntry(raw: unknown): PostLikeEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const kind = item.kind
  const id = String(item.id || '').trim()
  if ((kind !== 'housing' && kind !== 'community') || !id) return null
  const boardId =
    typeof item.boardId === 'string' && item.boardId.trim()
      ? item.boardId.trim()
      : undefined
  return kind === 'community'
    ? { kind, id, boardId }
    : { kind, id }
}

function migrateLegacyHousingLikes(): PostLikeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LEGACY_HOUSING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(String)
      .filter(Boolean)
      .map((id) => ({ kind: 'housing' as const, id }))
  } catch {
    return []
  }
}

function readEntries(): PostLikeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        const entries = parsed
          .map(normalizeEntry)
          .filter((item): item is PostLikeEntry => item != null)
        // 중복 제거 (앞쪽 = 최근)
        const seen = new Set<string>()
        return entries.filter((entry) => {
          const key = likeKey(entry)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }
    }

    const legacy = migrateLegacyHousingLikes()
    if (legacy.length > 0) {
      writeEntries(legacy)
      return legacy
    }
    return []
  } catch {
    return []
  }
}

function writeEntries(entries: PostLikeEntry[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getLikedEntries(): PostLikeEntry[] {
  return readEntries()
}

export function isPostLiked(target: Pick<PostLikeEntry, 'kind' | 'id'>): boolean {
  const key = likeKey(target)
  return readEntries().some((entry) => likeKey(entry) === key)
}

/** @returns 좋아요 후 상태 */
export function togglePostLike(entry: PostLikeEntry): boolean {
  const entries = readEntries()
  const key = likeKey(entry)
  const index = entries.findIndex((item) => likeKey(item) === key)
  if (index >= 0) {
    entries.splice(index, 1)
    writeEntries(entries)
    return false
  }
  entries.unshift(
    entry.kind === 'community'
      ? { kind: 'community', id: entry.id, boardId: entry.boardId }
      : { kind: 'housing', id: entry.id },
  )
  writeEntries(entries)
  return true
}

export function subscribePostLikes(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange()
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
