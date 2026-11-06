import { BRAND_CONFIG } from '@lib/brand'
import { DEFAULT_GOOGLE_CLIENT_ID } from '@lib/constants/googleAuth'

/**
 * Google Sign-In web client. Ellieo uses its own OAuth client (consent screen named "Ellieo", origin ellieo.com)
 * from NEXT_PUBLIC_GOOGLE_CLIENT_ID_ELLIEO when set; otherwise the shared one. The Ellieo client id must also be
 * listed in Supabase → Auth → Providers → Google → Client IDs, or Supabase rejects its id tokens.
 * (NEXT_PUBLIC_* values are inlined at build time, so they are read with literal names.)
 */
export function getGoogleClientId() {
  const ellieo =
    BRAND_CONFIG.id === 'ellieo' ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_ELLIEO?.trim() : ''
  return (
    ellieo ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    DEFAULT_GOOGLE_CLIENT_ID
  )
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
