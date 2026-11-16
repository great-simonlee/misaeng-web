import { NextResponse } from 'next/server'

import { InquiryError, listThreads, sendBuyerMessage, unreadCount } from '@lib/marketplace/inquiries.server'
import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import { CONTENT_BLOCKED_CODE, findBlockedContent } from '@lib/community/contentFilter'
import { getRequestT } from '@lib/i18n/server'
import { accountSuspendedResponse } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 중고거래 문의 (app; supabase/marketplace_inquiries.sql)
 *   GET  ?box=all|buying|selling[&postId=] → { threads } the viewer's threads (all = 보낸 + 받은, newest first)
 *   GET  ?unread=1                       → { unread }    unread messages in all threads
 *   POST { postId, body }                → { inquiryId } buyer → seller (opens the thread on first contact)
 */
export async function GET(request: Request) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  try {
    if (params.get('unread') === '1') return NextResponse.json({ unread: await unreadCount(user.uid) })
    const box = params.get('box') === 'selling' ? 'selling' : params.get('box') === 'all' ? 'all' : 'buying'
    const postId = params.get('postId')?.trim() || undefined
    return NextResponse.json({ threads: await listThreads(user.uid, box, postId) })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const body = ((await request.json().catch(() => null)) || {}) as { postId?: unknown; body?: unknown }
  // Same rules as comments: suspended accounts can't write, objectionable words are refused
  const t = await getRequestT(request, 'api')
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended
  if (findBlockedContent(body.body)) {
    return NextResponse.json({ error: t('community.contentBlocked'), code: CONTENT_BLOCKED_CODE }, { status: 400 })
  }
  try {
    return NextResponse.json(
      await sendBuyerMessage({ uid: user.uid, postId: String(body.postId || '').trim(), body: String(body.body || '') }),
    )
  } catch (error) {
    return failure(error)
  }
}

function failure(error: unknown) {
  if (error instanceof InquiryError) return NextResponse.json({ error: error.code, code: error.code }, { status: error.status })
  console.error('Marketplace inquiry error:', error)
  return NextResponse.json({ error: 'Failed to load inquiries.' }, { status: 500 })
}
