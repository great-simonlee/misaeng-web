import { NextResponse } from 'next/server'

import { getRequestLocale, getRequestT } from '@lib/i18n/server'
import { listNotifications, unreadCount } from '@lib/push/inbox.server'
import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The app's notification inbox, newest first, in the request language (`x-locale`).
 * `?count=1` → `{ unread }` only (badge on the bell). Otherwise `?cursor=&limit=` → `{ items, nextCursor, unread }`.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const { searchParams } = new URL(request.url)
  try {
    if (searchParams.get('count') === '1') {
      return NextResponse.json({ unread: await unreadCount(user.uid) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const limitRaw = Math.trunc(Number(searchParams.get('limit') || 30))
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 30
    const [page, unread] = await Promise.all([
      listNotifications(user.uid, await getRequestLocale(request), searchParams.get('cursor'), limit),
      unreadCount(user.uid),
    ])
    return NextResponse.json({ ...page, unread }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Notification inbox error:', error)
    return NextResponse.json({ error: t('common.requestFailed') }, { status: 500 })
  }
}
