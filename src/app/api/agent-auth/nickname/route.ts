import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import { getNicknameValidationError } from '@lib/constants/profile'
import { isSupabaseProfileConfigured } from '@lib/supabase/profile.server'
import { isNicknameTakenByOther } from '@lib/supabase/nicknameIndex.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 닉네임 중복 확인.
 * - `scope=guest`: 가입 없이 남기는 글의 표시명 — 형식 제한 없이 멤버 닉네임과만 비교
 * - 기본: 멤버 닉네임 규칙까지 함께 검사
 */
export async function GET(request: Request) {
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      { error: 'Supabase 설정이 필요해요.' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const nickname = (searchParams.get('nickname') || '').trim()
  const isGuestScope = searchParams.get('scope') === 'guest'

  if (!isGuestScope) {
    const formatError = getNicknameValidationError(nickname)
    if (formatError) {
      return NextResponse.json({ available: false, error: formatError })
    }
  }

  const user = await resolveAuthenticatedUser()

  try {
    const taken = await isNicknameTakenByOther(nickname, user?.uid)
    return NextResponse.json(
      taken
        ? { available: false, error: '이미 사용 중인 닉네임이에요.' }
        : { available: true },
    )
  } catch (error) {
    console.error('Nickname check error:', error)
    return NextResponse.json(
      { error: '닉네임 확인에 실패했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    )
  }
}
