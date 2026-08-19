export async function sendSchoolEmailVerification(email: string) {
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
    const error = new Error(data?.error || '인증 메일 전송에 실패했어요') as Error & {
      code?: string
    }
    if (data?.code) error.code = data.code
    throw error
  }
}

export async function confirmSchoolEmailVerification(
  email: string,
  code: string,
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
    throw new Error(data?.error || '인증에 실패했어요')
  }

  return {
    schoolName: data?.schoolName ?? null,
    profile: data?.profile ?? null,
  }
}
