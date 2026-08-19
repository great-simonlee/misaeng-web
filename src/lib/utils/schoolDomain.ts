/** 이메일에서 도메인만 추출·정규화 (@ 제거, 소문자) */
export function normalizeSchoolDomain(input: string): string {
  const raw = input.trim().toLowerCase().replace(/^@+/, '')
  if (!raw) return ''

  if (raw.includes('@')) {
    return raw.split('@').pop()?.trim() ?? ''
  }

  return raw
}

export function isValidSchoolDomain(domain: string): boolean {
  const normalized = normalizeSchoolDomain(domain)
  if (!normalized) return false
  if (normalized.includes(' ')) return false
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
    normalized,
  )
}
