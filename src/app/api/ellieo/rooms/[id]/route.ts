import { NextResponse } from 'next/server'

import { getRoom, roomAction, type RoomAction } from '@lib/ellieo/rooms.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** One room: name, members, my role (admin | manager | member | null), joined / muted / unread, canJoin. */
export async function GET(_request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    return NextResponse.json({ room: await getRoom(uid, id) })
  } catch (error) {
    return errorResponse(error, 'room')
  }
}

/**
 * { action: 'join' | 'leave' | 'mute' | 'unmute' }
 * { action: 'read', at? }                         read up to `at` (the newest message seen; default now)
 * { action: 'report', messageId, reason? }        someone else's message, kept for review
 * { action: 'remove-message', messageId }         admins / managers: "Message removed"
 * { action: 'remove-member', memberId }           admins / managers: removed, can't rejoin for 24 hours
 */
export async function POST(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const body = await jsonBody(request)
    return NextResponse.json(await roomAction(uid, id, String(body.action ?? '') as RoomAction, body))
  } catch (error) {
    return errorResponse(error, 'room action')
  }
}
