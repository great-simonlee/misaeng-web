import { NextResponse } from 'next/server'

import { searchPeople } from '@lib/ellieo/messaging.server'

import { errorResponse, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Add friend search: ?q= name, Ellieo ID or school (start of a word). Blocked either way never shows. */
export async function GET(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const q = new URL(request.url).searchParams.get('q') ?? ''
    return NextResponse.json({ people: await searchPeople(uid, q) })
  } catch (error) {
    return errorResponse(error, 'people search')
  }
}
