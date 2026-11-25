import { NextResponse } from 'next/server'

import { getCreditsConfig, paymentsEnabled, topUpToken } from '@lib/ellieo/credits.server'
import { isInHouse } from '@lib/ellieo/inHouse.server'

import { errorResponse, loginRequired, creditsOff, notEllieo, signedInUid } from '../../_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * App "Top up": { url, show } — the credits page with a 30-minute signed token (no second sign-in on the web).
 * `show` follows the per-platform switch in the ERP (x-platform: ios | android) so the button can be hidden if store
 * rules require it.
 */
export async function POST(request: Request) {
  const blocked = notEllieo()
  if (blocked) return blocked
  const off = await creditsOff()
  if (off) return off
  try {
    const uid = await signedInUid()
    if (!uid) return loginRequired()
    const config = await getCreditsConfig()
    const platform = request.headers.get('x-platform')?.toLowerCase() === 'android' ? 'android' : 'ios'
    // In-house members never buy credits.
    const show = !(await isInHouse(uid)) && (platform === 'android' ? config.topUpLinkAndroid : config.topUpLinkIOS)
    const origin = process.env.ELLIEO_PUBLIC_URL?.trim().replace(/\/+$/, '') || new URL(request.url).origin
    const locale = request.headers.get('x-locale') === 'vi' ? 'vi/' : ''
    return NextResponse.json({ url: `${origin}/${locale}nyc/credits?t=${encodeURIComponent(topUpToken(uid))}`, show, paymentsEnabled: paymentsEnabled() })
  } catch (error) {
    return errorResponse(error, 'top-up link')
  }
}
