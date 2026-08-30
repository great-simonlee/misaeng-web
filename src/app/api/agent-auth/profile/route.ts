import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import {
  getNicknameValidationError,
  isProfileGender,
  isProfileOccupationType,
} from '@lib/constants/profile'
import {
  getSupabaseProfile,
  isSupabaseProfileConfigured,
  upsertSupabaseProfile,
} from '@lib/supabase/profile.server'

type ProfilePatchBody = {
  nickname?: string
  mbti?: string | null
  photoURL?: string
  firstName?: string
  lastName?: string
  gender?: string | null
  occupationType?: string | null
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

export async function PATCH(request: Request) {
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const body = (await request.json()) as ProfilePatchBody
  const patch: Record<string, unknown> = { email: user.email }

  if (body.nickname !== undefined) {
    const nickname = asTrimmedString(body.nickname)
    const nicknameError = getNicknameValidationError(nickname)
    if (nicknameError) {
      return NextResponse.json({ error: nicknameError }, { status: 400 })
    }
    patch.nickname = nickname
  }
  if (body.mbti !== undefined) {
    const mbti = asTrimmedString(body.mbti).toUpperCase()
    patch.mbti = mbti || null
  }
  if (body.photoURL !== undefined) {
    const photoURL = asTrimmedString(body.photoURL)
    if (photoURL) patch.photoURL = photoURL
  }
  if (body.firstName !== undefined) {
    patch.firstName = asTrimmedString(body.firstName)
  }
  if (body.lastName !== undefined) {
    patch.lastName = asTrimmedString(body.lastName)
  }
  if (body.gender !== undefined) {
    const gender = asTrimmedString(body.gender).toLowerCase()
    if (gender && !isProfileGender(gender)) {
      return NextResponse.json(
        { error: '올바른 성별 값을 선택해 주세요.' },
        { status: 400 },
      )
    }
    patch.gender = gender || null
  }
  if (body.occupationType !== undefined) {
    const occupationType = asTrimmedString(body.occupationType).toLowerCase()
    if (occupationType && !isProfileOccupationType(occupationType)) {
      return NextResponse.json(
        { error: '올바른 직업 유형을 선택해 주세요.' },
        { status: 400 },
      )
    }
    patch.occupationType = occupationType || null
  }

  try {
    const profile = await upsertSupabaseProfile(user.uid, patch)
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '프로필 저장에 실패했어요.',
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const profile = await getSupabaseProfile(user.uid)
  return NextResponse.json({ ok: true, profile })
}
