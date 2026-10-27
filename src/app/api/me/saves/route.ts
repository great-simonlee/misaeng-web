import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { getRequestT } from '@lib/i18n/server'
import { notifyPostEngagement } from '@lib/push/postEngagementNotify.server'
import {
  addPostSaves,
  listPostSaves,
  parsePostSaveTarget,
  removePostSave,
} from '@lib/supabase/postSaves.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 * The signed-in user's saved posts (web heart "찜", app heart / bookmark). App Bearer token or web cookie session.
 * `stored: false` in a response = the table is not set up yet (supabase/post_saves.sql); clients keep their device copy.
 */

/** GET → { items: [{ kind, targetId, board, createdAt }], stored } newest first */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  try {
    return NextResponse.json(await listPostSaves(user.uid), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Post saves list error:', error)
    return NextResponse.json({ error: t('saves.loadFailed') }, { status: 500 })
  }
}

/** PUT { kind, targetId, board? } → { ok, saved, stored }. Saving twice is fine. */
export async function PUT(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const target = parsePostSaveTarget(await request.json().catch(() => null))
  if (!target) return NextResponse.json({ error: t('saves.invalidTarget') }, { status: 400 })
  try {
    const inserted = await addPostSaves(user.uid, [target])
    if (inserted?.length && target.kind === 'community') {
      notifyPostEngagement({ type: 'post_save', postId: target.targetId, actorUid: user.uid })
    }
    return NextResponse.json({ ok: true, saved: true, stored: inserted !== null })
  } catch (error) {
    console.error('Post save error:', error)
    return NextResponse.json({ error: t('saves.saveFailed') }, { status: 500 })
  }
}

/** DELETE ?kind=&targetId= → { ok, saved: false, stored } */
export async function DELETE(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const target = parsePostSaveTarget({ kind: searchParams.get('kind'), targetId: searchParams.get('targetId') })
  if (!target) return NextResponse.json({ error: t('saves.invalidTarget') }, { status: 400 })
  try {
    const stored = await removePostSave(user.uid, target.kind, target.targetId)
    return NextResponse.json({ ok: true, saved: false, stored })
  } catch (error) {
    console.error('Post unsave error:', error)
    return NextResponse.json({ error: t('saves.saveFailed') }, { status: 500 })
  }
}
