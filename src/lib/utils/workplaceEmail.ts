import { PERSONAL_EMAIL_DOMAINS } from '@lib/constants/workplace'
import { isValidEmailFormat } from '@lib/utils/verification'

export function normalizeWorkEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getEmailDomain(email: string) {
  const normalized = normalizeWorkEmail(email)
  if (!normalized.includes('@')) return ''
  return normalized.split('@')[1] ?? ''
}

export function isPersonalEmailDomain(domain: string) {
  const value = domain.trim().toLowerCase()
  if (!value) return false
  return PERSONAL_EMAIL_DOMAINS.some(
    (item) => value === item || value.endsWith(`.${item}`),
  )
}

export function isWorkplaceEmail(email: string) {
  const normalized = normalizeWorkEmail(email)
  if (!isValidEmailFormat(normalized)) return false
  return !isPersonalEmailDomain(getEmailDomain(normalized))
}

export type WorkplaceEmailErrorCode = 'required' | 'invalidFormat' | 'personalDomain'

/** 형식 오류 코드. 화면은 `me.verification.workplace.errors.<code>`로 번역한다. */
export function getWorkplaceEmailErrorCode(email: string): WorkplaceEmailErrorCode | null {
  const normalized = normalizeWorkEmail(email)
  if (!normalized) return 'required'
  if (!isValidEmailFormat(normalized)) return 'invalidFormat'
  if (isPersonalEmailDomain(getEmailDomain(normalized))) return 'personalDomain'
  return null
}
