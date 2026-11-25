import { NextResponse } from 'next/server'

import { messagingMe, updateSettings } from '@lib/ellieo/messaging.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Messages tab start-up: my Ellieo person, whether I can message (and why not), chat settings, realtime channel. */
export async function GET() {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json(await messagingMe(uid))
  } catch (error) {
    return errorResponse(error, 'messaging me')
  }
}

/** Chat settings: { audience?, readReceipts?, notifications?, preview? } */
export async function PATCH(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    return NextResponse.json({ settings: await updateSettings(uid, await jsonBody(request)) })
  } catch (error) {
    return errorResponse(error, 'chat settings')
  }
}
