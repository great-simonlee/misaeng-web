import { listProfileCache } from '@lib/supabase/listCache.server'
import {
  getSupabaseProfile,
  type BlockedUserEntry,
  type SupabaseProfileRecord,
} from '@lib/supabase/profile.server'

/**
 * 사용자 차단 — 차단한 사람의 프로필 JSON(blockedUsers)에 저장한다.
 * 목록·상세·댓글 응답에서 보는 사람 기준으로 거른다. 공유 캐시(목록 캐시)에는 넣지 않고 캐시를 꺼낸 뒤에 거를 것.
 * 차단한 사용자의 uid는 서버에서만 쓰고 응답에는 절대 내보내지 않는다 (익명 작성자 보호).
 */

export const MAX_BLOCKED_USERS = 500

/** 상세 응답: 보는 사람이 작성자를 차단했음 */
export const BLOCKED_USER_CODE = 'BLOCKED_USER'

export type PublicBlockedUser = Omit<BlockedUserEntry, 'uid'>

export function readBlockedUsers(
  profile: SupabaseProfileRecord | null | undefined,
): BlockedUserEntry[] {
  const list = profile?.blockedUsers
  if (!Array.isArray(list)) return []
  return list.filter(
    (item): item is BlockedUserEntry =>
      Boolean(item && typeof item.id === 'string' && typeof item.uid === 'string' && item.uid),
  )
}

export function toPublicBlockedUser(entry: BlockedUserEntry): PublicBlockedUser {
  return {
    id: entry.id,
    label: entry.anonymous ? null : entry.label?.trim() || null,
    anonymous: Boolean(entry.anonymous),
    createdAt: Number(entry.createdAt) || 0,
  }
}

/** 보는 사람이 차단한 uid 목록 (로그인 안 했으면 빈 집합). 프로필은 listProfileCache로 요청마다 한 번만 읽는다 */
export async function getViewerBlockedUids(
  viewerUid: string | null | undefined,
): Promise<Set<string>> {
  const uid = String(viewerUid || '').trim()
  if (!uid) return new Set()
  try {
    const profile = await listProfileCache.get(uid, () => getSupabaseProfile(uid))
    return new Set(readBlockedUsers(profile).map((item) => item.uid))
  } catch {
    return new Set()
  }
}

/** 차단한 작성자의 글·댓글을 뺀다. 익명 정리(sanitize) 전에 불러야 한다 (정리 후에는 authorUid가 비어 있음) */
export function withoutBlockedAuthors<T extends { authorUid?: string | null }>(
  items: T[],
  blocked: Set<string>,
): T[] {
  if (blocked.size === 0) return items
  return items.filter((item) => !item.authorUid || !blocked.has(item.authorUid))
}
