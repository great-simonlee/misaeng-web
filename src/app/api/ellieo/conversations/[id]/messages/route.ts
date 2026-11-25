import { NextResponse } from 'next/server'

import { listMessages, sendMessage } from '@lib/ellieo/messaging.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** History, oldest first: ?before=<iso> for older pages, ?after=<iso> for what's new since; ?limit (≤ 100). */
export async function GET(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const search = new URL(request.url).searchParams
    return NextResponse.json(
      await listMessages(uid, id, {
        before: search.get('before'),
        after: search.get('after'),
        limit: Number(search.get('limit')) || undefined,
      }),
    )
  } catch (error) {
    return errorResponse(error, 'messages')
  }
}

/** { clientId: uuid made by the phone (a resend with the same id is stored once), body } */
export async function POST(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const body = await jsonBody(request)
    return NextResponse.json({ message: await sendMessage(uid, id, body) })
  } catch (error) {
    return errorResponse(error, 'send message')
  }
}
