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

/** ERP ROOM_TYPES와 정렬된 룸 타입 */
export type HousingRoomType =
  | 'master-w-bath'
  | 'master-wo-bath'
  | 'regular-bedroom'
  | 'flexroom'
  | 'entire'
  | 'studio'

/** ERP unit.promotions[] 항목 */
export type HousingUnitPromotion = {
  hasOP?: boolean
  opMonths?: number
  opBasis?: 'gross' | 'net'
  opOrFree?: boolean
  opOrFreeFreeMonth?: number
  freeMonth?: number
  leaseTerm?: number
  rentCredit?: number
}

/** ERP properties 문서 — 공개용 건물 정보 */
export interface HousingProperty {
  address: string
  displayedAddress?: string | null
  buildingName?: string | null
  area: string
  zipcode?: string | null
  latitude?: number | null
  longitude?: number | null
  subway: string[]
  amenities: string[]
  appliances: string[]
  includedUtility?: string[]
  partWall?: 'Full wall' | 'Regular wall' | 'Curtain only' | null
  amenityFee?: {
    type: 'optional' | 'mandatory'
    /** null = unknown, 0 = free, greater than 0 = paid */
    amount: number | null
    period: 'monthly' | 'yearly'
    per?: 'person' | 'unit'
  } | null
  incomeRequirements?: {
    personalIncome?: string
    personalGuarantor?: string
  } | null
  latestMoveInAllowedDays?: number | null
}

/** ERP units 문서 — 호수·가격·룸 분할 */
export interface HousingUnit {
  unitNumber?: string | null
  bedrooms: number
  bathrooms: number
  /** 그로스 월세 */
  price: number
  /** 넷 월세. 그로스와 같으면 생략 */
  netPrice?: number | null
  availableDate?: string | null
  available: boolean
  rooms: HousingRoom[]
  promotions: HousingUnitPromotion[]
  images: string[]
  youtubeUrl?: string | null
  listingUrl?: string | null
  /** 업로드 시 스냅샷 (없으면 beds/baths에서 파생) */
  unitType?: HousingUnitType | null
}

/** ERP units.rooms[] 원소 */
export interface HousingRoom {
  type: HousingRoomType
  price: number
  /** 룸 넷 월세. 그로스와 같으면 생략 */
  netPrice?: number | null
}

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
  | 'master-wo-bath'
  | 'regular-bedroom'
  | 'flexroom'
  | 'entire'
  | 'studio'
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

/**
 * Misaeng 공개 리스팅 — ERP Property + Unit 스냅샷
 * Supabase 업로드 계약: property + unit + roommateWaiting + sourcePropertyId/sourceUnitId
 */
export interface HousingListing {
  id: string
  property: HousingProperty
  unit: HousingUnit
  description: string
  roommateWaiting: HousingRoommateWaiting | null
  contactEmail: string
  sourcePropertyId?: string | null
  sourceUnitId?: string | null
  authorUid: string
  authorEmail: string
  authorSchoolId: string | null
  authorSchoolName: string | null
  createdAt: number
  updatedAt: number
  status: PostStatus
}

/** @deprecated HousingListing 사용 */
export type HousingPost = HousingListing

export type HousingListingInput = Omit<
  HousingListing,
  | 'id'
  | 'authorUid'
  | 'authorEmail'
  | 'authorSchoolId'
  | 'authorSchoolName'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
>

/** @deprecated HousingListingInput 사용 */
export type HousingPostInput = HousingListingInput

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
