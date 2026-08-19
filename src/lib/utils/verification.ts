/** 미국 학교(.edu) 이메일인지 판별합니다. */
export function isSchoolEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false

  const domain = normalized.split('@')[1] ?? ''
  if (!domain) return false

  if (domain.endsWith('.edu') || domain.includes('.edu.')) return true

  // .edu가 아니어도 등록된 협력·테스트 도메인 허용
  const allowlist = [
    'misaeng.com',
    'baruchmail.cuny.edu',
    'baruch.cuny.edu',
    'hunter.cuny.edu',
    'qc.cuny.edu',
    'brooklyn.cuny.edu',
    'ccny.cuny.edu',
  ]
  return allowlist.some(
    (d) => domain === d || domain.endsWith(`.${d}`),
  )
}

/** 미국(+1) / 한국(+82) 번호를 E.164로 정규화합니다. */
export function normalizePhoneE164(input: string): string {
  const raw = input.trim()
  if (!raw) throw new Error('휴대폰 번호를 입력해 주세요')

  if (raw.startsWith('+')) {
    const digits = `+${raw.slice(1).replace(/\D/g, '')}`
    if (digits.length < 11) throw new Error('휴대폰 번호 형식이 올바르지 않아요')
    return digits
  }

  const digits = raw.replace(/\D/g, '')

  // 한국 010...
  if (digits.startsWith('010') && digits.length === 11) {
    return `+82${digits.slice(1)}`
  }
  if (digits.startsWith('82') && digits.length >= 11) {
    return `+${digits}`
  }

  // 미국 10자리 / 1+10자리
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  throw new Error('미국(+1) 또는 한국(+82) 번호로 입력해 주세요')
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
