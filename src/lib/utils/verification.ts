import { getRegisteredSchoolDomains } from '@lib/constants/schools'
import type { Translate } from '@lib/i18n/translate'

/** 미국 학교(.edu) 또는 등록된 학교 도메인 이메일인지 판별합니다. */
export function isSchoolEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false

  const domain = normalized.split('@')[1] ?? ''
  if (!domain) return false

  if (domain.endsWith('.edu') || domain.includes('.edu.')) return true

  const registered = getRegisteredSchoolDomains()
  return registered.some(
    (d) => domain === d || domain.endsWith(`.${d}`),
  )
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())
}

/**
 * 미국(+1) / 한국(+82) 번호를 E.164로 정규화합니다.
 * t는 네임스페이스 없는 번역기(`useT()`) — 오류 문구용.
 */
export function normalizePhoneE164(input: string, t: Translate): string {
  const raw = input.trim()
  if (!raw) throw new Error(t('me.verification.phone.errors.required'))

  if (raw.startsWith('+')) {
    const digits = `+${raw.slice(1).replace(/\D/g, '')}`
    if (digits.length < 11) throw new Error(t('me.verification.phone.errors.invalidFormat'))
    return digits
  }

  const digits = raw.replace(/\D/g, '')

  if (digits.startsWith('010') && digits.length === 11) {
    return `+82${digits.slice(1)}`
  }
  if (digits.startsWith('82') && digits.length >= 11) {
    return `+${digits}`
  }

  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  throw new Error(t('me.verification.phone.errors.unsupportedCountry'))
}

export function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith('+1') && e164.length === 12) {
    const n = e164.slice(2)
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`
  }
  if (e164.startsWith('+82')) {
    const n = e164.slice(3)
    if (n.length === 10) {
      return `+82 ${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6)}`
    }
  }
  return e164
}
