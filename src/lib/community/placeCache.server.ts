/**
 * Google Places 결과 캐시 (같은 장소·검색어에 다시 돈을 내지 않게).
 * 1차: 서버 인스턴스 메모리 (빠름, 인스턴스가 바뀌면 사라짐)
 * 2차: Supabase place_cache 테이블 (supabase/usage_daily.sql) — 테이블이 없으면 조용히 건너뛴다
 */

type Entry = { payload: unknown; at: number }

const MEMORY_LIMIT = 500
const memory = new Map<string, Entry>()

function remember(key: string, payload: unknown, at = Date.now()) {
  if (memory.size >= MEMORY_LIMIT) {
    const oldest = memory.keys().next().value
    if (oldest !== undefined) memory.delete(oldest)
  }
  memory.set(key, { payload, at })
}

function rest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return {
    url: `${url}/rest/v1/place_cache`,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  }
}

/** maxAgeMs 안의 캐시만 돌려준다 */
export async function readPlaceCache<T>(key: string, maxAgeMs: number): Promise<T | null> {
  const now = Date.now()
  const hit = memory.get(key)
  if (hit && now - hit.at < maxAgeMs) return hit.payload as T

  const api = rest()
  if (!api) return null
  try {
    const res = await fetch(
      `${api.url}?cache_key=eq.${encodeURIComponent(key)}&select=payload,fetched_at&limit=1`,
      { headers: api.headers, cache: 'no-store', signal: AbortSignal.timeout(2500) },
    )
    if (!res.ok) return null
    const rows = (await res.json().catch(() => null)) as Array<{ payload: T; fetched_at: string }> | null
    const row = rows?.[0]
    if (!row) return null
    const at = Date.parse(row.fetched_at)
    if (!Number.isFinite(at) || now - at >= maxAgeMs) return null
    remember(key, row.payload, at)
    return row.payload
  } catch {
    return null
  }
}

export function writePlaceCache(key: string, payload: unknown): void {
  remember(key, payload)
  const api = rest()
  if (!api) return
  void fetch(`${api.url}?on_conflict=cache_key`, {
    method: 'POST',
    headers: { ...api.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ cache_key: key, payload, fetched_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(2500),
  }).catch(() => {})
}

/** 검색어 캐시 키: 대소문자·공백 차이를 같은 검색으로 본다 */
export function queryCacheKey(kind: string, query: string): string {
  return `${kind}:${query.trim().toLowerCase().replace(/\s+/g, ' ')}`
}
