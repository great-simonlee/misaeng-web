/** Misaeng NYC 커뮤니티 크레딧 — 적립·사용·한도·정책 (정수만 사용) */

import type { Translate } from '@lib/i18n/translate'

export type CommunityCreditLedgerKind = 'earn' | 'revoke' | 'spend' | 'restore'

export type CommunityCreditEarnReason =
  | 'food'
  | 'status'
  | 'job-review'
  | 'comment'
  | 'school-verify'
  | 'first-post'
  | 'review-bonus'
  | 'referral'

export type CommunityCreditEntry = {
  id: string
  kind: CommunityCreditLedgerKind
  reason: CommunityCreditEarnReason | 'redeem' | 'other'
  amount: number
  label: string
  /** 게시글·댓글 등 출처 ID (idempotency) */
  sourceId?: string | null
  createdAt: number
}

export type CommunityCreditAccount = {
  uid: string
  balance: number
  entries: CommunityCreditEntry[]
  bonusesClaimed: string[]
  /** 기존 글 기준 소급 적립 완료 시각 */
  backfilledAt: number | null
  updatedAt: number
}

export type CommunityCreditEarnRule = {
  id: string
  amount: number
  boardId?: string
  /** 글당 최대 적립 (타임라인 등 누적형) */
  maxAmount?: number
  /** 지급 단위 설명이 있는지 (`earnRules.<id>.unitLabel`) */
  hasUnitLabel?: boolean
  /** 지급 조건 — 문구 키 `earnRules.<id>.conditions.<key>` */
  conditions: readonly string[]
  /** 지급되지 않는 경우 — 문구 키 `earnRules.<id>.notEligible.<key>` */
  notEligible: readonly string[]
  /** 팁 문구가 있는지 (`earnRules.<id>.tip`) */
  hasTip?: boolean
}

export type CommunityCreditBonusRule = {
  id: string
  amount: number
  once: boolean
}

export type CommunityCreditRedeemOption = {
  /** 문구: credit `redeemOptions.<id>.label` / `.duration` */
  id: string
  cost: number
  /** 포함 범위 — 문구 키 `redeemOptions.<id>.includes.<key>` */
  includes: readonly string[]
  /** 포함되지 않음 — 문구 키 `redeemOptions.<id>.excludes.<key>` */
  excludes: readonly string[]
  /** 월 신청 가능 횟수 */
  monthlyCap: number
  /** 신청 자격 — 문구 키 `redeemOptions.<id>.eligibility.<key>` */
  eligibility: readonly string[]
  comingSoon?: boolean
  /** 안내 문구가 있는지 (`redeemOptions.<id>.note`) */
  hasNote?: boolean
}

/** 문구는 `<그룹>.<id>.title` / `.description` (credit 네임스페이스) */
export type CommunityCreditWorkflowStep = {
  step: number
  id: string
}

export const COMMUNITY_CREDIT_POLICY_VERSION = '2026-08-28'

export const COMMUNITY_CREDIT_FOOD_POST = 5
/** OPT·취업 후기: 타임라인 1단계당 */
export const COMMUNITY_CREDIT_TIMELINE_ENTRY = 10
/** OPT·취업 후기: 자동 적립 글당 최대 */
export const COMMUNITY_CREDIT_TIMELINE_POST_MAX = 30
/** 최종 결과 후기 — 미생 팀 리뷰 승인 시 추가 */
export const COMMUNITY_CREDIT_REVIEW_BONUS = 20
/** 자동 적립 + 리뷰 보너스 합산 상한 */
export const COMMUNITY_CREDIT_POST_TOTAL_MAX =
  COMMUNITY_CREDIT_TIMELINE_POST_MAX + COMMUNITY_CREDIT_REVIEW_BONUS
/** 환산 안내용 — 후기 1편을 자동 최대치로 채웠을 때 */
export const COMMUNITY_CREDIT_PREMIUM_POST = COMMUNITY_CREDIT_TIMELINE_POST_MAX
/** 다른 사람이 내 추천 코드를 사용하면 추천인에게 1명당 */
export const COMMUNITY_CREDIT_REFERRAL_POST = 10
/** 추천 코드로 크레딧을 받을 수 있는 최대 인원 */
export const COMMUNITY_CREDIT_REFERRAL_MAX = 7

/**
 * 화면 문구는 src/messages/<locale>/credit.json에 있고, 여기에는 id·숫자만 둔다.
 * 문구 안의 `{entry}` 같은 자리는 `communityCreditMessageParams()` 값으로 채운다.
 */

