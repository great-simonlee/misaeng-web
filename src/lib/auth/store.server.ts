/* PostgREST access to the auth tables (supabase/misaeng_auth.sql) with the service role key. */

function restConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) throw new Error('Supabase is not configured.')
  return { url, key }
}

export async function authRest<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const { url, key } = restConfig()
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`auth store ${res.status}: ${text.slice(0, 200)}`)
  return (text ? JSON.parse(text) : null) as T
}

export const enc = encodeURIComponent

