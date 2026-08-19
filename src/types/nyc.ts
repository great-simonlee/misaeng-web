export type PostStatus = 'open' | 'closed'

/** 유닛(아파트) 타입 */
export type HousingUnitType =
  | 'studio'
  | '1b1b'
  | '2b1b'
  | '2b2b'
  | '3b1b'
  | '3b2b'
  | '4-plus'

/** 룸(침실) 타입 — 유닛과 독립 */
export type HousingRoomType =
  | 'master-w-bath'
  | 'regular-bedroom'
  | 'flexroom'

/** 하우징 혜택/조건 태그 */
export type HousingPerkId =
  | 'roommate-waiting'
  | 'no-broker-fee'
  | 'no-guarantor'
  | 'free-credit'
  | 'washer-dryer'
  | 'terrace'
  | 'gym'
  | 'pool'
  | 'wall-ok'
  | 'rooftop'
  | 'bbq-grill'
  | 'work-study'
  | 'doorman-24h'
  | 'package-storage'
  | 'mail-room'
  | 'sauna'

/** 무료 크레딧 세부 (카드 배지용) — 필터는 free-credit 하나로 묶음 */
export type HousingCreditOffer =
  | { kind: 'months-free'; months: number }
  | { kind: 'dollar-credit'; amount: number }

/** 룸메이트 대기중 — 현재 거주/확정 성별 인원 */
export type HousingRoommateComposition = {
  male: number
  female: number
}

/** 기다리는 룸메이트의 희망 룸 (복수 선택) */
export type HousingRoommateRoomPreference =
  | 'master-w-bath'
  | 'regular-bedroom'
  | 'flexroom'
  | 'any'

export type HousingRoommateGender = 'male' | 'female'

/** 학생(학교) 또는 직장인 */
export type HousingRoommateAffiliation =
  | { kind: 'student'; school: string }
  | { kind: 'professional' }

/** 기다리는 룸메이트 개인 프로필 */
export type HousingRoommateProfile = {
  id: string
  gender: HousingRoommateGender
  affiliation: HousingRoommateAffiliation
  preferredRoomTypes: HousingRoommateRoomPreference[]
  intro: string
}

/** 유닛 단위 기다리는 룸메이트 정보 (룸 옵션 선택과 무관) */
export type HousingRoommateWaiting = {
  profiles: HousingRoommateProfile[]
}

/** 유닛 내 룸(또는 전체 유닛) 옵션 — 가격이 룸 타입별로 다를 수 있음 */
export interface HousingRoomOption {
  id: string
  /** null이면 유닛 전체 임대 */
  roomType: HousingRoomType | null
  rent: number
  availableFrom: string
  /** 입주 가능 종료일 (YYYY-MM-DD) */
  availableTo: string
  /** @deprecated 유닛 단위 roommateWaiting 사용 — 목록 배지 호환용 */
  roommateWaiting: boolean
  /** @deprecated */
  roommateComposition: HousingRoommateComposition | null
  /** @deprecated */
  roommateIntro: string | null
}

export interface HousingPost {
  id: string
  /** 목록/상세 타이틀로 쓰는 스트리트 주소 */
  title: string
  description: string
  neighborhood: string
  bedrooms: number
  /** 유닛 타입 (Studio, 1B1B …) */
  unitType: HousingUnitType | null
  /** 전체 유닛 월세 (룸 타입 합산 기준, 등록 시 별도 입력) */
  unitRent: number
  /** 룸별 가격·입주·룸메이트 옵션 */
  roomOptions: HousingRoomOption[]
  /** 유닛 공통 혜택/어메니티 (룸메이트 대기중은 roomOptions에서 판단) */
  perks: HousingPerkId[]
  /** free-credit 매물의 구체 혜택 (x개월 무료 또는 $x,xxx 크레딧) */
  creditOffer: HousingCreditOffer | null
  /** 기다리는 룸메이트 (있으면 표시, 룸 옵션 선택과 독립) */
  roommateWaiting: HousingRoommateWaiting | null
  contactEmail: string
  /** 매물 사진 URL (없으면 빈 배열) */
  images: string[]
  /** 유튜브 투어 영상 URL (없으면 null) */
  youtubeUrl: string | null
  authorUid: string
  authorEmail: string
  /** 작성자 학교 인증 배지용 (예: nyu) */
  authorSchoolId: string | null
  authorSchoolName: string | null
  createdAt: number
  updatedAt: number
  status: PostStatus
}

export type HousingPostInput = Omit<
  HousingPost,
  | 'id'
  | 'authorUid'
  | 'authorEmail'
  | 'authorSchoolId'
  | 'authorSchoolName'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
>

export type RoommateLookingFor = 'room' | 'roommate'

export interface RoommatePost {
  id: string
  title: string
  description: string
  neighborhood: string
  budgetMax: number
  moveInDate: string
  lookingFor: RoommateLookingFor
  contactEmail: string
  /** 매물/프로필 사진 URL (없으면 빈 배열) */
  images: string[]
  /** 유튜브 소개 영상 URL (없으면 null) */
  youtubeUrl: string | null
  authorUid: string
  authorEmail: string
  authorSchoolId: string | null
  authorSchoolName: string | null
  createdAt: number
  updatedAt: number
  status: PostStatus
}

export type RoommatePostInput = Omit<
  RoommatePost,
  | 'id'
  | 'authorUid'
  | 'authorEmail'
  | 'authorSchoolId'
  | 'authorSchoolName'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
>

export type CommunityBoardId =
  | 'events'
  | 'food'
  | 'marketplace'
  | 'cpt-opt'
  | 'visa'
  | 'job-review'
  | 'green-card'
  | 'anonymous'

export interface CommunityPost {
  id: string
  categoryId: CommunityBoardId
  title: string
  description: string
  location: string
  detail: string
  authorUid: string
  authorEmail: string
  authorSchoolId: string | null
  authorSchoolName: string | null
  createdAt: number
  updatedAt: number
  status: PostStatus
}

export type CommunityPostInput = Omit<
  CommunityPost,
  | 'id'
  | 'authorUid'
  | 'authorEmail'
  | 'authorSchoolId'
  | 'authorSchoolName'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
>

export interface NycUserProfile {
  uid: string
  email: string
  /** Google 등 계정 표시 이름 (참고용) */
  displayName: string | null
  firstName: string | null
  lastName: string | null
  /** 커뮤니티에서 쓰는 닉네임 */
  nickname: string | null
  /** MBTI (예: ENFP) */
  mbti: string | null
  gender: string | null
  occupationType: string | null
  /** 미생에 직접 등록한 프로필 사진 (Google 사진과 별개) */
  photoURL: string | null
  roommatePostId: string | null
  /** 학교 이메일 인증 */
  schoolEmail: string | null
  schoolEmailVerified: boolean
  /** 인증된 학교 (예: nyu → New York University) */
  verifiedSchoolId: string | null
  verifiedSchoolName: string | null
  /** 휴대폰 인증 */
  phone: string | null
  phoneVerified: boolean
  /** 인스타그램 인증 (예정) */
  instagramHandle: string | null
  instagramVerified: boolean
  /** 인증 발송 쿼터 (비용 방지) */
  otpQuota: {
    dayKey: string
    schoolSendCount: number
    phoneSendCount: number
    schoolLastSentAt: number
    phoneLastSentAt: number
  } | null
  createdAt: number
  updatedAt: number
}
