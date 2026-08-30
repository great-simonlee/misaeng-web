/** 익명게시판 제목 최대 글자 수 */
export const ANONYMOUS_TITLE_MAX = 40

/** 미국 한인 유학생용 익명게시판 주제 */
export const ANONYMOUS_TOPICS = [
  'OPT·CPT·STEM OPT',
  '비자·신분',
  '취업·인턴',
  '주거·룸메',
  '학교생활',
  '학업·수업',
  '재정·세금·보험',
  '인간관계',
  '멘탈·고민',
  '운전·교통',
  '생활팁',
  '중고·나눔',
  '일상',
  '기타',
] as const

export type AnonymousTopic = (typeof ANONYMOUS_TOPICS)[number]

export function isAnonymousTopic(value: string): value is AnonymousTopic {
  return (ANONYMOUS_TOPICS as readonly string[]).includes(value)
}
