import type { Translate } from '@lib/i18n/translate'

/** t는 네임스페이스 없는 번역기(`useT()`)다. 서버가 error를 주지 않을 때만 기본 문구를 쓴다. */
export async function sendSchoolEmailVerification(email: string, t: Translate) {
  const response = await fetch('/api/agent-auth/school-email', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send',
      email,
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | { error?: string; code?: string }
    | null

  if (!response.ok) {
    const error = new Error(
      data?.error || t('me.verification.errors.sendFailed'),
    ) as Error & {
      code?: string
    }
    if (data?.code) error.code = data.code
    throw error
  }
}

export async function confirmSchoolEmailVerification(
  email: string,
  code: string,
  t: Translate,
) {
  const response = await fetch('/api/agent-auth/school-email', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm',
      email,
      code,
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | {
        error?: string
        schoolName?: string
        profile?: Record<string, unknown>
      }
    | null

  if (!response.ok) {
    throw new Error(data?.error || t('me.verification.errors.confirmFailed'))
  }

  return {
    schoolName: data?.schoolName ?? null,
    profile: data?.profile ?? null,
  }
}
