/** Misaeng NYC 커뮤니티 크레딧 — 적립·사용·한도·정책 (정수만 사용) */

export type CommunityCreditLedgerKind = 'earn' | 'revoke' | 'spend' | 'restore'

export type CommunityCreditEarnReason =
  | 'food'
  | 'status'
  | 'job-review'
  | 'comment'
  | 'school-verify'
  | 'first-post'
  | 'review-bonus'

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
  label: string
  amount: number
  description: string
  boardId?: string
  /** 글당 최대 적립 (타임라인 등 누적형) */
  maxAmount?: number
  /** 지급 단위 설명 (예: 타임라인 1단계) */
  unitLabel?: string
  /** 지급 조건 */
  conditions: string[]
  /** 지급되지 않는 경우 */
  notEligible: string[]
  tip?: string
}

export type CommunityCreditBonusRule = {
  id: string
  label: string
  amount: number
  description: string
  once: boolean
}

export type CommunityCreditRedeemOption = {
  id: string
  label: string
  cost: number
  duration: string
  description: string
  /** 포함 범위 */
  includes: string[]
  /** 포함되지 않음 */
  excludes: string[]
  /** 월 신청 가능 횟수 */
  monthlyCap: number
  /** 신청 자격 */
  eligibility: string[]
  comingSoon?: boolean
  note?: string
}

export type CommunityCreditWorkflowStep = {
  step: number
  title: string
  description: string
}

