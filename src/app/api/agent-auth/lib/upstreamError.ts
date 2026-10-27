import type { Translate } from '@lib/i18n/translate'

/**
 * Ellieo는 영어 오류 문구만 보낸다. 사용자에게는 그대로 보여 주지 않고
 * 아래 패턴으로 `api` 번역 키를 찾아 바꾼다. 위에서부터 먼저 맞는 것이 이긴다.
 * 모르는 문구는 호출한 쪽의 fallback을 쓰고, 원문은 서버 로그에만 남긴다.
 */
const UPSTREAM_ERROR_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid school email domain/i, 'verification.schoolDomainUnsupported'],
  [
    /invalid (email or password|credentials|login)|(incorrect|wrong|invalid) password|password (is )?(incorrect|invalid|wrong)/i,
    'auth.invalidCredentials',
  ],
  [/(user|account|email) (was )?(not found|does ?n[o']t exist)|no (such )?(user|account)/i, 'auth.accountNotFound'],
  [/already (exists|registered|in use|taken|used)|duplicate|email (is )?taken/i, 'auth.emailInUse'],
  [/too many|rate.?limit|try again later/i, 'auth.tooManyAttempts'],
  [/password.*(at least|too short|minimum|min(imum)? length|characters)/i, 'auth.weakPassword'],
  [/(invalid|valid) email|email.*(invalid|format)/i, 'auth.invalidEmail'],
  [/(invalid|incorrect|expired|wrong).*code|code.*(invalid|incorrect|expired|wrong)/i, 'verification.codeInvalid'],
  [/(disabled|suspended|blocked|banned|deactivated)/i, 'auth.accountDisabled'],
  [/(token|session).*(expired|invalid)|jwt|unauthori[sz]ed/i, 'auth.sessionExpired'],
]

export function upstreamErrorText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  if ('message' in data && typeof data.message === 'string') return data.message
  if ('error' in data && typeof data.error === 'string') return data.error
  return null
}

/** Ellieo 응답을 번역 키로. 못 찾으면 null */
export function upstreamErrorKey(data: unknown, status?: number): string | null {
  if (status === 429) return 'auth.tooManyAttempts'
  if (status !== undefined && status >= 500) return 'auth.ellieoUnavailable'
  if (data && typeof data === 'object' && 'raw' in data && typeof data.raw === 'string' && data.raw.includes('502')) {
    return 'auth.ellieoUnavailable'
  }
  const text = upstreamErrorText(data)
  if (!text) return null
  return UPSTREAM_ERROR_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

/** 업스트림 응답의 오류 문구. t는 `getRequestT(request, 'api')` */
export function getAuthErrorMessage(t: Translate, data: unknown, fallback: string, status?: number) {
  const key = upstreamErrorKey(data, status)
  if (key) return t(key)
  const text = upstreamErrorText(data)
  if (text) console.warn('[ellieo] unmapped error message:', status ?? '-', text)
  return fallback
}
