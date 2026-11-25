import { NextResponse } from 'next/server'

import { listConversations, openConversation } from '@lib/ellieo/messaging.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** My 1:1 chats, newest first; `accepted: false` ones are message requests. */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json({ conversations: await listConversations(uid) })
  } catch (error) {
    return errorResponse(error, 'conversations')
  }
}

/** { with: person id } → the 1:1 chat with them (created on first open). */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const body = await jsonBody(request)
    return NextResponse.json({ conversation: await openConversation(uid, body.with) })
  } catch (error) {
    return errorResponse(error, 'open conversation')
  }
}
