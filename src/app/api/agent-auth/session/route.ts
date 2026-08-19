import { NextResponse } from 'next/server'

import {
  normalizeUserFromAccessToken,
  normalizeUserFromPayload,
} from '../lib/authHelpers'
import {
  ellieoAuthorizedFetch,
  ellieoUpstreamFetch,
  getEllieoAccessToken,
  getEllieoBaseUrl,
  getEllieoRefreshToken,
  refreshEllieoAccessToken,
  clearEllieoSession,
} from '../lib/ellieoServer'

export async function GET() {
  const baseUrl = getEllieoBaseUrl()
  let accessToken = await getEllieoAccessToken()
  const refreshToken = await getEllieoRefreshToken()

  if (!baseUrl) {
    return NextResponse.json({
      configured: false,
      connected: false,
      user: null,
    })
  }

  if (!accessToken && refreshToken) {
    accessToken = (await refreshEllieoAccessToken()) || null
  }

  if (!accessToken) {
    return NextResponse.json({
      configured: true,
      connected: false,
      user: null,
    })
  }

  const { res, data } = await ellieoAuthorizedFetch('user/profile', {
    method: 'GET',
  })

  const user =
    (res.ok ? normalizeUserFromPayload(data) : null) ??
    normalizeUserFromAccessToken(accessToken)

  return NextResponse.json({
    configured: true,
    connected: true,
    user,
    profile: res.ok ? data : null,
    ...(res.ok
      ? {}
      : user
        ? { warning: '프로필 정보를 불러오지 못했지만 로그인 상태는 유지됩니다.' }
        : { warning: '로그인은 되었지만 사용자 정보를 확인하지 못했어요.' }),
  })
}

export async function DELETE() {
  const accessToken = await getEllieoAccessToken()
  if (accessToken) {
    await ellieoUpstreamFetch('auth/logout', {
      method: 'POST',
      body: {},
    }).catch(() => null)
  }

  await clearEllieoSession()

  return NextResponse.json({
    connected: false,
  })
}
