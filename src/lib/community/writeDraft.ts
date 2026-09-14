import type { CityId } from '@lib/constants/cities'
import type { NycCommunityBoardId } from '@lib/constants/nyc'

const STORAGE_PREFIX = 'misaeng.writeDraft.v1'

export type WriteDraftRecord<T> = {
  savedAt: number
  data: T
}

function draftKey(
  boardId: NycCommunityBoardId,
  city: CityId,
  uid: string,
) {
  return `${STORAGE_PREFIX}.${boardId}.${city}.${uid}`
}

export function loadWriteDraft<T>(
  boardId: NycCommunityBoardId,
  city: CityId,
  uid: string,
): WriteDraftRecord<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(draftKey(boardId, city, uid))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WriteDraftRecord<T>
    if (!parsed || typeof parsed.savedAt !== 'number' || parsed.data == null) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveWriteDraft<T>(
  boardId: NycCommunityBoardId,
  city: CityId,
  uid: string,
  data: T,
): number {
  const savedAt = Date.now()
  window.localStorage.setItem(
    draftKey(boardId, city, uid),
    JSON.stringify({ savedAt, data } satisfies WriteDraftRecord<T>),
  )
  return savedAt
}

export function clearWriteDraft(
  boardId: NycCommunityBoardId,
  city: CityId,
  uid: string,
) {
  try {
    window.localStorage.removeItem(draftKey(boardId, city, uid))
  } catch {
    /* ignore */
  }
}
