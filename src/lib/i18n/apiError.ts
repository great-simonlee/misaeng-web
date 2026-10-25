import type { Translate, TranslateParams } from './translate'

/**
 * 서버 함수가 던지고 API 라우트가 사용자에게 그대로 보여 주는 오류.
 * message는 개발자용 영어 문구, key는 `api` 네임스페이스의 번역 키 (`community.saveFailed`).
 */
export class ApiMessageError extends Error {
  readonly key: string
  readonly params?: TranslateParams

  constructor(message: string, key: string, params?: TranslateParams) {
    super(message)
    this.name = 'ApiMessageError'
    this.key = key
    this.params = params
  }
}

/**
 * catch한 오류를 응답 문구로 바꾼다.
 * ApiMessageError → 번역, 그 밖의 Error → 원래 message, 나머지 → fallback 번역.
 * `const t = await getRequestT(request, 'api')` 의 t를 넘긴다.
 */
export function apiErrorMessage(
  t: Translate,
  error: unknown,
  fallbackKey: string,
  fallbackParams?: TranslateParams,
): string {
  if (error instanceof ApiMessageError) return t(error.key, error.params)
  if (error instanceof Error) return error.message
  return t(fallbackKey, fallbackParams)
}
