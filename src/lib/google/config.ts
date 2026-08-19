export function getGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null
}

export function isGoogleSignInConfigured() {
  return Boolean(getGoogleClientId())
}

export function decodeGoogleCredential(credential: string) {
  const segment = credential.split('.')[1]
  if (!segment) {
    return { email: null as string | null, name: null as string | null }
  }

  try {
    const json = JSON.parse(
      atob(segment.replace(/-/g, '+').replace(/_/g, '/')),
    ) as Record<string, unknown>

    return {
      email: typeof json.email === 'string' ? json.email : null,
      name: typeof json.name === 'string' ? json.name : null,
    }
  } catch {
    return { email: null, name: null }
  }
}
