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

/** ERP partWall 옵션 (Curtain only = ERP 'Curtain' 별칭) */
export type HousingPartWall =
  | 'Full wall'
  | 'Regular wall'
  | 'Curtain only'

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
  /** 복수 선택 가능. Full/Regular = 플렉스 벽 가능 */
  partWall?: HousingPartWall[] | null
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
  /** ERP에서 업로드한 유닛 전체 레이아웃 (없으면 null) */
  layoutImage?: string | null
  /** 룸 타입별 레이아웃 이미지 URL */
  roomLayouts?: Partial<Record<HousingRoomType, string>>
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
  | 'status'
  | 'cpt-opt'
  | 'visa'
  | 'job-review'
  | 'green-card'
  | 'anonymous'

export interface CommunityPost {
  id: string
  categoryId: CommunityBoardId
  title: string
  /** 목록 카드용 플레인 텍스트 요약 */
  description: string
  /** TipTap HTML 본문 */
  contentHtml: string
  location: string
  detail: string
  authorUid: string
  authorEmail: string
  /** 프로필 닉네임 (작성 시점 스냅샷) */
  authorNickname: string | null
  /** 프로필 사진 URL (작성 시점 스냅샷) */
  authorPhotoURL: string | null
  authorSchoolId: string | null
  authorSchoolName: string | null
  createdAt: number
  updatedAt: number
  status: PostStatus
  /** 상세 조회 수 */
  viewCount: number
  /** 추천 수 (목록 카드용) */
  recommendCount: number
  /** 댓글 수 (목록 카드용) */
  commentCount: number
  /** 맛집 보드: 나도 가봤어요 수 */
  beenThereCount: number
  /** 목록 썸네일 (맛집 등) */
  thumbnailUrl: string | null
  /** 맛집: 방문 인원 */
  partySize: number | null
  /** 맛집: 총 지출(USD) */
  totalSpend: number | null
  /** 맛집: 웨이팅 시간(분). 0 = 없음 */
  waitMinutes: number | null
  /** 맛집: 맛집 | 가성비 | 느좋 | 카공 */
  foodCategory: FoodCategoryId | null
  /** 맛집: 메뉴 사진 + 이름 + 한 줄 평 */
  menuItems: FoodMenuItem[]
  /** 맛집: 가게 내부·분위기 등 추가 사진 */
  galleryPhotos: FoodGalleryPhoto[]
  /** 맛집: Google/지도 place id */
  placeId: string | null
  /** 맛집: 지도에서 고른 상호명 */
  placeName: string | null
  /** 맛집: 위도 */
  latitude: number | null
  /** 맛집: 경도 */
  longitude: number | null
  /** CPT/OPT: 신청 유형 */
  cptOptType: CptOptTypeId | null
  /** CPT/OPT: 날짜별 준비·제출·결과 타임라인 */
  cptOptTimeline: CptOptTimelineEntry[]
  /** CPT/OPT: 조심해야 할 점 */
  cptOptTips: string | null
  /** 취업 후기: 지원 유형 */
  jobReviewType: JobReviewTypeId | null
  /** 취업 후기: 단계별 타임라인 */
  jobReviewTimeline: JobReviewTimelineEntry[]
  /** 취업 후기: 다음 지원자에게 (레거시 plain) */
  jobReviewTips: string | null
  /** 취업 후기: 업계 (테크, 금융 등) */
  jobReviewIndustry: string | null
}

/** CPT / OPT / STEM OPT / 비자 / 영주권 */
export type CptOptTypeId =
  | 'cpt'
  | 'opt'
  | 'stem-opt'
  | 'visa'
  | 'green-card'

/** CPT·OPT·비자·영주권 진행 단계 (날짜별) */
export interface CptOptTimelineEntry {
  id: string
  /** YYYY-MM-DD 또는 자유 입력 */
  date: string
  /** 뭘 준비했는지 */
  prepared: string
  /** 어떻게 제출했는지 */
  submitted: string
  /** 결과를 어떻게 받았는지 */
  resultReceived: string
  /** 다음 스텝 */
  nextStep: string
}

/** 취업 후기 지원 유형 */
export type JobReviewTypeId = 'intern' | 'new-grad' | 'experienced' | 'contract'

