import type { SupabaseProfileRecord } from '@lib/supabase/profile.server'

/**
 * 서버 인스턴스 메모리 캐시 — Storage JSON을 매 요청마다 수십 개씩 내려받지 않도록 한다.
 * 이 서버에서 쓰면 바로 비우고, ERP 등 다른 곳에서 쓴 변경은 TTL이 지나면 반영된다.
 */

type Entry<T> = { at: number; value: Promise<T> }

export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>()

  constructor(
    private ttlMs: number,
    private maxEntries = 1000,
  ) {}

  /** 같은 키를 동시에 요청하면 한 번만 불러온다. 실패한 결과는 캐시하지 않는다. */
  get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key)
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value

    const value = load()
    this.entries.set(key, { at: Date.now(), value })
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key)
    })
    return value
  }

  /** 캐시된 값을 고쳐 둔다 (조회수처럼 자주 바뀌지만 목록을 다시 받을 필요는 없는 필드) */
  patch(key: string, update: (value: T) => T): void {
    const hit = this.entries.get(key)
    if (!hit) return
    this.entries.set(key, { at: hit.at, value: hit.value.then(update) })
  }

  delete(key: string): void {
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
  }
}

/** 커뮤니티 글 전체 목록 */
export const COMMUNITY_POSTS_TTL_MS = 60_000
/** 목록에 붙이는 작성자 프로필 (닉네임·사진) */
export const LIST_PROFILE_TTL_MS = 5 * 60_000
/** "합격 인증" badge on job reviews (approved offer verification of the post's author) */
export const OFFER_VERIFIED_TTL_MS = 60_000
/** 맛집 목록의 댓글·추천 수 */
export const POST_COUNTS_TTL_MS = 60_000

export const postCountsCache = new TtlCache<{ recommendCount: number; commentCount: number }>(
  POST_COUNTS_TTL_MS,
)

export function invalidatePostCounts(postId: string) {
  postCountsCache.delete(String(postId || '').trim())
}

export const listProfileCache = new TtlCache<SupabaseProfileRecord | null>(LIST_PROFILE_TTL_MS, 2000)

/** 프로필을 이 서버에서 저장하면 목록의 작성자 사진·닉네임이 바로 바뀐다 */
export function invalidateListProfile(uid: string) {
  listProfileCache.delete(String(uid || '').trim())
}
