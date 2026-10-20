/**
 * 채용 공고 화면 문구. 화면 코드에 하드코딩하지 않고 여기서만 관리한다.
 */
export const POSTING_COPY = {
  ko: {
    sectionTitle: '인턴 · 신입 공고',
    sectionDescription: 'Misaeng이 공고를 읽고 핵심만 정리했어요.',
    listTitle: '인턴 · 신입 채용 공고',
    listIntro: '미국 회사들의 인턴·신입 공고를 Misaeng이 핵심만 정리했어요.',
    listLink: '인턴 · 신입 공고 보기',
    backToCompanies: '회사별 채용 페이지',
    levelIntern: '인턴',
    levelNewGrad: '신입',
    allLevels: '전체',
    allRegions: '전체 지역',
    allFunctions: '전체 직무',
    tagKoreanPreferred: '한국어 우대',
    tagKoreaBased: '한국 근무',
    moreOnCareers: (company: string) => `더 많은 공고는 ${company} 공식 채용 사이트에서 확인하세요`,
    statPostings: '공고',
    postingCount: (n: number) => `공고 ${n}`,
    workRemote: '원격',
    workHybrid: '하이브리드',
    workOnsite: '출근',
    qualificationsTitle: '주요 자격요건',
    workTypeLabel: '근무 형태',
    locationLabel: '지역',
    showMore: '자세히 보기',
    showLess: '접기',
    applyButton: '공고 원문 보기',
    noSponsorship: '공고에 비자 스폰서십을 하지 않는다는 내용이 있어요.',
    noSponsorshipShort: '스폰서십 불가',
    deadlineLabel: '지원 마감',
    applyGuideTitle: '지원 안내',
    earlyApply: '조기 지원 유리',
    alwaysOpen: '상시 모집',
    earlyApplyNote: '수시로 심사해서 빨리 지원할수록 유리해요.',
    deadline: (date: string) => `마감 ${date}`,
    dDay: (days: number) => (days === 0 ? '오늘 마감' : `D-${days}`),
    moreRegions: (n: number) => `외 ${n}곳`,
    showMorePostings: (n: number) => `공고 ${n}개 더 보기`,
    loadMore: '더 보기',
    summaryNotice:
      'Misaeng이 공고를 요약한 내용이에요. 지원 자격과 마감일은 반드시 공고 원문에서 확인해 주세요.',
    postedOn: (date: string) => `${date} 등록`,
    resultCount: (n: number) => `${n}개 공고`,
    searchPlaceholder: '회사·직무 검색 (예: Analyst)',
    loading: '공고를 불러오는 중이에요…',
    loadError: '공고를 불러오지 못했어요',
    retry: '다시 시도',
    emptyTitle: '아직 등록된 공고가 없어요',
    emptyDescription: '새 인턴·신입 공고가 올라오면 여기에 보여 드릴게요.',
    noMatchTitle: '조건에 맞는 공고가 없어요',
    noMatchDescription: '다른 지역이나 검색어로 찾아보세요.',
    metaDescription:
      '미국 주요 회사의 인턴·신입 채용 공고를 Misaeng이 한국어로 요약했어요. 직무, 자격요건, 근무 형태, 비자 관련 내용을 한 번에 확인해 보세요.',
  },
} as const

export const postingCopy = POSTING_COPY.ko

/** 직무 분류 (ellieo-erp src/app/util/jobPostingRules.mjs JOB_FUNCTIONS 와 같은 코드, 같은 순서) */
export const JOB_FUNCTION_LABELS = {
  tech: '테크·엔지니어링',
  data: '데이터',
  product_design: '프로덕트·디자인',
  finance: '금융·투자',
  accounting: '회계·세무',
  strategy: '전략·컨설팅',
  operations: '오퍼레이션',
  sales: '세일즈',
  marketing: '마케팅',
  hr: 'HR·인사',
  legal_risk: '법무·리스크',
  other: '기타',
} as const

export type JobFunction = keyof typeof JOB_FUNCTION_LABELS

/** 지원 대상 학위 (ellieo-erp DEGREE_LEVELS 와 같은 코드) */
export const DEGREE_LABELS = {
  undergraduate: '학부생',
  graduate: '대학원생',
  both: '학부·대학원',
  unspecified: '학력 미명시',
} as const

export type DegreeLevel = keyof typeof DEGREE_LABELS
export const JOB_FUNCTIONS = Object.keys(JOB_FUNCTION_LABELS) as JobFunction[]
