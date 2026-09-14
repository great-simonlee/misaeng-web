import { NextResponse } from 'next/server'

import {
  getAuthErrorMessage,
  resolveAuthenticatedUser,
} from '../lib/authHelpers'
import {
  ellieoAuthorizedFetch,
  getEllieoBaseUrl,
} from '../lib/ellieoServer'
import { WORKPLACE_COMPANY_MAX } from '@lib/constants/workplace'
import { notifyErpWorkplaceVerification } from '@lib/erp/notifyWorkplaceVerification'
import {
  accountSuspendedResponse,
  getSupabaseProfile,
  isSupabaseProfileConfigured,
  upsertSupabaseProfile,
} from '@lib/supabase/profile.server'
import {
  findLatestWorkplaceVerificationByUid,
  isWorkplaceVerificationStorageConfigured,
  saveStoredWorkplaceVerification,
} from '@lib/supabase/workplaceVerification.server'
import { getWorkplaceEmailError, normalizeWorkEmail } from '@lib/utils/workplaceEmail'

type WorkEmailBody = {
  action?: 'send' | 'confirm'
  email?: string
  companyName?: string
  code?: string
}

function normalizeCompanyName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function getCompanyNameError(value: string) {
  if (value.length < 2) return '회사 이름을 입력해 주세요.'
  if (value.length > WORKPLACE_COMPANY_MAX) {
    return `회사 이름은 ${WORKPLACE_COMPANY_MAX}자 이내로 입력해 주세요.`
  }
  return null
}

async function sendViaEllieo(email: string) {
  const { res, data } = await ellieoAuthorizedFetch('auth/verification/code', {
    method: 'POST',
    body: { email },
  })

  if (res.ok) return { ok: true as const }

  return {
    ok: false as const,
    error: getAuthErrorMessage(data, '인증 코드 발송에 실패했어요.'),
  }
}

async function confirmViaEllieo(email: string, code: string) {
  const bodies = [
    { email, code },
    { email, verificationCode: code },
  ]
  let lastError = '인증 코드가 올바르지 않거나 만료되었어요.'

  for (const body of bodies) {
    const { res, data } = await ellieoAuthorizedFetch(
      'auth/verification/verify/code',
      {
        method: 'POST',
        body,
      },
    )
    if (res.ok) return { ok: true as const }
    lastError = getAuthErrorMessage(data, lastError)
  }

  return { ok: false as const, error: lastError }
}

export async function POST(request: Request) {
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        { error: 'APP_CONNECT_API_BASE_URL 환경 변수가 필요해요.' },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }
    const suspended = await accountSuspendedResponse(user.uid)
    if (suspended) return suspended

    if (!isSupabaseProfileConfigured()) {
      return NextResponse.json(
        { error: 'Supabase 설정이 필요해요.' },
        { status: 503 },
      )
    }

    const body = (await request.json()) as WorkEmailBody
    const action = body.action || 'send'
    const email = normalizeWorkEmail(body.email || '')
    const companyName = normalizeCompanyName(body.companyName || '')

    const emailError = getWorkplaceEmailError(email)
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 })
    }
    const companyError = getCompanyNameError(companyName)
    if (companyError) {
      return NextResponse.json({ error: companyError }, { status: 400 })
    }

    const existing = await getSupabaseProfile(user.uid)
    if (existing?.workplaceStatus === 'approved') {
      return NextResponse.json(
        { error: '이미 직장인 인증이 완료되었어요.' },
        { status: 409 },
      )
    }
    if (existing?.workplaceStatus === 'pending') {
      return NextResponse.json(
        { error: '미생 팀에서 직장인 인증을 확인하고 있어요.' },
        { status: 409 },
      )
    }

    if (action === 'send') {
      const result = await sendViaEllieo(email)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'confirm') {
      const code = body.code?.trim()
      if (!code) {
        return NextResponse.json(
          { error: '인증 코드를 입력해 주세요.' },
          { status: 400 },
        )
      }

      const result = await confirmViaEllieo(email, code)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      if (!isWorkplaceVerificationStorageConfigured()) {
        return NextResponse.json(
          { error: '직장인 인증 저장소가 설정되지 않았어요.' },
          { status: 503 },
        )
      }

      const latest = await findLatestWorkplaceVerificationByUid(user.uid)
      if (latest?.status === 'pending') {
        return NextResponse.json(
          { error: '미생 팀에서 직장인 인증을 확인하고 있어요.' },
          { status: 409 },
        )
      }

      const now = Date.now()
      const requestId = `${user.uid}-${now}`
      const savedRequest = await saveStoredWorkplaceVerification({
        id: requestId,
        uid: user.uid,
        userEmail: user.email || existing?.email || '',
        userNickname: existing?.nickname?.trim() || null,
        workEmail: email,
        companyName,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        reviewedByEmail: null,
        reviewedAt: null,
        rejectReason: null,
      })

      const profile = await upsertSupabaseProfile(user.uid, {
        workEmail: email,
        workEmailVerified: true,
        workplaceCompanyName: companyName,
        workplaceStatus: 'pending',
        workplaceRequestId: savedRequest.id,
        workplaceRejectReason: null,
        workplaceReviewedAt: null,
        workplaceReviewedByEmail: null,
      })

      void notifyErpWorkplaceVerification({
        requestId: savedRequest.id,
        companyName,
        workEmail: email,
        userEmail: savedRequest.userEmail,
        userNickname: savedRequest.userNickname,
      })

      return NextResponse.json({ ok: true, profile })
    }

    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : getAuthErrorMessage(null, '직장 이메일 인증 중 오류가 발생했어요.'),
      },
      { status: 500 },
    )
  }
}
