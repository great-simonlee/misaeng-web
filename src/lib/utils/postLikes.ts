/**
 * 개인 찜(좋아요) — 브라우저 localStorage
 *
 * Signed in: localStorage is a cache of the account's saves (/api/me/saves). On the first signed-in load of a uid the
 * device's saves are merged into the account once, then the server list replaces the cache; each toggle is sent to
 * the server too (reverted locally if the server refuses). Signed out: device only, as before.
 */

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
/** uids whose device saves were already merged into the account */
const MERGED_KEY = 'misaeng.nyc.postLikes.mergedUids.v1'
const SAVES_API = '/api/me/saves'

/** Signed-in uid the cache belongs to (set by syncPostLikesWithAccount) */
let accountUid: string | null = null

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
    const [removed] = entries.splice(index, 1)
    writeEntries(entries)
    void pushToggle(removed ?? entry, false)
    return false
  }
  entries.unshift(
    entry.kind === 'community'
      ? { kind: 'community', id: entry.id, boardId: entry.boardId }
      : { kind: 'housing', id: entry.id },
  )
  writeEntries(entries)
  void pushToggle(entry, true)
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

// MARK: account sync

type ServerSave = { kind: PostLikeKind; targetId: string; board: string | null }

function readMergedUids(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MERGED_KEY) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function toServerItem(entry: PostLikeEntry) {
  return { kind: entry.kind, targetId: entry.id, board: entry.kind === 'community' ? (entry.boardId ?? null) : null }
}

/** Sends one toggle to the account; puts the local state back if the server refuses it. */
async function pushToggle(entry: PostLikeEntry, saved: boolean) {
  const uid = accountUid
  if (!uid) return
  try {
    const res = saved
      ? await fetch(SAVES_API, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(toServerItem(entry)),
        })
      : await fetch(
          `${SAVES_API}?kind=${encodeURIComponent(entry.kind)}&targetId=${encodeURIComponent(entry.id)}`,
          { method: 'DELETE', credentials: 'include' },
        )
    if (res.ok || accountUid !== uid) return
  } catch {
    // Offline: keep the local change; the next sync replaces the cache with the server list.
    return
  }
  // Refused (e.g. signed out meanwhile): undo the local toggle
  const entries = readEntries()
  const key = likeKey(entry)
  const index = entries.findIndex((item) => likeKey(item) === key)
  if (saved && index >= 0) entries.splice(index, 1)
  else if (!saved && index < 0) entries.unshift(entry)
  else return
  writeEntries(entries)
}

/**
 * Called by AuthProvider whenever the signed-in uid changes (null = signed out).
 * Signing out clears the cache (the saves live on the account), so the next account doesn't inherit them.
 */
export async function syncPostLikesWithAccount(uid: string | null): Promise<void> {
  if (typeof window === 'undefined') return
  if (!uid) {
    if (accountUid) {
      accountUid = null
      writeEntries([])
    }
    return
  }
  accountUid = uid
  try {
    const merged = readMergedUids()
    if (!merged.includes(uid)) {
      const local = readEntries().slice(0, 500)
      let done = local.length === 0
      if (!done) {
        const res = await fetch(`${SAVES_API}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          // Newest first locally: give older entries older times so the server keeps the order
          body: JSON.stringify({
            items: local.map((entry, index) => ({ ...toServerItem(entry), savedAt: Date.now() - index * 1000 })),
          }),
        })
        const data = (await res.json().catch(() => null)) as { stored?: boolean } | null
        done = res.ok && data?.stored !== false
      }
      if (!done) return
      window.localStorage.setItem(MERGED_KEY, JSON.stringify([...merged, uid].slice(-20)))
    }

    const res = await fetch(SAVES_API, { credentials: 'include', cache: 'no-store' })
    if (!res.ok || accountUid !== uid) return
    const data = (await res.json().catch(() => null)) as { items?: ServerSave[]; stored?: boolean } | null
    if (!data || data.stored === false || !Array.isArray(data.items)) return
    const entries = data.items
      .map((item) => normalizeEntry({ kind: item.kind, id: item.targetId, boardId: item.board ?? undefined }))
      .filter((item): item is PostLikeEntry => item != null)
    writeEntries(entries)
  } catch {
    // Offline / server error: keep the cache as it is
  }
}
