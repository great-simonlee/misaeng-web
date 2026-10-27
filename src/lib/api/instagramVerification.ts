import type { Translate } from '@lib/i18n/translate'
import type { InstagramVerificationState } from '@lib/verification/instagram'

/** POST /api/agent-auth/instagram — request(handle) 코드 발급 · sent 보냈어요 · cancel 취소. 새 상태를 돌려준다 */
export async function postInstagramVerification(
  body: { action: 'request'; handle: string } | { action: 'sent' | 'cancel' },
  t: Translate,
): Promise<InstagramVerificationState> {
  const response = await fetch('/api/agent-auth/instagram', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as
    | { error?: string; instagram?: InstagramVerificationState }
    | null
  if (!response.ok || !data?.instagram) {
    throw new Error(data?.error || t('me.verification.errors.sendFailed'))
  }
  return data.instagram
}
