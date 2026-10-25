import { after } from 'next/server'

import type { UsageMetric } from './metrics'

/**
 * 오늘 사용량 +n (usage_daily). 비용 화면용 집계라 실패해도 본 기능을 막지 않는다:
 * 테이블이 아직 없거나(SQL 실행 전) 네트워크 오류면 조용히 넘어간다.
 */
export function recordUsage(metric: UsageMetric, amount = 1): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key || amount <= 0) return

  const send = () =>
    fetch(`${url}/rest/v1/rpc/increment_usage`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_metric: metric, p_amount: amount }),
      signal: AbortSignal.timeout(4000),
    })
      .then(() => undefined)
      .catch(() => undefined)

  // 응답을 늦추지 않고, 서버리스 함수가 끝나기 전에 기록이 끝나도록 after()로 보낸다
  try {
    after(send)
  } catch {
    void send()
  }
}
