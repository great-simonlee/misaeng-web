import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { isValidSchoolDomain, normalizeSchoolDomain } from '@lib/utils/schoolDomain'
import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send'

/**
 * "School not listed" request from the app. The web sends the same mail from the browser
 * (src/lib/api/schoolRegistrationRequest.ts); the app has no browser, so the server sends it through the EmailJS REST API.
 * EmailJS accepts server calls only when "Allow EmailJS API for non-browser applications" is on
 * (set EMAILJS_PRIVATE_KEY if the account requires it). On failure the app falls back to a mail draft.
 * POST { schoolName, emailDomain } → 200 { ok } · 502 when EmailJS refuses.
 */
export async function POST(request: Request) {
  const t = await getRequestT(request)
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('api.common.loginRequired') }, { status: 401 })

  const body = ((await request.json().catch(() => null)) || {}) as { schoolName?: string; emailDomain?: string }
  const schoolName = String(body.schoolName || '').trim()
  const emailDomain = normalizeSchoolDomain(String(body.emailDomain || ''))
  if (schoolName.length < 2) {
    return NextResponse.json({ error: t('me.verification.school.errors.nameRequired') }, { status: 400 })
  }
  if (!isValidSchoolDomain(emailDomain)) {
    return NextResponse.json({ error: t('me.verification.school.errors.invalidDomain') }, { status: 400 })
  }

  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json({ error: t('me.verification.school.errors.registrationFailed') }, { status: 503 })
  }

  const requesterEmail = user.email.trim().toLowerCase()
  const requesterName = user.displayName?.trim() || requesterEmail
  // Same wording as the web request: the mail goes to the Misaeng team, so it stays Korean.
  const message = [
    '[NYC 학교 등록 요청] (앱)',
    '',
    `학교 이름: ${schoolName}`,
    `이메일 도메인: ${emailDomain}`,
    '',
    `요청자: ${requesterName}`,
    `요청자 계정: ${requesterEmail}`,
  ].join('\n')

  try {
    const res = await fetch(EMAILJS_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_2q2yz67',
        template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_ADMIN || 'template_i09sdw',
        user_id: publicKey,
        ...(process.env.EMAILJS_PRIVATE_KEY ? { accessToken: process.env.EMAILJS_PRIVATE_KEY } : {}),
        template_params: { name: requesterName, email: requesterEmail, message },
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error('School registration (EmailJS) failed:', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ error: t('me.verification.school.errors.registrationFailed') }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('School registration (EmailJS) error:', error)
    return NextResponse.json({ error: t('me.verification.school.errors.registrationFailed') }, { status: 502 })
  }
}
