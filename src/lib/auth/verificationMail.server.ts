import { codeEmail, EmailSendError, isEmailConfigured, sendEmail } from '@lib/email/send.server'
import type { Translate } from '@lib/i18n/translate'

import { EmailCodeError, issueEmailCode, verifyEmailCode, type EmailCodePurpose } from './emailCodes.server'

/*
 * School / work email verification codes sent by Misaeng (Supabase mode; Ellieo sent them before).
 * Results use the same { ok, error } shape the verification routes already return.
 */

const COPY = {
  school_email: {
    subject: '[미생] 학교 이메일 인증번호',
    title: '학교 이메일 인증번호',
    line: '미생에서 학교 이메일 인증을 요청했어요. 아래 인증번호를 앱이나 웹에 입력해 주세요.',
  },
  work_email: {
    subject: '[미생] 직장 이메일 인증번호',
    title: '직장 이메일 인증번호',
    line: '미생에서 직장 이메일 인증을 요청했어요. 아래 인증번호를 앱이나 웹에 입력해 주세요.',
  },
} as const

const FOOTER = '인증번호는 10분 동안 쓸 수 있어요. 직접 요청하지 않았다면 이 메일은 무시해 주세요. — 미생 Misaeng'

export async function sendVerificationCode(t: Translate, purpose: EmailCodePurpose, uid: string, email: string) {
  if (!isEmailConfigured()) return { ok: false as const, error: t('auth.emailUnavailable') }
  try {
    const code = await issueEmailCode(purpose, uid, email)
    const copy = COPY[purpose]
    const { html, text } = codeEmail({ title: copy.title, lines: [copy.line], code, footer: FOOTER })
    await sendEmail({ to: email, subject: copy.subject, html, text })
    return { ok: true as const }
  } catch (error) {
    if (error instanceof EmailCodeError) {
      return { ok: false as const, error: t(error.reason === 'cooldown' ? 'auth.codeCooldown' : 'auth.tooManyAttempts') }
    }
    if (error instanceof EmailSendError) {
      console.error('Verification email:', error)
      return { ok: false as const, error: t('auth.emailUnavailable') }
    }
    console.error('Verification code:', error)
    return { ok: false as const, error: t('verification.codeSendFailed') }
  }
}

export async function confirmVerificationCode(t: Translate, purpose: EmailCodePurpose, uid: string, email: string, code: string) {
  try {
    await verifyEmailCode(purpose, uid, email, code)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof EmailCodeError) {
      const key =
        error.reason === 'expired' ? 'auth.codeExpired' : error.reason === 'too_many_attempts' ? 'auth.tooManyAttempts' : 'verification.codeInvalid'
      return { ok: false as const, error: t(key) }
    }
    console.error('Verification code check:', error)
    return { ok: false as const, error: t('verification.codeInvalid') }
  }
}