export type CommunityCreditFaqItem = {
  q: string
  a: string
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

export const COMMUNITY_CREDIT_PRINCIPLES = [
  {
    title: '기여에 대한 보상',
    body: '맛집·비자·취업 후기처럼 다른 사람에게 도움이 되는 글과 댓글이 쌓일수록 크레딧이 올라갑니다.',
  },
  {
    title: '현금이 아닌 접점',
    body: '크레딧은 돈으로 바꿀 수 없습니다. 대신 현업 선배·전문가와 만날 기회로 교환합니다.',
  },
  {
    title: '운영 비용 반영',
    body: '커피챗·이민 변호사 자문은 미생이 전문가 시간과 매칭 비용을 부담합니다. 사용 문턱은 적립보다 높게 설계했습니다.',
  },
  {
    title: '품질 우선',
    body: '양만 늘리는 스팸·중복·허위 글은 적립되지 않거나 회수될 수 있습니다.',
  },
] as const

export const COMMUNITY_CREDIT_WORKFLOW: readonly CommunityCreditWorkflowStep[] = [
  {
    step: 1,
    title: '학교 인증',
    description:
      '마이페이지에서 학교 이메일 인증을 완료합니다. 인증 후에만 글·댓글 작성과 크레딧 적립이 가능합니다.',
  },
  {
    step: 2,
    title: '커뮤니티 기여',
    description:
      '맛집·OPT·취업 후기를 쓰거나, 다른 사람 글에 댓글을 남깁니다. 조건을 충족하면 크레딧이 자동 적립됩니다.',
  },
  {
    step: 3,
    title: '잔액 확인',
    description:
      '마이페이지에서 누적 크레딧과 적립 내역을 확인합니다. 삭제·제재 시 회수 내역도 함께 표시됩니다.',
  },
  {
    step: 4,
    title: '보상 신청',
    description:
      '원하는 보상의 필요 크레딧을 충족하면 신청합니다. 매칭·일정 조율 후 세션이 진행됩니다.',
  },
] as const

export const COMMUNITY_CREDIT_REDEEM_PROCESS: readonly CommunityCreditWorkflowStep[] =
  [
    {
      step: 1,
      title: '신청',
      description:
        '마이페이지 또는 보상 신청 페이지에서 희망 프로그램을 선택하고, 관심 분야·질문 요약을 제출합니다.',
    },
    {
      step: 2,
      title: '검토·차감',
      description:
        '자격·잔액·월 한도를 확인한 뒤 크레딧이 차감됩니다. 일정 조율이 필요한 경우 이메일로 연락드립니다.',
    },
    {
      step: 3,
      title: '매칭',
      description:
        '미생이 파트너·멘토·전문가 풀에서 적합한 분을 연결합니다. 매칭 실패 시 크레딧은 복구됩니다.',
    },
    {
      step: 4,
      title: '세션 진행',
      description:
        '약속된 시간에 Zoom으로 진행합니다. 노쇼·당일 취소 등은 정책에 따라 크레딧이 반환되지 않을 수 있습니다.',
    },
  ] as const

export const COMMUNITY_CREDIT_EARN_RULES: readonly CommunityCreditEarnRule[] = [
  {
    id: 'food',
    label: '맛집 후기',
    amount: 5,
    boardId: 'food',
    description:
      '사진·위치·메뉴·금액 등 필수 항목을 갖춘 맛집 후기를 등록했을 때 지급됩니다.',
    conditions: [
      '학교 이메일 인증 완료',
      '음식점 위치·이름·카테고리·메뉴·사진 등 필수 필드 입력',
      '최초 등록 시 1회 지급 (동일 글 수정만으로는 추가 지급 없음)',
    ],
    notEligible: [
      '필수 항목 누락·placeholder 수준의 내용',
      '타인 글 복사·중복 등록',
      '삭제 후 동일 내용 재등록 (부정 이용)',
    ],
    tip: '사진과 구체적인 메뉴·웨이팅 정보가 있을수록 다른 유학생에게 도움이 됩니다.',
  },
  {
    id: 'status',
    label: 'OPT·비자·영주권 후기',
    amount: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    maxAmount: COMMUNITY_CREDIT_TIMELINE_POST_MAX,
    unitLabel: '타임라인 1단계',
    boardId: 'status',
    description: `타임라인 1단계당 ${COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧(글당 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX}). 최종 결과가 담긴 후기는 미생 팀 리뷰 후 추가 ${COMMUNITY_CREDIT_REVIEW_BONUS}까지 받을 수 있어요(합산 최대 ${COMMUNITY_CREDIT_POST_TOTAL_MAX}).`,
    conditions: [
      '학교 이메일 인증 완료',
      'CPT/OPT/STEM OPT/비자/영주권 유형 선택',
      `타임라인 단계 1개당 ${COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧`,
      `자동 적립 글당 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX} 크레딧`,
      '글을 수정해 타임라인을 추가하면 추가 적립 (상한까지)',
      `최종 결과 기록 후 「추가 크레딧 요청」→ 팀 승인 시 +${COMMUNITY_CREDIT_REVIEW_BONUS}`,
    ],
    notEligible: [
      '타임라인·유형 미입력',
      '타인 후기 무단 복사',
      '개인 식별 정보 과다 노출로 삭제된 글',
      '이미 글당 자동 상한에 도달한 경우 (추가 단계는 미지급)',
      '최종 결과 없이 리뷰 보너스만 요청하는 경우',
    ],
    tip: '최종 결과(승인·카드 수령 등)까지 적으면 팀 리뷰 보너스를 요청할 수 있습니다.',
  },
  {
    id: 'job-review',
    label: '취업 후기',
    amount: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    maxAmount: COMMUNITY_CREDIT_TIMELINE_POST_MAX,
    unitLabel: '타임라인 1단계',
    boardId: 'job-review',
    description: `채용 단계(타임라인) 1개당 ${COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧(글당 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX}). Offer·최종 결과까지 적으면 미생 팀 리뷰 후 추가 ${COMMUNITY_CREDIT_REVIEW_BONUS}까지(합산 최대 ${COMMUNITY_CREDIT_POST_TOTAL_MAX}).`,
    conditions: [
      '학교 이메일 인증 완료',
      '인턴/신입/경력/계약 유형 선택',
      `타임라인 단계 1개당 ${COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧`,
      `자동 적립 글당 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX} 크레딧`,
      '글을 수정해 타임라인을 추가하면 추가 적립 (상한까지)',
      `최종 결과 기록 후 「추가 크레딧 요청」→ 팀 승인 시 +${COMMUNITY_CREDIT_REVIEW_BONUS}`,
    ],
    notEligible: [
      '필수 단계·유형 미입력',
      '허위 회사명·과장 정보',
      '익명게시판 글 (해당 보드 제외)',
      '이미 글당 자동 상한에 도달한 경우',
      '최종 결과 없이 리뷰 보너스만 요청하는 경우',
    ],
  },
  {
    id: 'comment',
    label: '댓글·답글',
    amount: 1,
    description: '다른 사람 게시글에 남긴 댓글 또는 답글 1개당 1 크레딧.',
    conditions: [
      '학교 이메일 인증 완료',
      '공개 상태인 타인 게시글·댓글에 작성',
      '1일 최대 10 크레딧까지 적립',
    ],
    notEligible: [
      '본인이 작성한 글·댓글에 단 답글',
      '삭제된 댓글',
      '스팸·욕설·무의미한 반복 문자',
      '동일 문장 복붙 도배',
    ],
    tip: '질문에 답하거나 경험을 덧붙이는 댓글이 커뮤니티에 더 도움이 됩니다.',
  },
] as const

export const COMMUNITY_CREDIT_BONUS_RULES: readonly CommunityCreditBonusRule[] = [
  {
    id: 'school-verify',
    label: '학교 이메일 인증',
    amount: 5,
    once: true,
    description: '마이페이지에서 .edu 등 학교 메일 인증을 최초 완료했을 때 1회.',
  },
  {
    id: 'first-post',
    label: '첫 커뮤니티 글',
    amount: 5,
    once: true,
    description:
      '맛집·OPT·취업 후기 등 크레딧 대상 게시판에 처음 올린 글 1회 (조건 충족 시).',
  },
] as const

/** 적립 대상이 아닌 활동 */
export const COMMUNITY_CREDIT_NO_EARN = [
  '익명게시판 글·댓글 (익명성 유지를 위해 크레딧 미지급)',
  '룸메이트·서블렛, 중고거래 등 기타 게시판 (추후 확대 가능)',
  '글 수정·메타데이터만 변경',
  '좋아요·추천·공유 등 반응만 남긴 경우',
  '하우징 팀·운영자 계정의 관리용 게시물',
] as const

export const COMMUNITY_CREDIT_REDEEM_OPTIONS: readonly CommunityCreditRedeemOption[] =
  [
    {
      id: 'coffee-chat',
      label: '관심 분야 커피챗',
      cost: 120,
      duration: '약 30분',
      description:
        '관심 업계·직무에서 일하거나 공부하는 선배·동료와 Zoom 1:1 대화. 진로·업계 culture·뉴욕 생활 팁 등을 나눕니다.',
      includes: [
        '1:1 Zoom 콜 (약 30분)',
        '사전 질문 3–5개 검토 후 대화',
        '미생 운영진의 일정·매칭 조율',
      ],
      excludes: [
        '채용 보장·내부 추천 약속',
        '이력서·포트폴리오 대행 작성',
        '이민 변호사 자문 (별도 프로그램 이용)',
      ],
      monthlyCap: 1,
      eligibility: [
        '학교 이메일 인증 완료',
        '누적 크레딧 120 이상',
        '최근 90일 내 커뮤니티 활동 1회 이상',
        '계정 제재 이력 없음',
      ],
      note: '멘토는 자원봉사·파트너십 형태로 참여하며, 미생이 매칭·운영 비용을 부담합니다.',
    },
    {
      id: 'lawyer-consult',
      label: '이민 변호사 자문',
      cost: 400,
      duration: '약 30분',
      description:
        'F-1·OPT·H-1B·영주권 등 미국 이민·비자 관련 질문에 대한 이민 변호사 Zoom 30분 Q&A 세션입니다.',
      includes: [
        '이민 변호사 Zoom 30분 Q&A',
        '비자·신분·영주권 관련 일반 절차·개념 안내',
        '후속 대리 필요 시 별도 안내',
      ],
      excludes: [
        '개별 사건 대리·소송 수행',
        '서류 작성·제출 대행',
        '특정 결과(승인·신분 변경 등) 보장',
        '이민 외 일반 법률·형사·민사 자문',
      ],
      monthlyCap: 1,
      eligibility: [
        '학교 이메일 인증 완료',
        '누적 크레딧 400 이상',
        '신청 시 이민·비자 관련 질문 주제·배경 요약 제출',
        '계정 제재 이력 없음',
      ],
      note: '이민 자문은 정보 제공 목적이며, 변호사-의뢰인 관계는 별도 계약이 필요할 수 있습니다.',
    },
    {
      id: 'career-mentor',
      label: '커리어 멘토링',
      cost: 200,
      duration: '약 30분',
      description:
        '이력서·면접·업계 전환 등 커리어 관련 멘토링. 현업 멘토 매칭 비용이 반영됩니다.',
      includes: [
        '이력서·LinkedIn 피드백 (사전 제출 시)',
        '면접·네트워킹 전략 Q&A',
        '업계별 현실적인 조언',
      ],
      excludes: ['대행 지원', '채용 연결 보장', '이민 변호사 자문'],
      monthlyCap: 1,
      eligibility: [
        '학교 이메일 인증 완료',
        '누적 크레딧 200 이상',
      ],
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

export const COMMUNITY_CREDIT_REVOCATION = [
  '작성자가 글·댓글을 삭제한 경우 해당 적립분 회수',
  '커뮤니티 가이드라인 위반으로 숨김·삭제된 콘텐츠',
  '허위 정보·스팸으로 확인된 경우 (과거 적립분 소급 회수 가능)',
  '부정 이용(다중 계정, 조작) 적발 시 계정 정지 및 잔액 몰수',
] as const

export const COMMUNITY_CREDIT_FAQ: readonly CommunityCreditFaqItem[] = [
  {
    q: '크레딧을 현금으로 바꿀 수 있나요?',
    a: '아니요. 커뮤니티 크레딧은 현금·환급·양도·판매·타인 계정 이전이 불가능합니다. Misaeng NYC가 정한 보상 프로그램에만 사용할 수 있습니다.',
  },
  {
    q: '댓글만 많이 달아도 금방 쌓이나요?',
    a: `댓글·답글은 1개당 1 크레딧이지만 하루 최대 ${COMMUNITY_CREDIT_LIMITS.commentDailyCap} 크레딧까지만 적립됩니다. 본인 글에 단 댓글은 적립되지 않습니다. 커피챗(120)만 해도 최소 12일, 이민 변호사 자문(400)은 댓글만으로는 40일(상한 기준)이 필요해 후기 작성이 더 효율적입니다.`,
  },
  {
    q: '글을 삭제하면 크레딧도 사라지나요?',
    a: '네. 삭제·신고·제재로 숨겨진 콘텐츠에 대해 지급된 크레딧은 회수될 수 있습니다. 이미 사용한 크레딧까지 소급 회수가 필요한 경우 마이너스 잔액이 될 수 있습니다.',
  },
  {
    q: '학교 인증 없이도 쌓을 수 있나요?',
    a: '아니요. 글·댓글 작성과 적립 모두 학교 이메일 인증이 필요합니다. 인증 완료 시 1회 5 크레딧 보너스가 있습니다.',
  },
  {
    q: 'OPT·취업 후기는 글마다 한 번만 받나요?',
    a: `아니요. 타임라인 단계 1개당 ${COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧이 자동 지급되며, 한 글당 자동 적립은 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX}까지입니다. 최종 결과까지 적고 「추가 크레딧 요청」을 하면 미생 팀이 리뷰한 뒤 승인 시 ${COMMUNITY_CREDIT_REVIEW_BONUS}가 더해져 합산 최대 ${COMMUNITY_CREDIT_POST_TOTAL_MAX}까지 받을 수 있습니다.`,
  },
  {
    q: '같은 맛집에 두 번 글 쓰면 두 번 받나요?',
    a: '서로 다른 글이면 각각 1회씩 지급될 수 있지만, 중복·복사·도배로 판단되면 지급되지 않거나 회수됩니다.',
  },
  {
    q: '보상 신청 후 일정이 안 맞으면?',
    a: '매칭 전 취소는 크레딧 전액 복구를 원칙으로 합니다. 확정 후 당일 취소·노쇼는 크레딧이 반환되지 않을 수 있습니다.',
  },
  {
    q: '이민 변호사 자문에서 비자 승인·신분 변경을 보장하나요?',
    a: '아니요. 이민·비자 관련 일반 정보·절차 안내만 제공하며, 특정 결과를 보장하지 않습니다. 개별 사건 대리는 별도 계약이 필요합니다. 이민 외 법률·세무 상담은 포함되지 않습니다.',
  },
  {
    q: '크레딧 정책은 바뀔 수 있나요?',
    a: '네. 적립·사용 조건·필요 크레딧은 운영 상황에 따라 조정될 수 있습니다. 변경 시 이 페이지와 정책 버전을 업데이트하며, 이미 적립된 크레딧은 원칙적으로 유지합니다.',
  },
  {
    q: '언제부터 사용할 수 있나요?',
    a: '적립 기능은 커뮤니티 활동과 함께 반영됩니다. 커피챗·이민 변호사 자문 신청은 순차 오픈 예정이며, 잔액은 마이페이지에서 확인할 수 있습니다.',
  },
] as const

export const COMMUNITY_CREDIT_GLOSSARY: readonly CommunityCreditFaqItem[] = [
  {
    q: '크레딧',
    a: '커뮤니티 기여에 따라 쌓이는 정수 포인트. 현금 가치가 없으며 보상 신청에만 사용됩니다.',
  },
  {
    q: '적립',
    a: '글·댓글 등 활동으로 크레딧이 늘어나는 것. 조건 미충족 시 0입니다.',
  },
  {
    q: '회수',
    a: '삭제·위반 등으로 이미 받은 크레딧을 다시 차감하는 것.',
  },
  {
    q: '보상',
    a: '커피챗·이민 변호사 자문 등 미생이 제공·중개하는 비금전적 프로그램.',
  },
  {
    q: '일 상한',
    a: `댓글·답글 적립은 하루 최대 ${COMMUNITY_CREDIT_LIMITS.commentDailyCap} 크레딧까지만 인정됩니다.`,
  },
  {
    q: '타임라인',
    a: `OPT·비자·영주권·취업 후기의 단계 기록. 1단계당 ${COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧(자동 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX}). 최종 결과 후 팀 리뷰 보너스 ${COMMUNITY_CREDIT_REVIEW_BONUS}까지 가능합니다.`,
  },
] as const

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

/** 활동별 적립 효율 (커피챗·이민 변호사 자문 기준) */
export const COMMUNITY_CREDIT_EARN_EFFICIENCY = [
  {
    activity: '맛집 후기',
    amount: COMMUNITY_CREDIT_FOOD_POST,
    unit: '1편',
    toCoffeeChat: `${foodPostsEquivalent(COFFEE_CHAT_CREDIT_COST)}편`,
    toLawyer: `${foodPostsEquivalent(LAWYER_CREDIT_COST)}편`,
    note: '가장 접근하기 쉬운 적립',
  },
  {
    activity: 'OPT·비자·취업 후기',
    amount: COMMUNITY_CREDIT_TIMELINE_ENTRY,
    unit: '타임라인 1단계',
    toCoffeeChat: `${premiumPostsEquivalent(COFFEE_CHAT_CREDIT_COST)}편(최대치)`,
    toLawyer: `${premiumPostsEquivalent(LAWYER_CREDIT_COST)}편(최대치)`,
    note: `단계당 +${COMMUNITY_CREDIT_TIMELINE_ENTRY} · 자동 최대 ${COMMUNITY_CREDIT_TIMELINE_POST_MAX} · 리뷰 시 +${COMMUNITY_CREDIT_REVIEW_BONUS}`,
  },
  {
    activity: '댓글·답글',
    amount: 1,
    unit: '1개',
    toCoffeeChat: `${commentDaysEquivalent(COFFEE_CHAT_CREDIT_COST)}일 (일 ${COMMUNITY_CREDIT_LIMITS.commentDailyCap} 상한)`,
    toLawyer: `${commentDaysEquivalent(LAWYER_CREDIT_COST)}일 (일 ${COMMUNITY_CREDIT_LIMITS.commentDailyCap} 상한)`,
    note: '보조 적립 · 본인 글 댓글 제외',
  },
] as const