/** 문구 키 `principles.<id>.title` / `.body` */
export const COMMUNITY_CREDIT_PRINCIPLES = [
  { id: 'reward' },
  { id: 'notCash' },
  { id: 'cost' },
  { id: 'quality' },
] as const

/** 문구 키 `workflow.<id>.title` / `.description` */
export const COMMUNITY_CREDIT_WORKFLOW: readonly CommunityCreditWorkflowStep[] = [
  { step: 1, id: 'verify' },
  { step: 2, id: 'contribute' },
  { step: 3, id: 'balance' },
  { step: 4, id: 'redeem' },
] as const

/** 문구 키 `redeemProcess.<id>.title` / `.description` */
export const COMMUNITY_CREDIT_REDEEM_PROCESS: readonly CommunityCreditWorkflowStep[] =
  [
    { step: 1, id: 'apply' },
    { step: 2, id: 'review' },
    { step: 3, id: 'match' },
    { step: 4, id: 'session' },
  ] as const

/** 문구 키 `earnRules.<id>.*` */
export const COMMUNITY_CREDIT_EARN_RULES: readonly CommunityCreditEarnRule[] = [
  {
    id: 'food',
    amount: 5,
    boardId: 'food',
    conditions: ['verified', 'requiredFields', 'oncePerPost'],
    notEligible: ['missingFields', 'copied', 'repost'],
    hasTip: true,
  },
  {
    id: 'status',
    amount: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    maxAmount: COMMUNITY_CREDIT_TIMELINE_POST_MAX,
    hasUnitLabel: true,
    boardId: 'status',
    conditions: ['verified', 'type', 'perStep', 'postMax', 'editAdds', 'reviewBonus'],
    notEligible: [
      'missingTimeline',
      'copied',
      'privacy',
      'capReached',
      'noFinalResult',
    ],
    hasTip: true,
  },
  {
    id: 'job-review',
    amount: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    maxAmount: COMMUNITY_CREDIT_TIMELINE_POST_MAX,
    hasUnitLabel: true,
    boardId: 'job-review',
    conditions: ['verified', 'type', 'perStep', 'postMax', 'editAdds', 'reviewBonus'],
    notEligible: [
      'missingFields',
      'falseInfo',
      'anonymous',
      'capReached',
      'noFinalResult',
    ],
  },
  {
    id: 'comment',
    amount: 1,
    conditions: ['verified', 'publicOthers', 'dailyCap'],
    notEligible: ['ownPost', 'deleted', 'spam', 'copyPaste'],
    hasTip: true,
  },
  {
    id: 'referral',
    amount: COMMUNITY_CREDIT_REFERRAL_POST,
    maxAmount: COMMUNITY_CREDIT_REFERRAL_POST * COMMUNITY_CREDIT_REFERRAL_MAX,
    conditions: ['joined', 'perPerson', 'maxPeople', 'noSelf'],
    notEligible: ['self', 'maxReached', 'alreadyLinked'],
    hasTip: true,
  },
] as const

/** 문구 키 `bonusRules.<id>.label` / `.description` */
export const COMMUNITY_CREDIT_BONUS_RULES: readonly CommunityCreditBonusRule[] = [
  { id: 'school-verify', amount: 5, once: true },
  { id: 'first-post', amount: 5, once: true },
] as const

/** 적립 대상이 아닌 활동 — 문구 키 `noEarn.<id>` */
export const COMMUNITY_CREDIT_NO_EARN = [
  'anonymous',
  'otherBoards',
  'editOnly',
  'reactions',
  'adminPosts',
] as const

/** 문구 키 `redeemOptions.<id>.*` */
export const COMMUNITY_CREDIT_REDEEM_OPTIONS: readonly CommunityCreditRedeemOption[] =
  [
    {
      id: 'coffee-chat',
      cost: 120,
      includes: ['meeting', 'questions', 'scheduling'],
      excludes: ['jobGuarantee', 'resumeWriting', 'lawyer'],
      monthlyCap: 1,
      eligibility: ['verified', 'minCredits', 'recentActivity', 'noSanctions'],
      hasNote: true,
    },
    {
      id: 'lawyer-consult',
      cost: 400,
      includes: ['qa', 'procedures', 'followUp'],
      excludes: ['representation', 'paperwork', 'outcome', 'otherLaw'],
      monthlyCap: 1,
      eligibility: ['verified', 'minCredits', 'summary', 'noSanctions'],
      hasNote: true,
    },
    {
      id: 'career-mentor',
      cost: 200,
      includes: ['resume', 'interview', 'advice'],
      excludes: ['applyForYou', 'jobGuarantee', 'lawyer'],
      monthlyCap: 1,
      eligibility: ['verified', 'minCredits'],
      comingSoon: true,
    },
  ] as const

