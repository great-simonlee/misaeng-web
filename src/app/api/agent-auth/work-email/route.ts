import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import type { Locale } from '@lib/i18n/locales'
import { getRequestLocale, getT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'

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
import { getWorkplaceEmailErrorCode, normalizeWorkEmail } from '@lib/utils/workplaceEmail'

type WorkEmailBody = {
  action?: 'send' | 'confirm'
  email?: string
  companyName?: string
  code?: string
}

function normalizeCompanyName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function getCompanyNameError(t: Translate, locale: Locale, value: string) {
  if (value.length < 2) return t('verification.companyNameRequired')
  if (value.length > WORKPLACE_COMPANY_MAX) {
    return t('verification.companyNameTooLong', {
      max: formatNumber(locale, WORKPLACE_COMPANY_MAX),
    })
  }
  return null
}

async function sendViaEllieo(t: Translate, email: string) {
  const { res, data } = await ellieoAuthorizedFetch('auth/verification/code', {
    method: 'POST',
    body: { email },
  })

  if (res.ok) return { ok: true as const }

  return {
    ok: false as const,
    error: getAuthErrorMessage(t, data, t('verification.codeSendFailed')),
  }
}

async function confirmViaEllieo(t: Translate, email: string, code: string) {
  const bodies = [
    { email, code },
    { email, verificationCode: code },
  ]
  let lastError = t('verification.codeInvalid')

  for (const body of bodies) {
    const { res, data } = await ellieoAuthorizedFetch(
      'auth/verification/verify/code',
      {
        method: 'POST',
        body,
      },
    )
    if (res.ok) return { ok: true as const }
    lastError = getAuthErrorMessage(t, data, lastError)
  }

  return { ok: false as const, error: lastError }
}

export async function POST(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  try {
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

    if (!isSupabaseProfileConfigured()) {
      return NextResponse.json(
        { error: t('common.supabaseNotConfigured') },
        { status: 503 },
      )
    }

    const body = (await request.json()) as WorkEmailBody
    const action = body.action || 'send'
    const email = normalizeWorkEmail(body.email || '')
    const companyName = normalizeCompanyName(body.companyName || '')

    const emailErrorCode = getWorkplaceEmailErrorCode(email)
    if (emailErrorCode) {
      return NextResponse.json(
        { error: t(`verification.workEmail.${emailErrorCode}`) },
        { status: 400 },
      )
    }
    const companyError = getCompanyNameError(t, locale, companyName)
    if (companyError) {
      return NextResponse.json({ error: companyError }, { status: 400 })
    }

    const existing = await getSupabaseProfile(user.uid)
    if (existing?.workplaceStatus === 'approved') {
      return NextResponse.json(
        { error: t('verification.workplaceAlreadyApproved') },
        { status: 409 },
      )
    }
    if (existing?.workplaceStatus === 'pending') {
      return NextResponse.json(
        { error: t('verification.workplacePending') },
        { status: 409 },
      )
    }

    if (action === 'send') {
      const result = await sendViaEllieo(t, email)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 })
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

      const result = await confirmViaEllieo(t, email, code)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      if (!isWorkplaceVerificationStorageConfigured()) {
        return NextResponse.json(
          { error: t('verification.workplaceStorageMissing') },
          { status: 503 },
        )
      }

      const latest = await findLatestWorkplaceVerificationByUid(user.uid)
      if (latest?.status === 'pending') {
        return NextResponse.json(
          { error: t('verification.workplacePending') },
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

    return NextResponse.json({ error: t('common.badRequest') }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'verification.workEmailError'),
      },
      { status: 500 },
    )
  }
}
