import { NextResponse } from 'next/server'

import { ellieoAuthorizedFetch, getEllieoBaseUrl } from '../lib/ellieoServer'

type ProfilePatchBody = {
  nickname?: string
  mbti?: string | null
}

function normalizeError(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback
  if ('message' in data && typeof data.message === 'string') return data.message
  if ('error' in data && typeof data.error === 'string') return data.error
  return fallback
}

export async function PATCH(request: Request) {
  if (!getEllieoBaseUrl()) {
    return NextResponse.json(
      { error: 'APP_CONNECT_API_BASE_URL 환경 변수가 필요해요.' },
      { status: 503 },
    )
  }

  const body = (await request.json()) as ProfilePatchBody

  const patch: Record<string, unknown> = {}
  if (body.nickname !== undefined) {
    patch.nickname = body.nickname.trim()
  }
  if (body.mbti !== undefined) {
    patch.mbti = body.mbti ? body.mbti.trim().toUpperCase() : null
  }

  const result = await ellieoAuthorizedFetch('user/profile', {
    method: 'PUT',
    body: patch,
  })

  if (!result.res.ok) {
    return NextResponse.json(
      { error: normalizeError(result.data, '프로필 저장에 실패했어요.') },
      { status: result.res.status || 500 },
    )
  }

  const me = await ellieoAuthorizedFetch('user/profile', { method: 'GET' })
  if (!me.res.ok) {
    return NextResponse.json({ ok: true, profile: null })
  }

  const profile =
    me.data && typeof me.data === 'object' && 'data' in me.data
      ? me.data.data
      : me.data

  return NextResponse.json({
    ok: true,
    profile,
  })
}
