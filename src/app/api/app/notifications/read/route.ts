import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { markNotificationsRead, unreadCount } from '@lib/push/inbox.server'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Mark as read: `{ ids: [...] }` or `{ all: true }` → `{ unread }`. */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as { ids?: unknown; all?: unknown }
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200) : []
  try {
    await markNotificationsRead(user.uid, body.all === true ? 'all' : ids)
    return NextResponse.json({ unread: await unreadCount(user.uid) })
  } catch (error) {
    console.error('Notification read error:', error)
    return NextResponse.json({ error: t('common.requestFailed') }, { status: 500 })
  }
}
