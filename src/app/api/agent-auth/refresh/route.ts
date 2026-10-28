import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'

import { refreshEllieoAccessToken } from '../lib/ellieoServer'
import { resolveAuthenticatedSession } from '../lib/authHelpers'
import { isSupabaseAuthMode } from '@lib/auth/accounts.server'

export async function POST(request: Request) {
  if (isSupabaseAuthMode()) {
    // refreshes the misaeng_* cookies (or swaps a live Ellieo session) as a side effect
    if (await resolveAuthenticatedSession()) return NextResponse.json({ connected: true })
    const t = await getRequestT(request, 'api')
    return NextResponse.json({ error: t('auth.sessionExpired') }, { status: 401 })
  }
  const accessToken = await refreshEllieoAccessToken()
  if (!accessToken) {
    const t = await getRequestT(request, 'api')
    return NextResponse.json(
      { error: t('auth.sessionExpired') },
      { status: 401 },
    )
  }

  return NextResponse.json({ connected: true })
}