export const COMMUNITY_CREDIT_LIMITS = {
  commentDailyCap: 10,
  coffeeChatMonthlyCap: 1,
  lawyerConsultMonthlyCap: 1,
  careerMentorMonthlyCap: 1,
  noSelfCommentCredit: true,
  revokeOnDelete: true,
  /** 보상 신청 전 최소 활동: 최근 N일 내 1회 이상 */
  recentActivityDays: 90,
  /** 노쇼·당일 취소 시 크레딧 미복구 (운영 정책) */
  noShowForfeit: true,
} as const

/** 문구 키 `revocation.<id>` */
export const COMMUNITY_CREDIT_REVOCATION = [
  'deleted',
  'guidelines',
  'falseInfo',
  'abuse',
] as const

/** 문구 키 `faq.<id>.q` / `.a` */
export const COMMUNITY_CREDIT_FAQ = [
  'cash',
  'comments',
  'delete',
  'noVerify',
  'timeline',
  'sameRestaurant',
  'schedule',
  'lawyerGuarantee',
  'policyChange',
  'when',
] as const

/** 문구 키 `glossary.<id>.term` / `.definition` */
export const COMMUNITY_CREDIT_GLOSSARY = [
  'credit',
  'earn',
  'revoke',
  'reward',
  'dailyCap',
  'timeline',
] as const

/** 크레딧 문구의 숫자 자리(`{entry}`, `{postMax}` …)에 넣는 값 */
export function communityCreditMessageParams(): Record<string, number> {
  return {
    entry: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    postMax: COMMUNITY_CREDIT_TIMELINE_POST_MAX,
    reviewBonus: COMMUNITY_CREDIT_REVIEW_BONUS,
    totalMax: COMMUNITY_CREDIT_POST_TOTAL_MAX,
    referral: COMMUNITY_CREDIT_REFERRAL_POST,
    referralMax: COMMUNITY_CREDIT_REFERRAL_MAX,
    commentCap: COMMUNITY_CREDIT_LIMITS.commentDailyCap,
  }
}

/**
 * 크레딧 내역 한 줄의 표시 이름. `t`는 credit 네임스페이스 번역기 (`useT('credit')`).
 * 보상 사용 등 적립 사유가 아닌 내역은 저장된 label을 그대로 쓴다.
 */
export function communityCreditEntryLabel(
  entry: Pick<CommunityCreditEntry, 'kind' | 'reason' | 'label'>,
  t: Translate,
): string {
  if (entry.reason === 'redeem' || entry.reason === 'other') return entry.label
  const base = t(`ledger.reasons.${entry.reason}`)
  if (entry.kind === 'revoke') return t('ledger.revoke', { label: base })
  if (
    entry.kind === 'earn' &&
    (entry.reason === 'status' || entry.reason === 'job-review')
  ) {
    return t('ledger.timeline', { label: base })
  }
  return base
}

export function foodPostsEquivalent(credits: number): number {
  return Math.ceil(credits / COMMUNITY_CREDIT_FOOD_POST)
}

export function premiumPostsEquivalent(credits: number): number {
  return Math.ceil(credits / COMMUNITY_CREDIT_PREMIUM_POST)
}

export function commentDaysEquivalent(
  credits: number,
  dailyCap = COMMUNITY_CREDIT_LIMITS.commentDailyCap,
): number {
  return Math.ceil(credits / dailyCap)
}

const COFFEE_CHAT_CREDIT_COST = 120
const LAWYER_CREDIT_COST = 400

/**
 * 활동별 적립 효율 (커피챗·이민 변호사 자문 기준).
 * 문구 키 `efficiency.<id>.activity` / `.unit` / `.toCoffeeChat` (count) / `.toLawyer` (count) / `.note`
 */
export const COMMUNITY_CREDIT_EARN_EFFICIENCY = [
  {
    id: 'food',
    amount: COMMUNITY_CREDIT_FOOD_POST,
    toCoffeeChat: foodPostsEquivalent(COFFEE_CHAT_CREDIT_COST),
    toLawyer: foodPostsEquivalent(LAWYER_CREDIT_COST),
  },
  {
    id: 'timeline',
    amount: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    toCoffeeChat: premiumPostsEquivalent(COFFEE_CHAT_CREDIT_COST),
    toLawyer: premiumPostsEquivalent(LAWYER_CREDIT_COST),
  },
  {
    id: 'comment',
    amount: 1,
    toCoffeeChat: commentDaysEquivalent(COFFEE_CHAT_CREDIT_COST),
    toLawyer: commentDaysEquivalent(LAWYER_CREDIT_COST),
  },
] as const
