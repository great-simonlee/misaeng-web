export async function sendWorkplaceEmailVerification(args: {
  email: string
  companyName: string
}) {
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
    throw new Error(data?.error || '인증 메일 전송에 실패했어요')
  }
}

export async function confirmWorkplaceEmailVerification(args: {
  email: string
  companyName: string
  code: string
}) {
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
    throw new Error(data?.error || '인증에 실패했어요')
  }

  return {
    profile: data?.profile ?? null,
  }
}
