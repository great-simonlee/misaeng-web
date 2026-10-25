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

/**
 * 주제 값(글에 저장되는 한국어)은 그대로 두고, 화면 표시는 `t('community.anonymousTopics.<key>')`.
 */
const ANONYMOUS_TOPIC_KEYS: Record<AnonymousTopic, string> = {
  'OPT·CPT·STEM OPT': 'opt',
  '비자·신분': 'visa',
  '취업·인턴': 'jobs',
  '주거·룸메': 'housing',
  학교생활: 'campusLife',
  '학업·수업': 'classes',
  '재정·세금·보험': 'finance',
  인간관계: 'relationships',
  '멘탈·고민': 'mentalHealth',
  '운전·교통': 'transportation',
  생활팁: 'lifeTips',
  '중고·나눔': 'secondhand',
  일상: 'daily',
  기타: 'other',
}

/** 주제 번역 키 (`community` 네임스페이스 기준). 목록에 없는 옛 주제는 null → 원래 값을 그대로 보여 준다. */
export function anonymousTopicKey(topic: string): string | null {
  return isAnonymousTopic(topic)
    ? `anonymousTopics.${ANONYMOUS_TOPIC_KEYS[topic]}`
    : null
}

export function isAnonymousTopic(value: string): value is AnonymousTopic {
  return (ANONYMOUS_TOPICS as readonly string[]).includes(value)
}
