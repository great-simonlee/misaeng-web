import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { getBoardAlerts, getPushPreferences, PushStoreError, saveBoardAlerts, savePushPreferences } from '@lib/push/store.server'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET → { comment, reply, posting, credit, post_recommend, post_save, job_review, visa_news } (missing = on)
 *       + boards: { food, roommate, status, 'job-review', anonymous } — 새 글 알림, default off (owner 11-23).
 * job_review is kept for old apps but no longer sends anything (the new-post alert moved to boards['job-review']).
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const [prefs, boards] = await Promise.all([getPushPreferences(user.uid), getBoardAlerts(user.uid)])
  return NextResponse.json({ ...prefs, boards })
}

/** PUT { <any of the GET keys>?, boards?: { <board>: boolean } } → the saved preferences (same shape as GET) */
export async function PUT(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  try {
    const { boards: boardPatch, ...rest } = body
    // Only touch push_preferences when a type switch was sent (a boards-only save must not fail on an old table)
    const prefs = Object.keys(rest).length ? await savePushPreferences(user.uid, rest) : await getPushPreferences(user.uid)
    const boards = boardPatch !== undefined ? await saveBoardAlerts(user.uid, boardPatch) : await getBoardAlerts(user.uid)
    return NextResponse.json({ ...prefs, boards })
  } catch (error) {
    const setup = error instanceof PushStoreError && error.setupRequired
    return NextResponse.json({ error: setup ? error.message : t('common.requestFailed') }, { status: setup ? 503 : 500 })
  }
}
