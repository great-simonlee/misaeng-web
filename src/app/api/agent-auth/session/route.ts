import { NextResponse } from 'next/server'

import {
  normalizeUserFromAccessToken,
} from '../lib/authHelpers'
import {
  ellieoUpstreamFetch,
  getEllieoAccessToken,
  getEllieoBaseUrl,
  getEllieoRefreshToken,
  refreshEllieoAccessToken,
  clearEllieoSession,
} from '../lib/ellieoServer'
import {
  getLatestSupabaseAvatarUrl,
  isSupabaseStorageConfigured,
} from '@lib/supabase/avatar.server'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

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

  const user = normalizeUserFromAccessToken(accessToken)
  if (!user) {
    return NextResponse.json({
      configured: true,
      connected: false,
      user: null,
      warning: '로그인은 되었지만 사용자 정보를 확인하지 못했어요.',
    })
  }

  let photoURL = user.photoURL ?? null
  let storedProfile = null

  if (isSupabaseStorageConfigured()) {
    storedProfile = await getSupabaseProfile(user.uid).catch(() => null)

    const supabasePhoto = await getLatestSupabaseAvatarUrl({
      uid: user.uid,
      bucket: getSupabaseAvatarBucket(),
    }).catch(() => null)

    photoURL =
      supabasePhoto ?? storedProfile?.photoURL ?? user.photoURL ?? null
  }

  const enrichedUser = photoURL ? { ...user, photoURL } : user

  return NextResponse.json({
    configured: true,
    connected: true,
    user: enrichedUser,
    profile: storedProfile,
    ...(photoURL ? { avatarURL: photoURL } : {}),
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
