/*
 * PostgREST access for Misaeng Points (supabase/points.sql) with the service role key — same pattern as
 * src/lib/push/store.server.ts. Missing tables/functions (SQL not run yet) raise PointsStoreError with
 * setupRequired=true so callers can fall back to the legacy credit system instead of crashing.
 */

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

export function isPointsStoreConfigured() {
  return Boolean(config())
}

export class PointsStoreError extends Error {
  constructor(
    message: string,
    readonly setupRequired = false,
    readonly status = 0,
    readonly code: string | null = null,
  ) {
    super(message)
    this.name = 'PointsStoreError'
  }
}

/** PostgREST / Postgres codes that mean "points.sql has not been run here". */
const SETUP_CODES = new Set(['PGRST202', 'PGRST205', '42P01', '42883', '42501', '42704'])

export async function pointsRest<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  const c = config()
  if (!c) throw new PointsStoreError('Supabase is not configured.', true)
  let res: Response
  try {
    res = await fetch(`${c.url}/rest/v1/${path}`, {
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
  } catch (error) {
    throw new PointsStoreError(`Points store unreachable: ${(error as Error)?.message || 'network error'}`)
  }
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? (JSON.parse(text) as unknown) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code ?? null
    const message = (data as { message?: string } | null)?.message ?? ''
    if (code && SETUP_CODES.has(code)) {
      throw new PointsStoreError('Run supabase/points.sql in the Supabase SQL Editor.', true, res.status, code)
    }
    throw new PointsStoreError(`Points store request failed (${res.status} ${code ?? ''} ${message})`.trim(), false, res.status, code)
  }
  return data as T
}

/** Calls a SQL function (`rpc/<name>`) with named arguments. */
export function pointsRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return pointsRest<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })
}

export const enc = encodeURIComponent

/** PostgREST `in.(...)` list */
export const inList = (values: string[]) =>
  `(${values.map((v) => `"${String(v).replace(/["\\]/g, '')}"`).join(',')})`

/** Result shape shared by the SQL functions (jsonb) */
export type PointsRpcResult = {
  ok: boolean
  error?: string
  duplicate?: boolean
  ledger_id?: string
  hold_id?: string
  request_id?: string
  amount?: number
  balance?: number
  held?: number
  available?: number
  required?: number
  cap?: number
  spent?: number
  status?: string
  user_id?: string
  method?: string
  charged?: number
  unlocked?: boolean
  already?: boolean
  free_remaining?: number
  boosted_until?: string
}
