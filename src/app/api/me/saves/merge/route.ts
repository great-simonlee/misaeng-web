import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { addPostSaves, parsePostSaveTarget, POST_SAVES_MAX } from '@lib/supabase/postSaves.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { items: [{ kind, targetId, board?, savedAt? }] } → { ok, merged, stored }
 * One-time upload of the saves kept on the device before sign-in (max 500). Already saved targets are left as they are.
 * These are old saves, so they never notify post authors. `savedAt` (ms or ISO) keeps the original order.
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null
  if (!Array.isArray(body?.items)) return NextResponse.json({ error: t('saves.invalidTarget') }, { status: 400 })
  if (body.items.length > POST_SAVES_MAX) {
    return NextResponse.json({ error: t('saves.tooMany', { max: POST_SAVES_MAX }) }, { status: 400 })
  }

  const seen = new Set<string>()
  const targets = body.items.flatMap((raw) => {
    const target = parsePostSaveTarget(raw)
    if (!target || seen.has(`${target.kind}:${target.targetId}`)) return []
    seen.add(`${target.kind}:${target.targetId}`)
    return [{ ...target, createdAt: parseSavedAt((raw as Record<string, unknown>).savedAt) }]
  })

  try {
    const inserted = await addPostSaves(user.uid, targets)
    return NextResponse.json({ ok: true, merged: inserted?.length ?? 0, stored: inserted !== null })
  } catch (error) {
    console.error('Post saves merge error:', error)
    return NextResponse.json({ error: t('saves.saveFailed') }, { status: 500 })
  }
}

/** Device save time → ISO, only when it is a sensible past time. */
function parseSavedAt(value: unknown): string | undefined {
  const ms = typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN
  if (!Number.isFinite(ms) || ms < Date.UTC(2020, 0, 1) || ms > Date.now() + 60_000) return undefined
  return new Date(ms).toISOString()
}
