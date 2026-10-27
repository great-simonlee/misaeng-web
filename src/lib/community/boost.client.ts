/**
 * 룸메이트·서블렛 글 "상단에 올리기" (포인트) — GET/POST /api/community/{id}/boost
 * 서버 규칙·문구: src/lib/points/boost.server.ts. 에러 문구는 서버가 이미 번역해서 준다.
 */

export type RoommateBoostBlock =
  | 'active'
  | 'cooldown'
  | 'monthly_cap'
  | 'slots_full'
  | 'insufficient'
  | 'disabled'
  | null

export type RoommateBoostStatus =
  | { engine: 'legacy'; active: false; block: 'disabled' }
  | {
      engine: 'ledger'
      boostable: boolean
      mine: boolean
      cost: number
      days: number
      /** 노출이 끝난 뒤 같은 글을 다시 올릴 수 있기까지의 일수 */
      cooldownDays: number
      boostedUntil: string | null
      active: boolean
      block: RoommateBoostBlock
      /** cooldown → 같은 글을 다시 올릴 수 있는 시각, slots_full → 첫 자리가 비는 시각 */
      availableAt: string | null
      monthlyCap: number | null
      monthlyUsed: number
      slotsTotal: number | null
      slotsUsed: number
      /** 내 사용 가능 포인트 (작성자 본인일 때만) */
      available: number | null
    }

export type RoommateBoostResult = {
  boostedUntil: string
  charged: number
  balance: number
  available: number
}

/** 서버가 준 문구 + 코드 (BOOST_COOLDOWN 등) */
export class RoommateBoostError extends Error {
  readonly code: string | null

  constructor(message: string, code: string | null) {
    super(message)
    this.name = 'RoommateBoostError'
    this.code = code
  }
}

export async function fetchRoommateBoostStatus(
  postId: string,
): Promise<RoommateBoostStatus | null> {
  const res = await fetch(`/api/community/${encodeURIComponent(postId)}/boost`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return (await res.json().catch(() => null)) as RoommateBoostStatus | null
}

/** requestKey: 시도마다 새 UUID (같은 시도의 두 번 누름은 한 번만 차감) */
export async function boostRoommatePostRequest(
  postId: string,
  requestKey: string,
): Promise<RoommateBoostResult> {
  const res = await fetch(`/api/community/${encodeURIComponent(postId)}/boost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestKey }),
  })
  const data = (await res.json().catch(() => null)) as
    | (Partial<RoommateBoostResult> & { error?: string; code?: string })
    | null
  if (!res.ok || !data?.boostedUntil) {
    throw new RoommateBoostError(data?.error || '', data?.code ?? null)
  }
  return data as RoommateBoostResult
}

export function newBoostRequestKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
