/** 작성 안내 동의 버전. 문구가 바뀌면 올려서 다시 받는다. */
export const WRITE_GUIDELINES_VERSION = '2026-09-13'

/** 커뮤니티 글쓰기 공통 안내 — 화면 문구는 `t('community.guidelines.common.<key>')` */
export const COMMUNITY_WRITING_GUIDELINE_KEYS = [
  'noPersonalInfo',
  'noAbuse',
  'noPrivacyViolation',
  'violationPenalty',
] as const

/** 익명게시판 추가 안내 — 화면 문구는 `t('community.guidelines.anonymous.<key>')` */
export const ANONYMOUS_WRITING_GUIDELINE_KEYS = [
  'noTargeting',
  'stillResponsible',
  'loginRequired',
] as const

/**
 * 커뮤니티 글쓰기 공통 안내 원문 (한국어). 작성 안내 동의 기록(write-consent) 전용 — 저장 값이라 번역하지 않는다.
 * 화면에는 COMMUNITY_WRITING_GUIDELINE_KEYS + 번역을 쓴다.
 */
export const COMMUNITY_WRITING_GUIDELINES = [
  '실명·연락처 등 타인을 특정할 수 있는 정보는 올리지 마세요.',
  '비방·혐오·차별·위협·허위 사실 유포는 금지됩니다.',
  '개인 간 분쟁·사생활 침해·무단 촬영물 공유는 삼가 주세요.',
  '위반 시 글이 삭제되거나 이용이 제한될 수 있어요.',
] as const

/**
 * 익명게시판 추가 안내 원문 (한국어). 작성 안내 동의 기록(write-consent) 전용 — 저장 값이라 번역하지 않는다.
 * 화면에는 ANONYMOUS_WRITING_GUIDELINE_KEYS + 번역을 쓴다.
 */
export const ANONYMOUS_WRITING_GUIDELINES = [
  '익명이어도 특정인을 지칭·암시하는 글이나 뒷담화성 비방은 금지입니다.',
  '작성자 이름·학교·사진은 다른 사람에게 보이지 않지만, 법적·운영상 책임은 그대로예요.',
  '로그인은 글 관리(수정·삭제)를 위해 필요하며, 운영팀이 신고 대응을 위해 확인할 수 있어요.',
] as const
