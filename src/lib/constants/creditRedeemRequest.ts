/** 커뮤니티 크레딧 보상 신청 폼 옵션 */

export const COFFEE_CHAT_MATCH_FOCUSES = [
  {
    id: 'industry',
    label: '관심 분야 현직자',
    description: '특정 업계·직무에서 일하는 사람과 대화',
  },
  {
    id: 'academic',
    label: '석·박·포닥',
    description: '같은 분야 석사·박사·포닥과 대화',
  },
] as const

export type CoffeeChatMatchFocusId =
  (typeof COFFEE_CHAT_MATCH_FOCUSES)[number]['id']

export const COFFEE_CHAT_ACADEMIC_LEVELS = [
  { id: 'masters', label: '석사' },
  { id: 'phd', label: '박사' },
  { id: 'postdoc', label: '포닥' },
] as const

export type CoffeeChatAcademicLevelId =
  (typeof COFFEE_CHAT_ACADEMIC_LEVELS)[number]['id']

export const COFFEE_CHAT_MEETING_FORMATS = [
  { id: 'zoom', label: 'Zoom 콜' },
] as const

export type CoffeeChatMeetingFormatId =
  (typeof COFFEE_CHAT_MEETING_FORMATS)[number]['id']

/** 커피챗은 Zoom 콜로만 진행 */
export const COFFEE_CHAT_DEFAULT_MEETING_FORMAT: CoffeeChatMeetingFormatId =
  'zoom'

export const LAWYER_CONSULT_CATEGORIES = [
  { id: 'cpt', label: 'CPT' },
  { id: 'opt', label: 'OPT' },
  { id: 'stem-opt', label: 'STEM OPT' },
  { id: 'f1', label: 'F-1' },
  { id: 'h1b', label: 'H-1B' },
  { id: 'o1', label: 'O-1' },
  { id: 'green-card', label: '영주권' },
  { id: 'other', label: '기타' },
] as const

export type LawyerConsultCategoryId =
  (typeof LAWYER_CONSULT_CATEGORIES)[number]['id']

export const CREDIT_REDEEM_TOPIC_MAX = 80
export const CREDIT_REDEEM_DETAIL_MAX = 2000

export function isCoffeeChatMatchFocus(
  value: string,
): value is CoffeeChatMatchFocusId {
  return COFFEE_CHAT_MATCH_FOCUSES.some((item) => item.id === value)
}

export function isCoffeeChatAcademicLevel(
  value: string,
): value is CoffeeChatAcademicLevelId {
  return COFFEE_CHAT_ACADEMIC_LEVELS.some((item) => item.id === value)
}

export function isCoffeeChatMeetingFormat(
  value: string,
): value is CoffeeChatMeetingFormatId {
  return COFFEE_CHAT_MEETING_FORMATS.some((item) => item.id === value)
}

export function isLawyerConsultCategory(
  value: string,
): value is LawyerConsultCategoryId {
  return LAWYER_CONSULT_CATEGORIES.some((item) => item.id === value)
}

export function getCoffeeChatMatchFocusLabel(id: CoffeeChatMatchFocusId) {
  return COFFEE_CHAT_MATCH_FOCUSES.find((item) => item.id === id)?.label ?? id
}

export function getLawyerConsultCategoryLabel(id: LawyerConsultCategoryId) {
  return LAWYER_CONSULT_CATEGORIES.find((item) => item.id === id)?.label ?? id
}
