import { NextResponse } from 'next/server'

import { listRoomMessages, sendRoomMessage } from '@lib/ellieo/rooms.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/**
 * Oldest first. Members: the last 30 days, ?before=<iso> for older pages, ?after=<iso> for what's new; ?limit ≤ 100.
 * Not a member: the last three messages (preview: true).
 */
export async function GET(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const search = new URL(request.url).searchParams
    return NextResponse.json(
      await listRoomMessages(uid, id, {
        before: search.get('before'),
        after: search.get('after'),
        limit: Number(search.get('limit')) || undefined,
      }),
    )
  } catch (error) {
    return errorResponse(error, 'room messages')
  }
}

/** { clientId: uuid made by the phone (a resend with the same id is stored once), body } — members only. */
export async function POST(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const body = await jsonBody(request)
    return NextResponse.json({ message: await sendRoomMessage(uid, id, body) })
  } catch (error) {
    return errorResponse(error, 'send room message')
  }
}
