import type { Translate } from '@lib/i18n/translate'

/** t는 네임스페이스 없는 번역기(`useT()`)다. 서버가 error를 주지 않을 때만 기본 문구를 쓴다. */
export async function sendWorkplaceEmailVerification(
  args: {
    email: string
    companyName: string
  },
  t: Translate,
) {
  const response = await fetch('/api/agent-auth/work-email', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send',
      email: args.email,
      companyName: args.companyName,
    }),
  })

  const data = (await response.json().catch(() => null)) as {
    error?: string
  } | null

  if (!response.ok) {
    throw new Error(data?.error || t('me.verification.errors.sendFailed'))
  }
}

export async function confirmWorkplaceEmailVerification(
  args: {
    email: string
    companyName: string
    code: string
  },
  t: Translate,
) {
  const response = await fetch('/api/agent-auth/work-email', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm',
      email: args.email,
      companyName: args.companyName,
      code: args.code,
    }),
  })

  const data = (await response.json().catch(() => null)) as {
    error?: string
    profile?: Record<string, unknown>
  } | null

  if (!response.ok) {
    throw new Error(data?.error || t('me.verification.errors.confirmFailed'))
  }

  return {
    profile: data?.profile ?? null,
  }
}
