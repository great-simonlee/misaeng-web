export const MISAENG_EMAIL_DOMAIN = '@misaeng.com'

export const MISAENG_NY_INSTAGRAM_HANDLE = 'misaeng.ny'
export const MISAENG_NY_INSTAGRAM_URL = `https://instagram.com/${MISAENG_NY_INSTAGRAM_HANDLE}`

/** NYC 네비·푸터·본문 가로 정렬용 컨테이너 */
export const NYC_PAGE_SHELL_CLASS =
  'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'

/** 카카오톡 문의 채널/오픈채팅 URL (미설정 시 문의 버튼에서 안내) */
export const KAKAO_INQUIRY_URL =
  process.env.NEXT_PUBLIC_KAKAO_INQUIRY_URL?.trim() ||
  'https://open.kakao.com/o/sRI0tPJi'

export const NYC_CATEGORIES = [
  {
    id: 'housing',
    title: '하우징',
    description: 'Misaeng 팀이 올리는 NYC 매물',
    href: '/nyc/housing',
    postHref: '/nyc/housing/new',
    available: true,
  },
  {
    id: 'events',
    title: '이벤트',
    description: '모임·공연·행사 공유',
    href: '/nyc/events',
    postHref: '/nyc/events/new',
    available: false,
  },
  {
    id: 'food',
    title: '맛집',
    description: '맛집·카페 추천',
    href: '/nyc/food',
    postHref: '/nyc/food/new',
    available: true,
  },
  {
    id: 'marketplace',
    title: '중고거래',
    description: '생활용품 사고팔기',
    href: '/nyc/marketplace',
    postHref: '/nyc/marketplace/new',
    available: false,
  },
  {
    id: 'status',
    title: 'OPT · 비자 · 영주권',
    description: '비자·CPT/OPT·영주권 후기',
    href: '/nyc/status',
    postHref: '/nyc/status/new',
    available: true,
  },
  {
    id: 'job-review',
    title: '취업 후기',
    description: '면접·취업·직장 경험',
    href: '/nyc/job-review',
    postHref: '/nyc/job-review/new',
    available: true,
  },
  {
    id: 'roommate',
    title: '룸메이트 · 서블렛',
    description: '룸메이트·방·서블렛 구하기',
    href: '/nyc/roommate',
    postHref: '/nyc/roommate/new',
    available: true,
  },
  {
    id: 'anonymous',
    title: '익명게시판',
    description: '익명으로 이야기 나누기',
    href: '/nyc/anonymous',
    postHref: '/nyc/anonymous/new',
    available: true,
  },
] as const

export type NycCategoryId = (typeof NYC_CATEGORIES)[number]['id']

/** 하우징·룸메이트 제외, 공통 communityPosts 컬렉션을 쓰는 보드 */
export const NYC_COMMUNITY_BOARD_IDS = [
  'events',
  'food',
  'marketplace',
  'status',
  'cpt-opt',
  'visa',
  'job-review',
  'green-card',
  'anonymous',
  'roommate',
] as const

export type NycCommunityBoardId = (typeof NYC_COMMUNITY_BOARD_IDS)[number]

/** 레거시 보드 → 통합 게시판(/nyc/status)으로 리다이렉트 */
export const NYC_COMMUNITY_BOARD_REDIRECTS: Partial<
  Record<NycCommunityBoardId, string>
> = {
  'cpt-opt': '/nyc/status',
  visa: '/nyc/status',
  'green-card': '/nyc/status',
}

/** 목록·글쓰기 UI 대신 준비 중 안내를 보여줄 보드 */
export const NYC_WIP_COMMUNITY_BOARD_IDS = ['marketplace'] as const

export type NycWipCommunityBoardId =
  (typeof NYC_WIP_COMMUNITY_BOARD_IDS)[number]

export function isCommunityBoardWip(
  id: string,
): id is NycWipCommunityBoardId {
  return (NYC_WIP_COMMUNITY_BOARD_IDS as readonly string[]).includes(id)
}

export const NYC_COMMUNITY_BOARD_META: Record<
  NycCommunityBoardId,
  {
    writeLabel: string
    listIntro: string
    locationLabel: string
    locationPlaceholder: string
    detailLabel: string | null
    detailPlaceholder: string
    detailInput: 'text' | 'date' | 'number' | null
    titlePlaceholder: string
    descriptionPlaceholder: string
  }
