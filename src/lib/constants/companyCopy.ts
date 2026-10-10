/**
 * 회사별 채용 페이지 화면 문구. 화면 코드에 하드코딩하지 않고 여기서만 관리한다.
 * ellieo.com 등 다른 언어는 같은 키로 COMPANY_COPY 에 locale 을 추가하면 된다.
 */
export const COMPANY_COPY = {
  ko: {
    bannerTitle: '회사별 채용 페이지',
    bannerDescription: '회사 공식 채용 사이트와 회사별 면접·취업 후기를 한 번에 모아 봤어요.',
    bannerCta: '회사 보기',
    listTitle: '회사별 채용 페이지',
    listIntro: '회사 공식 채용 페이지로 바로 가고, 회사별 면접·취업 후기를 모아 볼 수 있어요.',
    searchPlaceholder: '회사 이름으로 검색 (예: AWS, 골드만삭스)',
    allIndustries: '전체',
    reviewCount: (n: number) => `후기 ${n}`,
    viewCount: (n: number) => `조회 ${n}`,
    loading: '회사 목록을 불러오는 중이에요…',
    loadError: '회사 목록을 불러오지 못했어요',
    retry: '다시 시도',
    emptyTitle: '아직 등록된 회사가 없어요',
    emptyDescription: '곧 회사별 채용 페이지를 채워 둘게요.',
    noMatchTitle: '조건에 맞는 회사가 없어요',
    noMatchDescription: '다른 이름이나 업계로 찾아보세요.',
    backToList: '회사 목록',
    featuredTitle: '추천 회사',
    allCompaniesTitle: '전체 회사',
    countryBadge: (label: string) => `${label} 채용 기준`,
    visaTitle: '비자 정보',
    visaPending: '추후 업데이트 예정',
    visaH1b: 'H-1B 스폰서',
    visaEVerify: 'E-Verify',
    visaOptCpt: 'OPT · CPT',
    visaNotice: '회사 사정에 따라 달라질 수 있어요. 지원 전에 회사에 직접 확인해 주세요.',
    parentLabel: '모회사',
    subsidiariesLabel: '자회사',
    careersButton: '공식 채용 페이지',
    studentsButton: '학생, 인턴 채용',
    careersNotice:
      '공식 채용 사이트로 이동합니다. 공고 내용과 지원 자격은 해당 회사 사이트를 기준으로 확인해 주세요.',
    reviewsTitle: '면접 · 취업 후기',
    includeSubsidiaries: '자회사 후기 포함',
    allTypes: '전체',
    reviewsEmpty: '아직 이 회사 후기가 없습니다. 첫 후기를 남겨주세요',
    writeReview: '후기 남기기',
    reviewsError: '후기를 불러오지 못했어요',
    notFoundTitle: '회사를 찾을 수 없어요',
    notFoundDescription: '목록에서 다시 골라 주세요.',
    metaListDescription:
      '미국 주요 회사의 공식 채용 페이지와 한인 유학생·직장인의 면접, 취업 후기를 회사별로 모아 봤어요.',
    metaCompanyDescription: (name: string) =>
      `${name} 공식 채용 페이지와 Misaeng 회원들이 남긴 ${name} 면접·인턴·취업 후기를 확인해 보세요.`,
  },
} as const

export type CompanyCopy = (typeof COMPANY_COPY)['ko']

/** 지금은 한국어만 */
export const companyCopy: CompanyCopy = COMPANY_COPY.ko
