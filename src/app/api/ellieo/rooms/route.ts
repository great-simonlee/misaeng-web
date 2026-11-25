import { NextResponse } from 'next/server'

import { listRooms } from '@lib/ellieo/rooms.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Group rooms: the ones I'm in (joined, with unread) and the ones I can find in Explore (member counts). */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json(await listRooms(uid))
  } catch (error) {
    return errorResponse(error, 'rooms')
  }
}