> = {
  events: {
    writeLabel: '이벤트 올리기',
    listIntro: 'NYC에서 열리는 모임·공연·행사를 공유해 보세요.',
    locationLabel: '장소',
    locationPlaceholder: '맨해튼 / 온라인',
    detailLabel: '일시',
    detailPlaceholder: '',
    detailInput: 'date',
    titlePlaceholder: '한인 네트워킹 나이트',
    descriptionPlaceholder: '시간, 참가 방법, 한 줄 소개',
  },
  food: {
    writeLabel: '맛집 추천하기',
    listIntro: '가본 맛집·카페를 남겨 주세요. 사진과 후기를 자유롭게 적어 보세요.',
    locationLabel: '동네',
    locationPlaceholder: '플러싱 / 코리아타운',
    detailLabel: '음식',
    detailPlaceholder: '',
    detailInput: null,
    titlePlaceholder: '식당 이름',
    descriptionPlaceholder: '메뉴, 가격대, 웨이팅, 추천 포인트…',
  },
  marketplace: {
    writeLabel: '물품 등록하기',
    listIntro: '필요 없는 물건, 필요한 물건 — 이웃과 거래해 보세요.',
    locationLabel: '거래 지역',
    locationPlaceholder: '브루클린 / 미팅 가능',
    detailLabel: '희망 가격 ($)',
    detailPlaceholder: '0',
    detailInput: 'number',
    titlePlaceholder: 'IKEA 책장 나눔/판매',
    descriptionPlaceholder: '상태, 픽업 가능 여부, 거래 방식을 적어 주세요.',
  },
  status: {
    writeLabel: '후기 올리기',
    listIntro:
      '날짜별로 뭘 준비·제출했는지, 결과는 어떻게 받았는지, 다음 스텝은 뭔지를 남겨 보세요.',
    locationLabel: '학교 / 회사 / 관련 기관 (선택)',
    locationPlaceholder: '예: NYU, 테크 스타트업, 대사관',
    detailLabel: '유형',
    detailPlaceholder: '',
    detailInput: null,
    titlePlaceholder: 'OPT 카드 수령까지 — 내 타임라인',
    descriptionPlaceholder:
      '다음 사람이 실수하지 않도록 조심해야 할 점을 적어 주세요.',
  },
  'cpt-opt': {
    writeLabel: '후기 올리기',
    listIntro:
      '날짜별로 뭘 준비·제출했는지, 결과는 어떻게 받았는지, 다음 스텝은 뭔지를 남겨 보세요.',
    locationLabel: '학교 / 회사 / 관련 기관 (선택)',
    locationPlaceholder: '예: NYU, 테크 스타트업, 대사관',
    detailLabel: '유형',
    detailPlaceholder: '',
    detailInput: null,
    titlePlaceholder: 'OPT 카드 수령까지 — 내 타임라인',
    descriptionPlaceholder:
      '다음 사람이 실수하지 않도록 조심해야 할 점을 적어 주세요.',
  },
  visa: {
    writeLabel: '후기 남기기',
    listIntro: '비자 준비·인터뷰 경험을 공유해 주세요.',
    locationLabel: '관련 지역 (선택)',
    locationPlaceholder: 'NY / 대사관 등',
    detailLabel: '비자 종류',
    detailPlaceholder: 'F-1 / H-1B / O-1',
    detailInput: 'text',
    titlePlaceholder: 'H-1B 청원 후기',
    descriptionPlaceholder: '타임라인, 서류, 팁',
  },
  'job-review': {
    writeLabel: '후기 올리기',
    listIntro:
      '회사·플랫폼·서류·면접 단계별로 어떤 경험이었는지 남겨 보세요.',
    locationLabel: '회사 (선택)',
    locationPlaceholder: 'Google, Meta, JP Morgan',
    detailLabel: '유형',
    detailPlaceholder: '',
    detailInput: null,
    titlePlaceholder: 'Google SWE Intern — 3라운드 면접 후기',
    descriptionPlaceholder: '다음 지원자에게 꼭 알려주고 싶은 팁',
  },
  roommate: {
    writeLabel: '글 올리기',
    listIntro:
      '방 올리기(룸메·서블렛)와 룸메 찾기를 나눠 올려 주세요. 계정당 1개만 등록할 수 있어요.',
    locationLabel: '동네 / 위치',
    locationPlaceholder: '플러싱 / 브루클린 / 맨해튼',
    detailLabel: '월 예산·월세 ($)',
    detailPlaceholder: '1500',
    detailInput: 'number',
    titlePlaceholder: '브루클린에서 룸메이트 구해요',
    descriptionPlaceholder: '생활 패턴, 예산, 입주 시기, 연락 방법을 적어 주세요.',
  },
  'green-card': {
    writeLabel: '후기 남기기',
    listIntro: '영주권 여정을 커뮤니티와 공유해 주세요.',
    locationLabel: '카테고리 (선택)',
    locationPlaceholder: 'EB-2 / 결혼 등',
    detailLabel: '단계',
    detailPlaceholder: 'I-140 / 인터뷰 등',
    detailInput: 'text',
    titlePlaceholder: 'EB-2 NIW 승인 후기',
    descriptionPlaceholder: '기간, 변호사, 팁',
  },
  anonymous: {
    writeLabel: '익명으로 글 남기기',
    listIntro: '이름 없이 편하게 나누는 NYC 익명 게시판이에요.',
    locationLabel: '주제 (선택)',
    locationPlaceholder: '주제를 선택해 주세요',
    detailLabel: null,
    detailPlaceholder: '',
    detailInput: null,
    titlePlaceholder: '오늘 하루 한 줄',
    descriptionPlaceholder: '부담 없이 남겨 보세요. 작성자는 익명으로 표시돼요.',
  },
}

