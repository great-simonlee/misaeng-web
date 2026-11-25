import { NextResponse } from 'next/server'

import { readAll } from '@lib/ellieo/messaging.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Chat settings → Mark all as read. */
export async function POST() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json(await readAll(uid))
  } catch (error) {
    return errorResponse(error, 'read all')
  }
}
