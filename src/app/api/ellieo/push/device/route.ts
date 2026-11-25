import { NextResponse } from 'next/server'

import { deletePushDevice, savePushDevice } from '@lib/ellieo/messaging.server'

import { errorResponse, jsonBody, loginRequired, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The Ellieo app's APNs token: { token, environment: 'sandbox' | 'production', locale } (message pushes). */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    await savePushDevice(uid, await jsonBody(request))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'push device')
  }
}

/** { token } on sign-out; works with an expired session too (the token alone identifies the phone). */
export async function DELETE(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  try {
    const body = await jsonBody(request)
    await deletePushDevice(body.token, await signedInUid().catch(() => null))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'push device')
  }
}
