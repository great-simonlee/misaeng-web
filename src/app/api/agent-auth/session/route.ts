import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import {
  ellieoUpstreamFetch,
  getEllieoAccessToken,
  getEllieoBaseUrl,
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

  if (!baseUrl) {
    return NextResponse.json({
      configured: false,
      connected: false,
      user: null,
    })
  }

  // Ellieo가 확인한 토큰만 로그인으로 본다 (만료 시 리프레시 토큰으로 갱신)
  const user = await resolveAuthenticatedUser()
  if (!user) {
    return NextResponse.json({
      configured: true,
      connected: false,
      user: null,
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
