import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import { getNicknameValidationIssue } from '@lib/constants/profile'
import { getRequestT } from '@lib/i18n/server'
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
  const t = await getRequestT(request, 'api')
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      { error: t('common.supabaseNotConfigured') },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const nickname = (searchParams.get('nickname') || '').trim()
  const isGuestScope = searchParams.get('scope') === 'guest'

  if (!isGuestScope) {
    const issue = getNicknameValidationIssue(nickname)
    if (issue) {
      return NextResponse.json({
        available: false,
        error: t(`profile.nickname.${issue.code}`, {
          min: 'min' in issue ? issue.min : undefined,
          max: 'max' in issue ? issue.max : undefined,
        }),
      })
    }
  }

  const user = await resolveAuthenticatedUser()

  try {
    const taken = await isNicknameTakenByOther(nickname, user?.uid)
    return NextResponse.json(
      taken
        ? { available: false, error: t('profile.nicknameTakenShort') }
        : { available: true },
    )
  } catch (error) {
    console.error('Nickname check error:', error)
    return NextResponse.json(
      { error: t('profile.nicknameCheckFailedRetry') },
      { status: 500 },
    )
  }
}
