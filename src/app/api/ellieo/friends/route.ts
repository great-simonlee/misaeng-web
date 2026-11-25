import { NextResponse } from 'next/server'

import { friendAction, socialState, type FriendAction } from '@lib/ellieo/messaging.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Friends (with ★), friend requests to me and from me, blocked people. */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json(await socialState(uid))
  } catch (error) {
    return errorResponse(error, 'friends')
  }
}

/** { action: request | accept | decline | cancel | remove | star | unstar | block | unblock, id: person id } */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const body = await jsonBody(request)
    return NextResponse.json(await friendAction(uid, String(body.action ?? '') as FriendAction, body.id))
  } catch (error) {
    return errorResponse(error, 'friend action')
  }
}
