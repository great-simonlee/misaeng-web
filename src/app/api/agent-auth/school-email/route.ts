import { NextResponse } from 'next/server'

import { ApiMessageError, apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'

import {
  getAuthErrorMessage,
  resolveAuthenticatedUser,
} from '../lib/authHelpers'
import {
  ellieoAuthorizedFetch,
  getEllieoBaseUrl,
} from '../lib/ellieoServer'
import {
  listVerifiedSchools,
  MAX_VERIFIED_SCHOOLS,
  primarySchoolPatch,
  type VerifiedSchoolEntry,
} from '@lib/verification/verifiedSchools'
import { findSchoolByEmail } from '@lib/constants/schools'
import {
  getSchoolRegistry,
  isBuiltinSchoolEmail,
  resolveManagedSchoolFromEmail,
} from '@lib/supabase/schoolRegistry.server'
import { isSchoolOtpEnabled } from '@lib/constants/verificationSafety'
import {
  getSupabaseProfile,
  isSupabaseProfileConfigured,
  upsertSupabaseProfile,
  accountSuspendedResponse,
} from '@lib/supabase/profile.server'
import { isSchoolEmail } from '@lib/utils/verification'

type SchoolEmailBody = {
  action?: 'send' | 'confirm' | 'primary'
  email?: string
  code?: string
}

async function sendViaEllieo(t: Translate, email: string) {
  const { res, data } = await ellieoAuthorizedFetch(
    'auth/verification/school',
    {
      method: 'POST',
      body: { email },
    },
  )

  if (res.ok) {
    return { ok: true as const }
  }

  const message = getAuthErrorMessage(t, data, t('verification.codeSendFailed'), res.status)
  if (message === t('verification.schoolDomainUnsupported')) {
    return {
      ok: false as const,
      error: t('verification.schoolDomainUnsupported'),
      code: 'SCHOOL_DOMAIN_UNSUPPORTED' as const,
    }
  }

  return { ok: false as const, error: message }
}

async function confirmViaEllieo(t: Translate, email: string, code: string) {
  const bodies = [
    { email, code },
    { email, verificationCode: code },
  ]
  let lastError = t('verification.codeInvalid')

  for (const body of bodies) {
    const { res, data } = await ellieoAuthorizedFetch(
      'auth/verification/school/verify/code',
      {
        method: 'POST',
        body,
      },
    )

    if (res.ok) {
      return { ok: true as const }
    }

    lastError = getAuthErrorMessage(t, data, lastError, res.status)
  }

  return { ok: false as const, error: lastError }
}

/*
 * 인증 코드 경로. Ellieo의 학교 엔드포인트(auth/verification/school…)는 기본 목록의 도메인만 안다.
 * ERP에서만 더한 학교 도메인은 Ellieo의 일반 코드 엔드포인트(auth/verification/code, 직장 인증과 같음)로
 * 보내고 확인한다. 보내기·확인 모두 도메인으로 같은 경로를 고른다:
 *  - 기본 목록 도메인 → 'school'
 *  - ERP 목록(사용 중)에만 있는 도메인 → 'generic'
 *  - 둘 다 아님(.edu 등) → 'school' (Ellieo가 판단, 모르면 SCHOOL_DOMAIN_UNSUPPORTED)
 * 'school'로 보냈는데 Ellieo가 도메인을 거절하고 ERP 목록에 있으면 'generic'으로 다시 보낸다.
 * 그래서 확인도 'school'이 실패하고 ERP 목록에 있으면 'generic'으로 한 번 더 확인한다.
 */
type OtpPath = 'school' | 'generic'

function otpPathFor(email: string, managed: boolean): OtpPath {
  if (isBuiltinSchoolEmail(email)) return 'school'
  return managed ? 'generic' : 'school'
}

async function sendViaGenericCode(t: Translate, email: string) {
  const { res, data } = await ellieoAuthorizedFetch('auth/verification/code', {
    method: 'POST',
    body: { email },
  })
  if (res.ok) return { ok: true as const }
  return {
    ok: false as const,
    error: getAuthErrorMessage(t, data, t('verification.codeSendFailed'), res.status),
  }
}

async function confirmViaGenericCode(t: Translate, email: string, code: string) {
  const bodies = [
    { email, code },
    { email, verificationCode: code },
  ]
  let lastError = t('verification.codeInvalid')
  for (const body of bodies) {
    const { res, data } = await ellieoAuthorizedFetch('auth/verification/verify/code', {
      method: 'POST',
      body,
    })
    if (res.ok) return { ok: true as const }
    lastError = getAuthErrorMessage(t, data, lastError, res.status)
  }
  return { ok: false as const, error: lastError }
}

async function sendSchoolCode(t: Translate, email: string, managed: boolean) {
  if (otpPathFor(email, managed) === 'generic') return sendViaGenericCode(t, email)
  const result = await sendViaEllieo(t, email)
  if (!result.ok && result.code === 'SCHOOL_DOMAIN_UNSUPPORTED' && managed) {
    return sendViaGenericCode(t, email)
  }
  return result
}

async function confirmSchoolCode(t: Translate, email: string, code: string, managed: boolean) {
  if (otpPathFor(email, managed) === 'generic') return confirmViaGenericCode(t, email, code)
  const result = await confirmViaEllieo(t, email, code)
  if (!result.ok && managed) {
    const generic = await confirmViaGenericCode(t, email, code)
    if (generic.ok) return generic
  }
  return result
}

/** 학교를 목록에 더한다 (최대 MAX_VERIFIED_SCHOOLS). 첫 학교면 대표 학교가 되고, 아니면 대표 학교는 그대로 둔다. */
async function markSchoolVerified(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const school = await resolveManagedSchoolFromEmail(normalizedEmail)
  const domain = normalizedEmail.split('@')[1] ?? ''

  if (!isSupabaseProfileConfigured()) {
    throw new ApiMessageError('Supabase is not configured.', 'common.supabaseNotConfigured')
  }

  const existing = await getSupabaseProfile(uid)
  const entry: VerifiedSchoolEntry = {
    id: school?.id ?? null,
    name: school?.fullName ?? domain,
    email: normalizedEmail,
    verifiedAt: Date.now(),
  }
  const current = listVerifiedSchools(existing)
  const schools = [...current.filter((item) => item.email !== normalizedEmail), entry].slice(
    -MAX_VERIFIED_SCHOOLS,
  )
  const primary = current[0] && current[0].email !== normalizedEmail ? current[0] : entry

  const profile = await upsertSupabaseProfile(uid, {
    ...primarySchoolPatch(primary),
    verifiedSchools: [primary, ...schools.filter((item) => item.email !== primary.email)],
  })

  return {
    profile,
    schoolName: entry.name,
    schoolId: entry.id,
    isPrimary: primary.email === normalizedEmail,
  }
}

/** 다른 학교를 더 인증할 수 있는지 (같은 메일 재인증, 3개 초과를 코드 보내기 전에 막는다) */
async function schoolLimitError(t: Translate, uid: string, email: string) {
  const schools = listVerifiedSchools(await getSupabaseProfile(uid))
  if (schools.some((item) => item.email === email)) return t('verification.schoolAlreadyVerified')
  if (schools.length >= MAX_VERIFIED_SCHOOLS) {
    return t('verification.schoolLimitReached', { max: MAX_VERIFIED_SCHOOLS })
  }
  return null
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    if (!isSchoolOtpEnabled()) {
      return NextResponse.json(
        { error: t('verification.schoolOtpDisabled') },
        { status: 503 },
      )
    }

    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        { error: t('auth.appConnectMissing') },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    }
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended

    const body = (await request.json()) as SchoolEmailBody
    const action = body.action || 'send'
    const email = body.email?.trim().toLowerCase()

    // 대표 학교 바꾸기: 이미 인증한 학교 중 하나를 고른다 (글 배지·학교 게시판에 쓰는 학교)
    if (action === 'primary') {
      const profile = await getSupabaseProfile(user.uid)
      const schools = listVerifiedSchools(profile)
      const target = schools.find((item) => item.email === email)
      if (!target) {
        return NextResponse.json({ error: t('verification.schoolNotVerified') }, { status: 404 })
      }
      const saved = await upsertSupabaseProfile(user.uid, {
        ...primarySchoolPatch(target),
        verifiedSchools: [target, ...schools.filter((item) => item.email !== target.email)],
      })
      return NextResponse.json({ ok: true, schools: listVerifiedSchools(saved), profile: saved })
    }

    // ERP 학교 목록 (60초 캐시). 사용 중지된 학교의 도메인은 새 인증을 받지 않는다.
    const registry = await getSchoolRegistry()
    const managedSchool = email ? findSchoolByEmail(email, registry.filter((item) => item.enabled)) : null
    const disabledSchool =
      email && !managedSchool ? findSchoolByEmail(email, registry.filter((item) => !item.enabled)) : null
    if (disabledSchool) {
      return NextResponse.json(
        { error: t('verification.schoolDomainUnsupported'), code: 'SCHOOL_DOMAIN_UNSUPPORTED' },
        { status: 400 },
      )
    }

    if (!email || (!isSchoolEmail(email) && !managedSchool)) {
      return NextResponse.json(
        { error: t('verification.schoolEmailRequired') },
        { status: 400 },
      )
    }

    if (action === 'send') {
      const limitError = await schoolLimitError(t, user.uid, email)
      if (limitError) return NextResponse.json({ error: limitError }, { status: 409 })
      const result = await sendSchoolCode(t, email, Boolean(managedSchool))
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            ...('code' in result && result.code ? { code: result.code } : {}),
          },
          { status: 502 },
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (action === 'confirm') {
      const code = body.code?.trim()
      if (!code) {
        return NextResponse.json(
          { error: t('verification.codeRequired') },
          { status: 400 },
        )
      }

      const result = await confirmSchoolCode(t, email, code, Boolean(managedSchool))
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      const verified = await markSchoolVerified(user.uid, email)

      try {
        // 포인트: 전환 전 = 학교 인증 보너스(기존 크레딧), 후 = 웰컴·추천·프로필 보너스 (src/lib/points/WIRING.md)
        const { onVerificationCompleted } = await import('@lib/points/facade.server')
        await onVerificationCompleted(user.uid, 'school_email', email)
      } catch (creditError) {
        console.error('Community credit award (school) error:', creditError)
      }

      return NextResponse.json({
        ok: true,
        schoolName: verified.schoolName,
        schoolId: verified.schoolId,
        isPrimary: verified.isPrimary,
        schools: listVerifiedSchools(verified.profile),
        profile: verified.profile,
      })
    }

    return NextResponse.json({ error: t('common.badRequest') }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'verification.schoolEmailError'),
      },
      { status: 500 },
    )
  }
}