/** 취업 후기 단계별 기록 */
export interface JobReviewTimelineEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** 단계 (서류, OA, Phone, Onsite 등) */
  stageLabel: string
  /** 지원 경로 (LinkedIn, Handshake, Referral 등) */
  platform: string
  /** 제출 서류 */
  documentsSubmitted: string
  /** 면접 차수 */
  interviewRound: string
  /** 단계별 후기 (리치 텍스트) */
  stageReviewHtml: string
  /** 결과 (Pass, Reject, Offer 등) */
  outcome: string
}

/** 맛집 보드 카테고리 */
export type FoodCategoryId = 'restaurant' | 'value' | 'vibe' | 'study'

/** 맛집 메뉴 (사진 + 메뉴명 + 한 줄 평) */
export interface FoodMenuItem {
  id: string
  imageUrl: string
  /** 메뉴 이름 (예: 돼지곰탕) */
  name: string
  /** 한 줄 평 */
  caption: string
}

/** 맛집: 가게 내부·분위기 등 추가 사진 */
export interface FoodGalleryPhoto {
  id: string
  imageUrl: string
  caption: string
}

/** 지도 장소 검색 결과 */
export interface PlaceSearchResult {
  placeId: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
}

/** 댓글/대댓글 — parentId가 있으면 대댓글(1단만 허용) */
export type CommunityCommentStatus = 'open' | 'deleted'

export interface CommunityComment {
  id: string
  postId: string
  /** null = 댓글, string = 해당 댓글에 대한 대댓글 */
  parentId: string | null
  body: string
  authorUid: string
  authorEmail: string
  authorNickname: string | null
  authorPhotoURL: string | null
  authorSchoolId: string | null
  createdAt: number
  updatedAt: number
  status: CommunityCommentStatus
}

export type CommunityCommentInput = {
  postId: string
  parentId?: string | null
  body: string
  authorNickname?: string | null
  authorPhotoURL?: string | null
  authorSchoolId?: string | null
}

export type CommunityCommentThread = CommunityComment & {
  replies: CommunityComment[]
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
  | 'viewCount'
  | 'beenThereCount'
>

/** 추천·신고 대상 (게시글 / 댓글) — ellieo-erp 모더레이션과 공유 */
export type CommunityEngagementTargetType = 'post' | 'comment'

/** 게시글·댓글 추천(업보트) */
export interface CommunityRecommend {
  id: string
  targetType: CommunityEngagementTargetType
  targetId: string
  postId: string
  boardId: string
  authorUid: string
  createdAt: number
}

export type CommunityRecommendSummary = {
  count: number
  recommendedByMe: boolean
}

/** 맛집: 나도 가봤어요 */
export interface CommunityBeenThere {
  id: string
  postId: string
  boardId: string
  authorUid: string
  createdAt: number
}

export type CommunityBeenThereSummary = {
  count: number
  beenThereByMe: boolean
}

/**
 * 신고 사유 — ERP 관리 화면에서도 동일 코드 사용
 * spam | abuse | inappropriate | misinformation | privacy | other
 */
export type CommunityReportReason =
  | 'spam'
  | 'abuse'
  | 'inappropriate'
  | 'misinformation'
  | 'privacy'
  | 'other'

/**
 * 신고 처리 상태 — 웹은 주로 open 생성, ERP에서 이후 상태 전환
 * open → reviewed → resolved | dismissed
 */
export type CommunityReportStatus =
  | 'open'
  | 'reviewed'
  | 'resolved'
  | 'dismissed'

export interface CommunityReport {
  id: string
  targetType: CommunityEngagementTargetType
  targetId: string
  postId: string
  boardId: string
  reason: CommunityReportReason
  detail: string | null
  reporterUid: string
  reporterEmail: string
  status: CommunityReportStatus
  createdAt: number
  updatedAt: number
  /** ERP 모더레이터 처리 시각 */
  reviewedAt: number | null
  /** ERP 담당자 uid/이메일 */
  reviewedBy: string | null
  /** ERP 조치 메모 */
  resolutionNote: string | null
}

export type CommunityReportInput = {
  targetType: CommunityEngagementTargetType
  targetId: string
  postId: string
  boardId: string
  reason: CommunityReportReason
  detail?: string | null
}

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
