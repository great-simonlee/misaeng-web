import { NextResponse } from 'next/server'

import { conversation, conversationAction, type ConversationAction } from '@lib/ellieo/messaging.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** One chat's header: the other person, accepted / muted / friends / blocked, how far they've read. */
export async function GET(_request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    return NextResponse.json({ conversation: await conversation(uid, id) })
  } catch (error) {
    return errorResponse(error, 'conversation')
  }
}

/**
 * { action: 'read', at? }                      read up to `at` (the newest message seen; default now)
 * { action: 'accept' }                         accept a message request
 * { action: 'leave' }                          leave / delete / decline: gone from my Messages with its history
 * { action: 'mute' | 'unmute' }
 * { action: 'report', messageId, reason? }     someone else's message, kept for review
 */
export async function POST(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const body = await jsonBody(request)
    return NextResponse.json(await conversationAction(uid, id, String(body.action ?? '') as ConversationAction, body))
  } catch (error) {
    return errorResponse(error, 'conversation action')
  }
}
