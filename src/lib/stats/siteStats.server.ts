import { authRest, enc } from '@lib/auth/store.server'
import { isStatusCommunityBoard } from '@lib/constants/nyc'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import { listAllOpenCommunityPosts } from '@lib/supabase/community.server'
import { listStoredHousingListings } from '@lib/supabase/housing.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { listProfileCache, TtlCache } from '@lib/supabase/listCache.server'

/**
 * 앱 홈 배너 숫자 (GET /api/stats). 모든 도시 합계, 개인 정보 없음.
 * 회원 수는 여러 곳을 읽어야 해서 10분 동안 메모리에 둔다 (라우트는 CDN 캐시 헤더도 보낸다).
 */

export type SiteStats = {
  members: number
  posts: {
    housing: number
    food: number
    roommate: number
    visa: number
    jobReview: number
    anonymous: number
  }
  updatedAt: number
}

export const SITE_STATS_TTL_MS = 10 * 60_000

const statsCache = new TtlCache<SiteStats>(SITE_STATS_TTL_MS, 1)
const PAGE = 1000
const PROFILE_READ_CONCURRENCY = 8

export function getSiteStats(): Promise<SiteStats> {
  return statsCache.get('all', loadSiteStats)
}

async function loadSiteStats(): Promise<SiteStats> {
  const [members, communityPosts, housing] = await Promise.all([
    countMembers(),
    listAllOpenCommunityPosts(),
    listStoredHousingListings(),
  ])

  const posts = { housing: housing.length, food: 0, roommate: 0, visa: 0, jobReview: 0, anonymous: 0 }
  // 팀이 대신 올린 후기의 작성자 (계정 없음, 글마다 다른 사람) — 회원 수에 한 명씩 더한다
  let proxyAuthors = 0
  for (const post of communityPosts) {
    if (post.proxyAuthor) proxyAuthors += 1
    const board = post.categoryId
    if (board === 'food') posts.food += 1
    else if (board === 'roommate') posts.roommate += 1
    else if (board === 'job-review') posts.jobReview += 1
    else if (board === 'anonymous') posts.anonymous += 1
    // 비자·OPT·영주권 통합 게시판 (status + 레거시 cpt-opt / visa / green-card)
    else if (isStatusCommunityBoard(board)) posts.visa += 1
  }

  return { members: members + proxyAuthors, posts, updatedAt: Date.now() }
}

/**
 * 가입 회원 수 (탈퇴 제외). 회원은 세 곳에 흩어져 있어 uid 기준으로 합친다:
 *  - auth_accounts: Misaeng 자체 로그인(Supabase Auth)에 연결된 계정. 탈퇴하면 행이 지워진다(cascade).
 *  - legacy_users: Ellieo 시절 회원 (아직 새 로그인으로 옮기지 않았을 수 있다)
 *  - avatars/<uid>/profile.json 폴더: 프로필을 저장한 회원. 탈퇴해도 tombstone(status 'deleted')이 남는다.
 * auth_accounts에 있는 uid는 살아 있는 계정이라 프로필을 읽지 않는다. 나머지만 프로필로 탈퇴 여부를 확인한다
 * (프로필 5분 캐시 공유, 읽기 실패는 탈퇴 아님으로 본다 — isAccountDeleted와 같은 기준).
 */
async function countMembers(): Promise<number> {
  const [linkedUids, legacyUids, profileUids] = await Promise.all([
    listTableUids('auth_accounts'),
    listTableUids('legacy_users'),
    listProfileFolderUids(),
  ])

  const linked = new Set(linkedUids)
  const unlinked = [...new Set([...legacyUids, ...profileUids])].filter((uid) => !linked.has(uid))

  let deleted = 0
  let index = 0
  await Promise.all(
    Array.from({ length: Math.min(PROFILE_READ_CONCURRENCY, unlinked.length) }, async () => {
      while (index < unlinked.length) {
        const uid = unlinked[index++]
        const profile = await listProfileCache
          .get(uid, () => getSupabaseProfile(uid))
          .catch(() => null)
        if (profile?.status === 'deleted') deleted += 1
      }
    }),
  )

  return linked.size + unlinked.length - deleted
}

/** uid 열만 1000개씩 (테이블이 없으면 오류 — 통계 전체가 500으로 끝나고 캐시되지 않는다) */
async function listTableUids(table: 'auth_accounts' | 'legacy_users'): Promise<string[]> {
  const uids: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const rows = await authRest<{ uid: string }[]>(
      `${enc(table)}?select=uid&order=uid.asc&limit=${PAGE}&offset=${offset}`,
    )
    for (const row of rows) if (row?.uid) uids.push(String(row.uid))
    if (rows.length < PAGE) return uids
  }
}

/** avatars 버킷 최상위 폴더 = 프로필이 있는 uid (community-* 같은 공용 폴더는 뺀다) */
async function listProfileFolderUids(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) throw new Error('Supabase is not configured.')
  const bucket = getSupabaseAvatarBucket()

  const uids: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Profile folder list failed (${res.status})`)
    const page = (await res.json().catch(() => null)) as Array<{ id?: string | null; name?: string }> | null
    if (!Array.isArray(page)) throw new Error('Profile folder list failed')
    for (const item of page) {
      const name = String(item?.name || '').trim()
      // 폴더는 id가 null
      if (item?.id == null && name && !name.startsWith('community')) uids.push(name)
    }
    if (page.length < PAGE) return uids
  }
}
