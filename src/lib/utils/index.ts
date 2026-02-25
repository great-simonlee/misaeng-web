/**
 * 순수 유틸 함수
 * - cn: Tailwind 클래스 병합
 * - format: 날짜/숫자/문자 포맷 (formatDate, formatNumber 등)
 * - validation: 문자열/폼 검증 헬퍼
 */

export function cn(
  ...inputs: (string | undefined | false | null)[]
): string {
  return inputs.filter(Boolean).join(' ')
}
