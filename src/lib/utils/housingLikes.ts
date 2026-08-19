const STORAGE_KEY = 'misaeng.nyc.housingLikes'
const CHANGE_EVENT = 'misaeng:housing-likes-changed'

function readIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(String).filter(Boolean)
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getLikedHousingIds(): string[] {
  return readIds()
}

export function isHousingLiked(postId: string): boolean {
  return readIds().includes(postId)
}

/** @returns 좋아요 후 상태 */
export function toggleHousingLike(postId: string): boolean {
  const ids = readIds()
  const index = ids.indexOf(postId)
  if (index >= 0) {
    ids.splice(index, 1)
    writeIds(ids)
    return false
  }
  ids.unshift(postId)
  writeIds(ids)
  return true
}

export function subscribeHousingLikes(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange()
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
