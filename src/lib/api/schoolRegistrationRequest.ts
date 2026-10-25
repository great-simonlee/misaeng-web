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

/** t는 네임스페이스 없는 번역기(`useT()`). 운영팀에게 가는 메일 본문은 한국어 그대로 둔다. */
export async function sendSchoolRegistrationRequest(
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
