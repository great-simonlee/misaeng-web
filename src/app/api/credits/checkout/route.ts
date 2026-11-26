import { NextResponse } from 'next/server'

import { createCheckout, readTopUpToken } from '@lib/agents/credits.server'

import { errorResponse, jsonBody, loginRequired, creditsOff, notMisaeng, signedInUid } from '@lib/agents/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** { pack, code?, t?, locale? } → { url } (Stripe Checkout). Signed in on the web, or with the app's top-up token. */
export async function POST(request: Request) {
  const blocked = notMisaeng()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const body = await jsonBody(request)
    const uid = readTopUpToken(typeof body.t === 'string' ? body.t : null) ?? (await signedInUid())
    if (!uid) return loginRequired()
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL)?.trim().replace(/\/+$/, '') || new URL(request.url).origin
    const { url } = await createCheckout({ uid, packId: String(body.pack ?? ''), origin, locale: String(body.locale ?? 'en'), code: typeof body.code === 'string' ? body.code : null })
    return NextResponse.json({ url })
  } catch (error) {
    return errorResponse(error, 'checkout')
  }
}
