import { NextResponse } from 'next/server'

import { InquiryError, openThread, replyInThread } from '@lib/marketplace/inquiries.server'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 *   GET               → { thread, messages }  (opening clears the viewer's unread count)
 *   POST { body }     → { ok }                 a reply from either side (push to the other)
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const { id } = await context.params
  try {
    return NextResponse.json(await openThread(user.uid, id))
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const { id } = await context.params
  const body = ((await request.json().catch(() => null)) || {}) as { body?: unknown }
  try {
    await replyInThread({ uid: user.uid, inquiryId: id, body: String(body.body || '') })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}

function failure(error: unknown) {
  if (error instanceof InquiryError) return NextResponse.json({ error: error.code, code: error.code }, { status: error.status })
  console.error('Marketplace thread error:', error)
  return NextResponse.json({ error: 'Failed to load the inquiry.' }, { status: 500 })
}