export function getNycCategory(id: string) {
  return NYC_CATEGORIES.find((c) => c.id === id)
}

export function isCommunityBoardId(id: string): id is NycCommunityBoardId {
  return (NYC_COMMUNITY_BOARD_IDS as readonly string[]).includes(id)
}

export function getCommunityBoardRedirect(id: string): string | null {
  if (!isCommunityBoardId(id)) return null
  return NYC_COMMUNITY_BOARD_REDIRECTS[id] ?? null
}

/** 레거시 cpt-opt·비자·영주권 보드를 통합 게시판(status)으로 매핑 */
export function resolveMergedCommunityBoardId(
  id: string,
): NycCommunityBoardId | null {
  if (!isCommunityBoardId(id)) return null
  if (getCommunityBoardRedirect(id) === '/nyc/status') return 'status'
  return id
}

/** 비자·OPT·영주권 통합 게시판 여부 (레거시 id 포함) */
export function isStatusCommunityBoard(id: string): boolean {
  return resolveMergedCommunityBoardId(id) === 'status'
}

export function isAnonymousBoard(id: string): boolean {
  return id === 'anonymous'
}

export function isMisaengEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(MISAENG_EMAIL_DOMAIN)
}

/** handle이 있으면 Instagram 링크. logoSrc가 있으면 학교 로고 표시. */
export const NYC_PARTNER_ORGS = [
  {
    id: 'nyu-kiso',
    name: '뉴욕대 한인학생회',
    shortName: 'NYU',
    handle: 'nyu_kiso',
    logoSrc: '/img/school/kiso.png',
  },
  {
    id: 'fit-ksof',
    name: 'FIT 한인학생회',
    shortName: 'FIT',
    handle: 'ksof_fit',
    logoSrc: '/img/school/fit.png',
  },
  {
    id: 'baruch-ksa',
    name: '버룩 한인학생회',
    shortName: 'BC',
    handle: 'ksabaruch',
    logoSrc: '/img/school/baruch.png',
  },
  {
    id: 'parsons-ksa',
    name: '파슨스 한인학생회',
    shortName: 'PAR',
    handle: 'parsons.kisp',
    logoSrc: '/img/school/parsons.png',
  },
] as const

/** 협력 인플루언서 플랫폼 */
export const NYC_INFLUENCER_PLATFORMS = [
  {
    id: 'instagram',
    title: '인스타그램',
    description: 'NYC 라이프·로컬 인스타그램',
  },
  {
    id: 'youtube',
    title: '유튜버',
    description: '브이로그·정보 유튜브',
  },
  {
    id: 'tiktok',
    title: '틱토커',
    description: '숏폼으로 보는 뉴욕',
  },
] as const

export type NycInfluencerPlatformId =
  (typeof NYC_INFLUENCER_PLATFORMS)[number]['id']

