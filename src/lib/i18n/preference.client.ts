import type { Locale } from './locales'

/**
 * 로그인한 사용자의 선호 언어를 프로필에 저장한다 (misaeng·ellieo 공통 계정).
 * 로그인하지 않았으면 401로 끝나고, 언어 쿠키만으로 동작한다.
 */
export async function savePreferredLocale(locale: Locale): Promise<boolean> {
  try {
    const response = await fetch('/api/agent-auth/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLocale: locale }),
    })
    return response.ok
  } catch {
    return false
  }
}
