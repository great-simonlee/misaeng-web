/** Misaeng NYC 소개 캐러셀 시안 슬라이드 */

export type NycIntroCarouselSlide = {
  id: string
  kicker: string
  headline: string
  body: string
  schools?: string[]
  /** 풀블리드 배경 이미지 (주제와 맞춤) */
  imageUrl: string
  /** 테마별 오버레이·분위기 그라디언트 */
  wash: string
  /** 상단 포인트 글로우 */
  glow: string
}

export const NYC_INTRO_CAROUSEL_SLIDES: NycIntroCarouselSlide[] = [
  {
    id: 'intro',
    kicker: 'MISAENG NYC',
    headline: '뉴욕 유학생이라면 다 알아야 하는 곳',
    body: '각 학교 한인 유학생회와 손잡고 비자, 취업, 맛집, 이벤트 정보를 한곳에 모았습니다. 전문가 연결까지.',
    schools: ['NYU', 'Columbia', 'Baruch', 'Pace'],
    // NYC 야경 스카이라인
    imageUrl:
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(165deg, rgba(16,27,48,0.35) 0%, rgba(16,27,48,0.15) 42%, rgba(8,12,22,0.92) 100%)',
    glow: 'radial-gradient(ellipse 80% 55% at 70% 18%, rgba(232,184,75,0.28), transparent 62%)',
  },
  {
    id: 'status',
    kicker: '비자 · 신분',
    headline: '이거 맞게 하고 있는 게 맞을까',
    body: 'OPT, CPT, 비자, 영주권까지 먼저 겪어본 선배들이 남긴 스텝별 리얼 후기로 미리 준비해보세요.',
    // 여권·출입국 서류
    imageUrl:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(180deg, rgba(28,48,72,0.45) 0%, rgba(20,36,58,0.2) 40%, rgba(10,18,32,0.94) 100%)',
    glow: 'radial-gradient(ellipse 70% 50% at 20% 12%, rgba(120,168,220,0.32), transparent 58%)',
  },
  {
    id: 'food',
    kicker: '맛집',
    headline: '오늘 뭐 먹을지 고민할 필요 없이',
    body: '지역이 아닌 메뉴로 찾는 맛집 리스트로, 먹고 싶은 음식이 떠오르는 순간 바로 검색해서 찾아갈 수 있어요.',
    // 메뉴·음식 클로즈업
    imageUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(195deg, rgba(62,28,18,0.4) 0%, rgba(40,18,12,0.18) 38%, rgba(18,8,6,0.93) 100%)',
    glow: 'radial-gradient(ellipse 75% 55% at 80% 20%, rgba(246,100,40,0.35), transparent 60%)',
  },
  {
    id: 'housing',
    kicker: '하우징 · 룸메이트',
    headline: '집 구하는 일, 더는 혼자 하지 않도록',
    body: '검증된 매물과 생활 패턴이 잘 맞는 룸메이트를 한 곳에서 비교하고 편하게 연결해보세요.',
    // NYC 아파트·거실
    imageUrl:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(175deg, rgba(48,36,28,0.42) 0%, rgba(32,24,18,0.16) 40%, rgba(14,10,8,0.93) 100%)',
    glow: 'radial-gradient(ellipse 65% 48% at 15% 15%, rgba(210,170,120,0.3), transparent 55%)',
  },
  {
    id: 'anonymous',
    kicker: '익명게시판',
    headline: '이름을 걸고 묻기엔 애매한 질문들',
    body: '비자든 인간관계든 이름을 걸고 묻기 애매한 질문도, 익명이라 더 솔직하게 나눌 수 있어요.',
    // 밤 늦은 타이핑·익명 대화 분위기
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(180deg, rgba(18,22,30,0.55) 0%, rgba(12,14,20,0.28) 36%, rgba(6,8,12,0.95) 100%)',
    glow: 'radial-gradient(ellipse 60% 45% at 50% 8%, rgba(160,175,195,0.22), transparent 55%)',
  },
  {
    id: 'credit',
    kicker: '레퍼럴 크레딧',
    headline: '친구를 초대하고 후기를 남기면',
    body: 'OPT, CPT, 비자 후기를 자세히 남기면 초대한 사람과 작성자 모두 크레딧을 함께 받습니다.',
    // 친구 초대·함께하는 순간
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(160deg, rgba(40,28,12,0.48) 0%, rgba(24,16,8,0.2) 40%, rgba(12,8,4,0.94) 100%)',
    glow: 'radial-gradient(ellipse 70% 50% at 75% 10%, rgba(232,184,75,0.4), transparent 58%)',
  },
  {
    id: 'expert',
    kicker: '전문가 커넥트',
    headline: '모은 크레딧으로 전문가를 만나는 시간',
    body: '모은 크레딧으로 가고 싶은 분야의 현직 선배와 커피챗을, 전문가와는 직접 상담을 요청해보세요.',
    // 아시아인 전문가·상담 미팅
    imageUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(185deg, rgba(24,36,48,0.5) 0%, rgba(16,24,34,0.22) 38%, rgba(8,12,18,0.94) 100%)',
    glow: 'radial-gradient(ellipse 68% 50% at 25% 18%, rgba(100,150,180,0.28), transparent 58%)',
  },
  {
    id: 'cta',
    kicker: '지금 시작하기',
    headline: '정보는 여기서, 답은 전문가에게',
    body: 'misaeng.com/nyc 에서 유학생회 파트너 정보와 검증된 매물까지 지금 바로 확인해보세요.',
    // NYC 브루클린 브릿지 · 시작의 상징
    imageUrl:
      'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1080&q=80',
    wash: 'linear-gradient(170deg, rgba(80,28,12,0.45) 0%, rgba(40,16,8,0.18) 40%, rgba(16,10,8,0.94) 100%)',
    glow: 'radial-gradient(ellipse 75% 55% at 60% 15%, rgba(246,67,16,0.38), transparent 60%)',
  },
]
