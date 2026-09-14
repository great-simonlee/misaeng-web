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

export function getWorkplaceEmailError(email: string) {
  const normalized = normalizeWorkEmail(email)
  if (!normalized) return '직장 이메일을 입력해 주세요.'
  if (!isValidEmailFormat(normalized)) {
    return '올바른 이메일 형식을 입력해 주세요.'
  }
  if (isPersonalEmailDomain(getEmailDomain(normalized))) {
    return 'Gmail 등 개인 메일은 사용할 수 없어요. 직장에서 쓰는 이메일을 입력해 주세요.'
  }
  return null
}
