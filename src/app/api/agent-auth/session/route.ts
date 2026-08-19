import { NextResponse } from 'next/server'

import {
  clearEllieoSession,
  ellieoAuthorizedFetch,
  ellieoUpstreamFetch,
  getEllieoAccessToken,
  getEllieoBaseUrl,
  getEllieoRefreshToken,
  refreshEllieoAccessToken,
} from '../lib/ellieoServer'
import {
  normalizeUserFromAccessToken,
  normalizeUserFromPayload,
  isUpstreamUnavailable,
} from '../lib/authHelpers'

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

  if (!accessToken && !refreshToken) {
    return NextResponse.json({
      configured: true,
      connected: false,
      user: null,
    })
  }

  const { res, data } = await ellieoAuthorizedFetch('user/profile', {
    method: 'GET',
  })

  if (res.ok) {
    const user = normalizeUserFromPayload(data)
    return NextResponse.json({
      configured: true,
      connected: true,
      user,
      profile: data,
    })
  }

  if (accessToken) {
    const fallbackUser = normalizeUserFromAccessToken(accessToken)
    if (fallbackUser) {
      return NextResponse.json({
        configured: true,
        connected: true,
        user: fallbackUser,
        profile: null,
      })
    }
  }

  if (res.status === 401) {
    return NextResponse.json({
      configured: true,
      connected: false,
      user: null,
    })
  }

  if (isUpstreamUnavailable(res.status)) {
    return NextResponse.json({
      configured: true,
      connected: false,
      user: null,
      error: 'Ellieo 서버에 연결할 수 없어요.',
    })
  }

  return NextResponse.json(
    {
      configured: true,
      connected: false,
      user: null,
      error: '사용자 정보를 불러오지 못했어요.',
    },
    { status: 200 },
  )
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
