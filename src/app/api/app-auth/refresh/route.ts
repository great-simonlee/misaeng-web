import { NextResponse } from 'next/server'

import { accountDeletedResponse } from '@lib/account/deletedAccount.server'
import { getRequestT } from '@lib/i18n/server'
import { normalizeUserFromAccessToken } from '../../agent-auth/lib/authHelpers'
import { ellieoUpstreamFetch, extractEllieoTokens, getEllieoBaseUrl } from '../../agent-auth/lib/ellieoServer'
import { APP_DEVICE_ID } from '../lib/appSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST { refreshToken } → { accessToken, refreshToken }. 401 means the app must sign in again; 403 ACCOUNT_DELETED too. */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  if (!getEllieoBaseUrl()) {
    return NextResponse.json({ error: t('auth.appConnectMissingLogin') }, { status: 503 })
  }
  const body = ((await request.json().catch(() => null)) || {}) as { refreshToken?: string }
  const refreshToken = String(body.refreshToken || '').trim()
  if (!refreshToken) {
    return NextResponse.json({ error: t('auth.refreshTokenRequired') }, { status: 400 })
  }

  const { res, data } = await ellieoUpstreamFetch('auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    deviceId: APP_DEVICE_ID,
  })
  const tokens = res.ok ? extractEllieoTokens(data) : null
  if (!tokens?.accessToken) {
    const status = res.status >= 500 ? 503 : 401
    return NextResponse.json({ error: t('auth.sessionExpired') }, { status })
  }
  // a deleted account gets no new tokens (403 ACCOUNT_DELETED → the app signs out)
  const deleted = await accountDeletedResponse(normalizeUserFromAccessToken(tokens.accessToken)?.uid, t)
  if (deleted) return deleted
  return NextResponse.json(
    { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || refreshToken },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
