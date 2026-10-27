/*
 * Saved posts on the account (supabase/post_saves.sql, table post_saves), through PostgREST with the service role key.
 * Web heart "찜" (src/lib/utils/postLikes.ts) and the app's heart / bookmark (SavedStore.swift) sync with it.
 * A missing table (SQL not run yet) means "nothing stored": reads return { stored: false } and writes are skipped, so
 * the clients keep their device copy.
 */

const TABLE = 'post_saves'

export const POST_SAVE_KINDS = ['housing', 'community'] as const
export type PostSaveKind = (typeof POST_SAVE_KINDS)[number]

/** Most saves one user can keep / merge at once. */
export const POST_SAVES_MAX = 500

export type PostSave = {
  kind: PostSaveKind
  targetId: string
  board: string | null
  createdAt: string
}

type Row = { user_id: string; kind: PostSaveKind; target_id: string; board: string | null; created_at: string }

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return url && key ? { url, key } : null
}

class SavesMissing extends Error {}
let warnedMissing = false

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T | null> {
  const c = config()
  if (!c) throw new SavesMissing('Supabase is not configured.')
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
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    const code = (data as { code?: string } | null)?.code
    if (code === 'PGRST205' || code === '42P01' || code === '42501') {
      if (!warnedMissing) {
        warnedMissing = true
        console.warn('Post saves: run supabase/post_saves.sql to enable them.')
      }
      throw new SavesMissing('Post saves table missing.')
    }
    throw new Error(`Post saves request failed (${res.status}).`)
  }
  return data as T
}

/** Validated save target from a request body / query, or null. */
export function parsePostSaveTarget(raw: unknown): { kind: PostSaveKind; targetId: string; board: string | null } | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const kind = item.kind
  const targetId = String(item.targetId ?? '').trim()
  if ((kind !== 'housing' && kind !== 'community') || !targetId || targetId.length > 200) return null
  const board = typeof item.board === 'string' && item.board.trim() ? item.board.trim().slice(0, 60) : null
  return { kind, targetId, board: kind === 'community' ? board : null }
}

/** The user's saves, newest first. `stored: false` = table missing (clients keep their device copy). */
export async function listPostSaves(uid: string): Promise<{ items: PostSave[]; stored: boolean }> {
  try {
    const rows =
      (await rest<Row[]>(
        `${TABLE}?user_id=eq.${encodeURIComponent(uid)}&select=kind,target_id,board,created_at` +
          `&order=created_at.desc&limit=${POST_SAVES_MAX * 2}`,
      )) ?? []
    return {
      items: rows.map((row) => ({
        kind: row.kind,
        targetId: row.target_id,
        board: row.board,
        // Postgres gives microseconds + offset; clients parse plain ISO more reliably
        createdAt: new Date(row.created_at).toISOString(),
      })),
      stored: true,
    }
  } catch (error) {
    if (error instanceof SavesMissing) return { items: [], stored: false }
    throw error
  }
}

/**
 * Saves the targets (idempotent: an existing save keeps its first time).
 * Returns the targets that were newly saved, or null when the table is missing.
 */
export async function addPostSaves(
  uid: string,
  targets: { kind: PostSaveKind; targetId: string; board: string | null; createdAt?: string }[],
): Promise<{ kind: PostSaveKind; targetId: string }[] | null> {
  if (targets.length === 0) return []
  const rows = targets.map((target) => ({
    user_id: uid,
    kind: target.kind,
    target_id: target.targetId,
    board: target.board,
    ...(target.createdAt ? { created_at: target.createdAt } : {}),
  }))
  try {
    // PostgREST needs the same keys on every row of a bulk insert
    const withTime = rows.filter((row) => 'created_at' in row)
    const withoutTime = rows.filter((row) => !('created_at' in row))
    const inserted: Row[] = []
    for (const batch of [withTime, withoutTime]) {
      if (batch.length === 0) continue
      const result = await rest<Row[]>(`${TABLE}?on_conflict=user_id,kind,target_id&select=kind,target_id`, {
        method: 'POST',
        prefer: 'resolution=ignore-duplicates,return=representation',
        body: JSON.stringify(batch),
      })
      inserted.push(...(result ?? []))
    }
    return inserted.map((row) => ({ kind: row.kind, targetId: row.target_id }))
  } catch (error) {
    if (error instanceof SavesMissing) return null
    throw error
  }
}

/** Removes one save. Missing table = nothing to remove. */
export async function removePostSave(uid: string, kind: PostSaveKind, targetId: string): Promise<boolean> {
  try {
    await rest(
      `${TABLE}?user_id=eq.${encodeURIComponent(uid)}&kind=eq.${encodeURIComponent(kind)}&target_id=eq.${encodeURIComponent(targetId)}`,
      { method: 'DELETE', prefer: 'return=minimal' },
    )
    return true
  } catch (error) {
    if (error instanceof SavesMissing) return false
    throw error
  }
}

/** Account deletion: removes every save of the user. Missing table = nothing to delete. */
export async function deletePostSavesForUser(uid: string): Promise<void> {
  if (!uid) return
  try {
    await rest(`${TABLE}?user_id=eq.${encodeURIComponent(uid)}`, { method: 'DELETE', prefer: 'return=minimal' })
  } catch (error) {
    if (!(error instanceof SavesMissing)) throw error
  }
}
