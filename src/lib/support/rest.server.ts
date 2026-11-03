/*
 * Support tables (supabase/support.sql) through PostgREST with the service role key.
 * Missing tables (SQL not run yet) → SupportStoreError(setupRequired) so routes answer 503 instead of crashing.
 */

export class SupportStoreError extends Error {
  constructor(
    message: string,
    readonly setupRequired = false,
    readonly code?: string,
  ) {
    super(message)
  }
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

export function isSupportStoreConfigured() {
  return Boolean(config())
}

export async function supportRest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const c = config()
  if (!c) throw new SupportStoreError('Supabase is not configured.', true)
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code
    if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42501' || code === '42883') {
      throw new SupportStoreError('Run supabase/support.sql in the Supabase SQL Editor.', true, code)
    }
    throw new SupportStoreError(`Support store request failed (${res.status}): ${text.slice(0, 200)}`, false, code)
  }
  return data as T
}

export const inList = (values: string[]) => `(${values.map((v) => `"${String(v).replace(/"/g, '')}"`).join(',')})`
export const eq = (value: string) => `eq.${encodeURIComponent(value)}`
