import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { getPushPreferences, PushStoreError, savePushPreferences } from '@lib/push/store.server'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET → { comment, reply, posting, credit } */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  return NextResponse.json(await getPushPreferences(user.uid))
}

/** PUT { comment?, reply?, posting?, credit? } → the saved preferences */
export async function PUT(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  try {
    return NextResponse.json(await savePushPreferences(user.uid, body))
  } catch (error) {
    const setup = error instanceof PushStoreError && error.setupRequired
    return NextResponse.json({ error: setup ? error.message : t('common.requestFailed') }, { status: setup ? 503 : 500 })
  }
}
