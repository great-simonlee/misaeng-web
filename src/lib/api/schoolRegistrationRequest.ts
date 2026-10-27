import { send } from '@emailjs/browser'

import type { Translate } from '@lib/i18n/translate'

const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_2q2yz67'

const EMAILJS_ADMIN_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_ADMIN || 'template_i09sdw'

export type SchoolRegistrationRequestInput = {
  schoolName: string
  emailDomain: string
  requesterEmail: string
  requesterName?: string | null
}

/** 요청을 서버에 저장한다 (ERP → Misaeng → Schools에서 본다) */
async function storeSchoolRegistrationRequest(schoolName: string, emailDomain: string) {
  const res = await fetch('/api/schools/registration-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolName, emailDomain }),
  })
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
}

/**
 * t는 네임스페이스 없는 번역기(`useT()`). 운영팀에게 가는 메일 본문은 한국어 그대로 둔다.
 * 요청은 서버에 저장하고(ERP 목록) 메일도 보낸다. 둘 중 하나만 되어도 성공으로 본다.
 */
export async function sendSchoolRegistrationRequest(
  input: SchoolRegistrationRequestInput,
  t: Translate,
) {
  const schoolName = input.schoolName.trim()
  const emailDomain = input.emailDomain.trim().toLowerCase()
  const [stored, mailed] = await Promise.allSettled([
    storeSchoolRegistrationRequest(schoolName, emailDomain),
    mailSchoolRegistrationRequest({ ...input, schoolName, emailDomain }, t),
  ])
  if (stored.status === 'fulfilled' || mailed.status === 'fulfilled') return
  throw mailed.reason
}

async function mailSchoolRegistrationRequest(
  input: SchoolRegistrationRequestInput,
  t: Translate,
) {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  if (!publicKey) {
    throw new Error(
      t('me.verification.errors.emailNotConfigured', {
        envVar: 'NEXT_PUBLIC_EMAILJS_PUBLIC_KEY',
      }),
    )
  }

  const schoolName = input.schoolName.trim()
  const emailDomain = input.emailDomain.trim().toLowerCase()
  const requesterEmail = input.requesterEmail.trim().toLowerCase()
  const requesterName = input.requesterName?.trim() || requesterEmail

  const message = [
    '[NYC 학교 등록 요청]',
    '',
    `학교 이름: ${schoolName}`,
    `이메일 도메인: ${emailDomain}`,
    '',
    `요청자: ${requesterName}`,
    `요청자 계정: ${requesterEmail}`,
  ].join('\n')

  await send(
    EMAILJS_SERVICE_ID,
    EMAILJS_ADMIN_TEMPLATE_ID,
    {
      name: requesterName,
      email: requesterEmail,
      message,
    },
    { publicKey },
  )
}
