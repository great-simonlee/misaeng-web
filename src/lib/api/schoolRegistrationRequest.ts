import { send } from '@emailjs/browser'

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

export async function sendSchoolRegistrationRequest(
  input: SchoolRegistrationRequestInput,
) {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
  if (!publicKey) {
    throw new Error(
      '이메일 설정이 필요해요. NEXT_PUBLIC_EMAILJS_PUBLIC_KEY를 확인해 주세요.',
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
