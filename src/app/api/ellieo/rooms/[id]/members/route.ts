import { NextResponse } from 'next/server'

import { listRoomMembers } from '@lib/ellieo/rooms.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/** Admins, managers, then members: ?offset=0&limit=50 (≤ 100). */
export async function GET(request: Request, { params }: Props) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const { id } = await params
    const search = new URL(request.url).searchParams
    return NextResponse.json(
      await listRoomMembers(uid, id, { offset: Number(search.get('offset')) || 0, limit: Number(search.get('limit')) || undefined }),
    )
  } catch (error) {
    return errorResponse(error, 'room members')
  }
}
