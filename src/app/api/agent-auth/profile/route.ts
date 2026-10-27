import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import { apiErrorMessage } from '@lib/i18n/apiError'
import { parseLocale } from '@lib/i18n/locales'
import { getRequestT } from '@lib/i18n/server'
import {
  getNicknameValidationIssue,
  isProfileGender,
  isProfileOccupationType,
} from '@lib/constants/profile'
import {
  claimNickname,
  NicknameTakenError,
  releaseNickname,
  toNicknameKey,
} from '@lib/supabase/nicknameIndex.server'
import {
  getSupabaseProfile,
  isSupabaseProfileConfigured,
  upsertSupabaseProfile,
  accountSuspendedResponse,
} from '@lib/supabase/profile.server'

type ProfilePatchBody = {
  nickname?: string
  mbti?: string | null
  photoURL?: string
  firstName?: string
  lastName?: string
  gender?: string | null
  occupationType?: string | null
  preferredLocale?: string | null
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

export async function PATCH(request: Request) {
  const t = await getRequestT(request, 'api')
  if (!isSupabaseProfileConfigured()) {
    return NextResponse.json(
      {
        error: t('common.supabaseNotConfiguredDetail'),
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended

  const body = (await request.json()) as ProfilePatchBody
  const patch: Record<string, unknown> = { email: user.email }

  let previousNickname: string | null = null
  let nicknameChanged = false
  if (body.nickname !== undefined) {
    const nickname = asTrimmedString(body.nickname)
    const nicknameIssue = getNicknameValidationIssue(nickname)
    if (nicknameIssue) {
      return NextResponse.json(
        {
          error: t(`profile.nickname.${nicknameIssue.code}`, {
            min: 'min' in nicknameIssue ? nicknameIssue.min : undefined,
            max: 'max' in nicknameIssue ? nicknameIssue.max : undefined,
          }),
        },
        { status: 400 },
      )
    }
    const existing = await getSupabaseProfile(user.uid)
    previousNickname = existing?.nickname?.trim() || null
    nicknameChanged =
      toNicknameKey(previousNickname) !== toNicknameKey(nickname)
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
        { error: t('profile.invalidGender') },
        { status: 400 },
      )
    }
    patch.gender = gender || null
  }
  if (body.occupationType !== undefined) {
    const occupationType = asTrimmedString(body.occupationType).toLowerCase()
    if (occupationType && !isProfileOccupationType(occupationType)) {
      return NextResponse.json(
        { error: t('profile.invalidOccupationType') },
        { status: 400 },
      )
    }
    patch.occupationType = occupationType || null
  }

  if (body.preferredLocale !== undefined) {
    const preferredLocale = parseLocale(asTrimmedString(body.preferredLocale))
    if (body.preferredLocale && !preferredLocale) {
      return NextResponse.json(
        { error: 'Unsupported language.' },
        { status: 400 },
      )
    }
    patch.preferredLocale = preferredLocale
  }

  if (nicknameChanged && typeof patch.nickname === 'string') {
    try {
      await claimNickname(user.uid, patch.nickname)
    } catch (error) {
      if (error instanceof NicknameTakenError) {
        return NextResponse.json(
          { error: t(error.key), code: 'NICKNAME_TAKEN' },
          { status: 409 },
        )
      }
      return NextResponse.json(
        {
          error: apiErrorMessage(t, error, 'profile.nicknameCheckFailed'),
        },
        { status: 500 },
      )
    }
  }

  try {
    // 포인트: 필수 항목이 처음 다 채워지면 프로필 보너스 (전환 후에만 의미가 있어 그 전에는 읽지도 않는다)
    const points = await import('@lib/points/facade.server')
    const pointsActive = await points.isPointsLedgerActive().catch(() => false)
    const before = pointsActive ? await getSupabaseProfile(user.uid).catch(() => null) : null
    const profile = await upsertSupabaseProfile(user.uid, patch)
    if (pointsActive) {
      const { isProfileCompleteForPoints } = await import('@lib/points/account.server')
      if (!isProfileCompleteForPoints(before) && isProfileCompleteForPoints(profile)) {
        await points.onProfileCompleted(user.uid)
      }
    }
    if (nicknameChanged && previousNickname) {
      await releaseNickname(user.uid, previousNickname).catch((error) => {
        console.error('Nickname release error:', error)
      })
    }
    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    if (nicknameChanged && typeof patch.nickname === 'string') {
      await releaseNickname(user.uid, patch.nickname).catch(() => {})
    }
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'profile.saveFailed'),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    const t = await getRequestT(request, 'api')
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }

  const profile = await getSupabaseProfile(user.uid)
  return NextResponse.json({ ok: true, profile })
}