/** 협력 인플루언서 확정 전 모집 안내. handle이 있으면 플랫폼 프로필로 연결. */
export const NYC_PARTNER_INFLUENCERS = [
  {
    id: 'ig-recruiting-1',
    name: '협력 인플루언서를 찾습니다!',
    shortName: 'IG',
    handle: null,
    platform: 'instagram',
  },
  {
    id: 'ig-recruiting-2',
    name: '현재 협력 인플루언서 찾는 중',
    shortName: 'IG',
    handle: null,
    platform: 'instagram',
  },
  {
    id: 'yt-recruiting-1',
    name: '협력 인플루언서를 찾습니다!',
    shortName: 'YT',
    handle: null,
    platform: 'youtube',
  },
  {
    id: 'yt-recruiting-2',
    name: '현재 협력 인플루언서 찾는 중',
    shortName: 'YT',
    handle: null,
    platform: 'youtube',
  },
  {
    id: 'tt-recruiting-1',
    name: '협력 인플루언서를 찾습니다!',
    shortName: 'TT',
    handle: null,
    platform: 'tiktok',
  },
  {
    id: 'tt-recruiting-2',
    name: '현재 협력 인플루언서 찾는 중',
    shortName: 'TT',
    handle: null,
    platform: 'tiktok',
  },
] as const satisfies ReadonlyArray<{
  id: string
  name: string
  shortName: string
  handle: string | null
  platform: NycInfluencerPlatformId
}>

export const NYC_PROFESSIONAL_CATEGORIES = [
  {
    id: 'real-estate',
    title: '부동산',
    description: '임대·매매·브로커 상담',
  },
  {
    id: 'lawyer',
    title: '변호사',
    description: '비자·이민·계약 법률',
  },
  {
    id: 'moving',
    title: '이사업체',
    description: 'NYC 이사·운반',
  },
  {
    id: 'accountant',
    title: '회계사',
    description: '세금·세무·CPA',
  },
] as const

export type NycProfessionalCategoryId =
  (typeof NYC_PROFESSIONAL_CATEGORIES)[number]['id']

/** 실제 파트너 정보로 교체 예정인 플레이스홀더 */
export const NYC_PROFESSIONALS = [
  {
    id: 're-1',
    categoryId: 'real-estate' as const,
    name: '예시 부동산',
    specialty: '맨해튼 · 브루클린 임대',
    contact: null,
  },
  {
    id: 're-2',
    categoryId: 'real-estate' as const,
    name: '예시 브로커',
    specialty: '학생·직장인 하우징',
    contact: null,
  },
  {
    id: 'law-1',
    categoryId: 'lawyer' as const,
    name: '예시 법률사무소',
    specialty: '비자 · 이민법',
    contact: null,
  },
  {
    id: 'law-2',
    categoryId: 'lawyer' as const,
    name: '예시 변호사',
    specialty: '임대차 · 계약',
    contact: null,
  },
  {
    id: 'mv-1',
    categoryId: 'moving' as const,
    name: '예시 이사업체',
    specialty: '시내 · 근교 이사',
    contact: null,
  },
  {
    id: 'mv-2',
    categoryId: 'moving' as const,
    name: '예시 무빙',
    specialty: '원룸 · 스튜디오',
    contact: null,
  },
  {
    id: 'acc-1',
    categoryId: 'accountant' as const,
    name: '예시 회계사무소',
    specialty: '개인 · 프리랜서 세금',
    contact: null,
  },
  {
    id: 'acc-2',
    categoryId: 'accountant' as const,
    name: '예시 CPA',
    specialty: 'OPT · ITIN · 세금신고',
    contact: null,
  },
] as const

/** 매거진형 에디터 콘텐츠 프리뷰 (게시판과 별개) */
export const NYC_MAGAZINE_PREVIEWS = [
  {
    id: 'mag-1',
    tag: '맛집',
    title: '플러싱에서 줄 서는 칼국수집',
    excerpt: '주말 브런치보다 든든한 한 끼, 현지 한인들이 가는 곳.',
    image: '/img/banner_1.png',
  },
  {
    id: 'mag-2',
    tag: '이벤트',
    title: '이번 주 맨해튼 한인 네트워킹',
    excerpt: '유학생·주니어가 모이는 가벼운 저녁 모임 소식.',
    image: '/img/ourservice_banner.png',
  },
  {
    id: 'mag-3',
    tag: '놀거리',
    title: '비 오는 날 실내 코스',
    excerpt: '박물관부터 카페까지, 하루 코스로 묶어봤어요.',
    image: '/img/main_banner_1.png',
  },
  {
    id: 'mag-4',
    tag: '동네',
    title: '아스토리아 한낮 산책',
    excerpt: '카페 골목부터 공원까지, 주말에 걷기 좋은 루트.',
    image: '/img/map_2.png',
  },
] as const
