import type { CommunityPost } from '@/types/nyc'
import type { NycCommunityBoardId } from '@lib/constants/nyc'

const NOW = Date.now()
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** OPT·비자·영주권·취업 후기 목데이터 표시용 접두어 */
export const MOCK_COMMUNITY_POST_PREFIX = '[테스트 데이터]'

export function isMockCommunityPostId(id: string): boolean {
  return id.startsWith('mock-')
}

function isTimelineBoardMockPost(partial: {
  id: string
  categoryId: string
}): boolean {
  return (
    isMockCommunityPostId(partial.id) &&
    (partial.categoryId === 'status' ||
      partial.categoryId === 'job-review' ||
      partial.categoryId === 'anonymous')
  )
}

function withMockCommunityPrefix(
  text: string | null | undefined,
  enabled: boolean,
): string {
  if (!enabled || !text?.trim()) return text ?? ''
  const trimmed = text.trim()
  if (trimmed.startsWith(MOCK_COMMUNITY_POST_PREFIX)) return trimmed
  return `${MOCK_COMMUNITY_POST_PREFIX} ${trimmed}`
}

function withMockCommunityHtmlPrefix(
  html: string | undefined,
  enabled: boolean,
): string | undefined {
  if (!enabled || !html?.trim()) return html
  const trimmed = html.trim()
  if (trimmed.includes(MOCK_COMMUNITY_POST_PREFIX)) return trimmed
  return `<p><strong>${MOCK_COMMUNITY_POST_PREFIX}</strong></p>\n${trimmed}`
}

function post(
  partial: Omit<
    CommunityPost,
    | 'status'
    | 'updatedAt'
    | 'viewCount'
    | 'recommendCount'
    | 'commentCount'
    | 'beenThereCount'
    | 'thumbnailUrl'
    | 'partySize'
    | 'totalSpend'
    | 'waitMinutes'
    | 'foodCategory'
    | 'menuItems'
    | 'galleryPhotos'
    | 'placeId'
    | 'placeName'
    | 'latitude'
    | 'longitude'
    | 'cptOptType'
    | 'cptOptTimeline'
    | 'cptOptTips'
    | 'jobReviewType'
    | 'jobReviewTimeline'
    | 'jobReviewTips'
    | 'jobReviewIndustry'
    | 'roommateLookingFor'
    | 'roommateBudgetMax'
    | 'roommateMoveInDate'
    | 'authorUid'
    | 'authorEmail'
    | 'authorNickname'
    | 'authorPhotoURL'
  > & {
    authorUid?: string
    authorEmail?: string
    authorNickname?: string | null
    authorPhotoURL?: string | null
    updatedAt?: number
    viewCount?: number
    recommendCount?: number
    commentCount?: number
    beenThereCount?: number
    thumbnailUrl?: string | null
    partySize?: number | null
    totalSpend?: number | null
    waitMinutes?: number | null
    foodCategory?: CommunityPost['foodCategory']
    menuItems?: CommunityPost['menuItems']
    galleryPhotos?: CommunityPost['galleryPhotos']
    placeId?: string | null
    placeName?: string | null
    latitude?: number | null
    longitude?: number | null
    cptOptType?: CommunityPost['cptOptType']
    cptOptTimeline?: CommunityPost['cptOptTimeline']
    cptOptTips?: CommunityPost['cptOptTips']
    jobReviewType?: CommunityPost['jobReviewType']
    jobReviewTimeline?: CommunityPost['jobReviewTimeline']
    jobReviewTips?: CommunityPost['jobReviewTips']
    jobReviewIndustry?: CommunityPost['jobReviewIndustry']
    roommateLookingFor?: CommunityPost['roommateLookingFor']
    roommateBudgetMax?: CommunityPost['roommateBudgetMax']
    roommateMoveInDate?: CommunityPost['roommateMoveInDate']
  },
): CommunityPost {
  const mockTimelineBoard = isTimelineBoardMockPost(partial)

  return {
    ...partial,
    title: withMockCommunityPrefix(partial.title, mockTimelineBoard),
    description: withMockCommunityPrefix(partial.description, mockTimelineBoard),
    contentHtml:
      withMockCommunityHtmlPrefix(partial.contentHtml, mockTimelineBoard) ??
      partial.contentHtml,
    authorUid: partial.authorUid ?? `mock-author-${partial.id}`,
    authorEmail: partial.authorEmail ?? `mock-${partial.id}@example.com`,
    authorNickname: partial.authorNickname ?? null,
    authorPhotoURL: partial.authorPhotoURL ?? null,
    thumbnailUrl: partial.thumbnailUrl ?? null,
    partySize: partial.partySize ?? null,
    totalSpend: partial.totalSpend ?? null,
    waitMinutes: partial.waitMinutes ?? null,
    foodCategory: partial.foodCategory ?? null,
    menuItems: partial.menuItems ?? [],
    galleryPhotos: partial.galleryPhotos ?? [],
    placeId: partial.placeId ?? null,
    placeName: partial.placeName ?? null,
    latitude: partial.latitude ?? null,
    longitude: partial.longitude ?? null,
    cptOptType: partial.cptOptType ?? null,
    cptOptTimeline: partial.cptOptTimeline ?? [],
    cptOptTips: partial.cptOptTips
      ? withMockCommunityPrefix(partial.cptOptTips, mockTimelineBoard)
      : null,
    jobReviewType: partial.jobReviewType ?? null,
    jobReviewTimeline: partial.jobReviewTimeline ?? [],
    jobReviewTips: partial.jobReviewTips
      ? withMockCommunityPrefix(partial.jobReviewTips, mockTimelineBoard)
      : null,
    jobReviewIndustry: partial.jobReviewIndustry ?? null,
    roommateLookingFor: partial.roommateLookingFor ?? null,
    roommateBudgetMax: partial.roommateBudgetMax ?? null,
    roommateMoveInDate: partial.roommateMoveInDate ?? null,
    viewCount: partial.viewCount ?? 0,
    recommendCount: partial.recommendCount ?? 0,
    commentCount: partial.commentCount ?? 0,
    beenThereCount: partial.beenThereCount ?? 0,
    updatedAt: partial.updatedAt ?? partial.createdAt,
    status: 'open',
  }
}

export const COMMUNITY_MOCK_POSTS: CommunityPost[] = [
  post({
    id: 'mock-food-1',
    categoryId: 'food',
    title: '플러싱 칼국수',
    description:
      '면발 쫄깃하고 육수가 깔끔해요. 주말 점심은 30분 정도 기다리는 편입니다.',
    contentHtml: `
      <p>플러싱에서 자주 가는 칼국수집 후기입니다.</p>
      <h2>추천 포인트</h2>
      <ul>
        <li>육수가 맑고 간이 세지 않아요</li>
        <li>김치가 잘 나와서 같이 먹으면 좋습니다</li>
        <li>2인 기준 $30 전후</li>
      </ul>
      <p>주말 낮에는 웨이팅이 있으니, 오픈 직후나 늦은 오후를 추천합니다.</p>
      <blockquote>팁: 주차는 근처 유료 랏이 편해요.</blockquote>
    `,
    location: '플러싱',
    detail: '한식',
    authorUid: 'mock-user-1',
    authorEmail: 'foodlover@nyu.edu',
    authorNickname: '플러싱러버',
    authorSchoolId: 'nyu',
    authorSchoolName: 'New York University',
    createdAt: NOW - 3 * HOUR,
    viewCount: 128,
    beenThereCount: 17,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
    partySize: 2,
    totalSpend: 35,
    waitMinutes: 25,
    foodCategory: 'restaurant',
    placeId: 'mock-place-flushing',
    placeName: '플러싱 칼국수',
    latitude: 40.7596,
    longitude: -73.8302,
    menuItems: [
      {
        id: 'm1',
        imageUrl:
          'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
        name: '칼국수',
        caption: '육수 깔끔, 면발 쫄깃',
      },
      {
        id: 'm2',
        imageUrl:
          'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800&q=80',
        name: '김치전',
        caption: '바삭하고 기름 적당',
      },
    ],
  }),
  post({
    id: 'mock-food-2',
    categoryId: 'food',
    title: '코리아타운 카페',
    description:
      '콘센트 많고 소음이 적당해요. 아메리카노와 샌드위치 조합 추천.',
    contentHtml: `
      <p>32nd 근처에서 과제할 때 자주 가는 곳입니다.</p>
      <h2>분위기</h2>
      <p>창가 자리는 해가 잘 들고, 오후 3시 이후가 한산합니다.</p>
      <h2>메뉴</h2>
      <ul>
        <li>아이스 아메리카노</li>
        <li>에그 샌드위치</li>
        <li>말차 라떼</li>
      </ul>
      <p>와이파이는 안정적이고, 2시간 이상 앉아 있어도 눈치 안 주는 편이에요.</p>
    `,
    location: '코리아타운',
    detail: '기타',
    authorUid: 'mock-user-2',
    authorEmail: 'study@columbia.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 1 * DAY,
    viewCount: 86,
    beenThereCount: 9,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    partySize: 1,
    totalSpend: 13,
    waitMinutes: 0,
    foodCategory: 'study',
    placeId: 'mock-place-ktown',
    placeName: '코리아타운 카페',
    latitude: 40.7479,
    longitude: -73.987,
    menuItems: [
      {
        id: 'm3',
        imageUrl:
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
        name: '아메리카노',
        caption: '산미 적고 무난',
      },
      {
        id: 'm4',
        imageUrl:
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80',
        name: '에그 샌드위치',
        caption: '포만감 좋음',
      },
    ],
  }),
  post({
    id: 'mock-food-3',
    categoryId: 'food',
    title: '브루클린 브런치',
    description:
      '인기 브런치집 줄 대신 가는 곳. 팬케이크와 계란 스크램블이 괜찮아요.',
    contentHtml: `
      <p>주말마다 줄 서는 브런치 말고, 여유 있게 먹을 수 있는 곳을 찾았어요.</p>
      <p>플레이트가 푸짐하고, 커피 리필이 가능합니다. 친구랑 가기 좋아요.</p>
      <h2>가는 법</h2>
      <p>지하철에서 도보 7분. 근처 공원 산책하고 오기 좋습니다.</p>
    `,
    location: '브루클린',
    detail: '브런치',
    authorUid: 'mock-user-3',
    authorEmail: 'brunch@newschool.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 2 * DAY,
    viewCount: 54,
    beenThereCount: 6,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80',
    partySize: 3,
    totalSpend: 68,
    waitMinutes: 45,
    foodCategory: 'vibe',
    placeId: 'mock-place-brooklyn',
    placeName: '브루클린 브런치',
    latitude: 40.6782,
    longitude: -73.9442,
    menuItems: [
      {
        id: 'm5',
        imageUrl:
          'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80',
        name: '팬케이크',
        caption: '달콤하고 폭신',
      },
    ],
  }),
  post({
    id: 'mock-food-4',
    categoryId: 'food',
    title: '퀸즈 분식',
    description:
      '학생 예산에 딱. 김밥·라면 세트가 가성비 최고입니다.',
    contentHtml: `
      <p>배고플 때 부담 없이 가기 좋은 분식집이에요.</p>
      <p>김밥 두 줄이랑 라면 세트면 충분하고, 양도 푸짐합니다.</p>
    `,
    location: '퀸즈',
    detail: '한식',
    authorUid: 'mock-user-4',
    authorEmail: 'value@hunter.cuny.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 4 * DAY,
    viewCount: 41,
    beenThereCount: 11,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80',
    partySize: 2,
    totalSpend: 18.0,
    waitMinutes: 10,
    foodCategory: 'value',
    placeId: 'mock-place-queens',
    placeName: '퀸즈 분식',
    latitude: 40.7282,
    longitude: -73.7949,
    menuItems: [
      {
        id: 'm6',
        imageUrl:
          'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80',
        name: '김밥 세트',
        caption: '양 많고 저렴',
      },
    ],
  }),
  // —— 같은 식당 복수 후기 (지도 핀 묶음 데모) ——
  post({
    id: 'mock-food-1b',
    categoryId: 'food',
    title: '플러싱 칼국수 — 저녁 재방문',
    description:
      '두 번째 방문. 저녁은 웨이팅이 덜했고 수육 추가하니 더 좋았어요.',
    contentHtml: `<p>저녁 타임 재방문 후기입니다. 수육이 생각보다 담백해요.</p>`,
    location: '플러싱',
    detail: '한식',
    authorUid: 'mock-user-10',
    authorEmail: 'soup@hunter.cuny.edu',
    authorNickname: '면사랑',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 6 * HOUR,
    viewCount: 42,
    beenThereCount: 5,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800&q=80',
    partySize: 3,
    totalSpend: 58,
    waitMinutes: 10,
    foodCategory: 'restaurant',
    placeId: 'mock-place-flushing',
    placeName: '플러싱 칼국수',
    latitude: 40.7596,
    longitude: -73.8302,
  }),
  post({
    id: 'mock-food-1c',
    categoryId: 'food',
    title: '플러싱 칼국수 — 혼밥 OK',
    description: '1인석도 있어서 혼밥하기 편했어요. 김치전 필수.',
    contentHtml: `<p>혼자 가기 부담 없는 칼국수집입니다.</p>`,
    location: '플러싱',
    detail: '한식',
    authorUid: 'mock-user-11',
    authorEmail: 'solo@nyu.edu',
    authorNickname: '혼밥러',
    authorSchoolId: 'nyu',
    authorSchoolName: 'New York University',
    createdAt: NOW - 5 * DAY,
    viewCount: 33,
    beenThereCount: 4,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&q=80',
    partySize: 1,
    totalSpend: 16,
    waitMinutes: 5,
    foodCategory: 'value',
    placeId: 'mock-place-flushing',
    placeName: '플러싱 칼국수',
    latitude: 40.7596,
    longitude: -73.8302,
  }),
  post({
    id: 'mock-food-2b',
    categoryId: 'food',
    title: '코리아타운 카페 — 아침 공부',
    description: '오픈 직후가 제일 한산해요. 콘센트·와이파이 모두 좋음.',
    contentHtml: `<p>아침 9시쯤 가면 창가 거의 비어 있습니다.</p>`,
    location: '코리아타운',
    detail: '기타',
    authorUid: 'mock-user-12',
    authorEmail: 'early@columbia.edu',
    authorNickname: '아침형',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 10 * HOUR,
    viewCount: 27,
    beenThereCount: 3,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80',
    partySize: 1,
    totalSpend: 9,
    waitMinutes: 0,
    foodCategory: 'study',
    placeId: 'mock-place-ktown',
    placeName: '코리아타운 카페',
    latitude: 40.7479,
    longitude: -73.987,
  }),
  post({
    id: 'mock-food-2c',
    categoryId: 'food',
    title: '코리아타운 카페 — 말차 라떼',
    description: '말차 라떼가 생각보다 진하고 달지 않아요. 디저트랑 잘 맞음.',
    contentHtml: `<p>과제하다가 단 게 땡길 때 추천.</p>`,
    location: '코리아타운',
    detail: '기타',
    authorUid: 'mock-user-13',
    authorEmail: 'matcha@newschool.edu',
    authorNickname: '말차덕후',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 3 * DAY,
    viewCount: 51,
    beenThereCount: 7,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1515823662972-da45a9da5243?w=800&q=80',
    partySize: 2,
    totalSpend: 22,
    waitMinutes: 0,
    foodCategory: 'vibe',
    placeId: 'mock-place-ktown',
    placeName: '코리아타운 카페',
    latitude: 40.7479,
    longitude: -73.987,
  }),
  post({
    id: 'mock-food-3b',
    categoryId: 'food',
    title: '브루클린 브런치 — 친구 모임',
    description: '4명이서도 자리 잡기 괜찮았어요. 해시브라운 추가 추천.',
    contentHtml: `<p>주말 낮 친구 모임으로 재방문했습니다.</p>`,
    location: '브루클린',
    detail: '브런치',
    authorUid: 'mock-user-14',
    authorEmail: 'friends@baruch.edu',
    authorNickname: '브런치크루',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 12 * HOUR,
    viewCount: 19,
    beenThereCount: 2,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
    partySize: 4,
    totalSpend: 96,
    waitMinutes: 20,
    foodCategory: 'vibe',
    placeId: 'mock-place-brooklyn',
    placeName: '브루클린 브런치',
    latitude: 40.6782,
    longitude: -73.9442,
  }),
  post({
    id: 'mock-food-5',
    categoryId: 'food',
    title: '미드타운 비빔밥',
    description:
      '57번가 근처. 점심 특선이 빠르고 양도 괜찮아요. 회사원·학생 모두 많음.',
    contentHtml: `<p>미팅 전후로 가기 좋은 한식 런치 스팟입니다.</p>`,
    location: '미드타운',
    detail: '한식',
    authorUid: 'mock-user-15',
    authorEmail: 'midtown@nyu.edu',
    authorNickname: '미드타운러',
    authorSchoolId: 'nyu',
    authorSchoolName: 'New York University',
    createdAt: NOW - 2 * HOUR,
    viewCount: 74,
    beenThereCount: 12,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800&q=80',
    partySize: 2,
    totalSpend: 32,
    waitMinutes: 15,
    foodCategory: 'restaurant',
    placeId: 'mock-place-midtown',
    placeName: '미드타운 비빔밥',
    latitude: 40.7649,
    longitude: -73.9808,
    menuItems: [
      {
        id: 'm7',
        imageUrl:
          'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800&q=80',
        name: '돌솥비빔밥',
        caption: '밥알 고소',
      },
    ],
  }),
  post({
    id: 'mock-food-5b',
    categoryId: 'food',
    title: '미드타운 비빔밥 — 가성비 점심',
    description: '런치 콤보 $14. 반찬 리필 되고 속도 빠름.',
    contentHtml: `<p>빠르게 한끼 해결하기 최고입니다.</p>`,
    location: '미드타운',
    detail: '한식',
    authorUid: 'mock-user-16',
    authorEmail: 'quick@columbia.edu',
    authorNickname: '점심헌터',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 1 * DAY - 4 * HOUR,
    viewCount: 38,
    beenThereCount: 8,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80',
    partySize: 1,
    totalSpend: 14,
    waitMinutes: 5,
    foodCategory: 'value',
    placeId: 'mock-place-midtown',
    placeName: '미드타운 비빔밥',
    latitude: 40.7649,
    longitude: -73.9808,
  }),
  post({
    id: 'mock-food-5c',
    categoryId: 'food',
    title: '미드타운 비빔밥 — 저녁 반반',
    description: '저녁은 불고기 반반이 진리. 좌석은 좀 붐빔.',
    contentHtml: `<p>저녁 메뉴는 런치보다 선택의 폭이 넓어요.</p>`,
    location: '미드타운',
    detail: '한식',
    authorUid: 'mock-user-17',
    authorEmail: 'dinner@hunter.cuny.edu',
    authorNickname: '불고기파',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 4 * DAY,
    viewCount: 29,
    beenThereCount: 6,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80',
    partySize: 2,
    totalSpend: 41,
    waitMinutes: 25,
    foodCategory: 'restaurant',
    placeId: 'mock-place-midtown',
    placeName: '미드타운 비빔밥',
    latitude: 40.7649,
    longitude: -73.9808,
  }),
  post({
    id: 'mock-food-6',
    categoryId: 'food',
    title: '이스트빌리지 라멘',
    description: '국물이 진하고 차슈가 부드러워요. 저녁 줄이 길 수 있음.',
    contentHtml: `<p>이스트빌리지에서 자주 가는 라멘집입니다.</p>`,
    location: '이스트빌리지',
    detail: '일식',
    authorUid: 'mock-user-18',
    authorEmail: 'ramen@nyu.edu',
    authorNickname: '라멘헌터',
    authorSchoolId: 'nyu',
    authorSchoolName: 'New York University',
    createdAt: NOW - 7 * HOUR,
    viewCount: 63,
    beenThereCount: 9,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
    partySize: 2,
    totalSpend: 38,
    waitMinutes: 20,
    foodCategory: 'restaurant',
    placeId: 'mock-place-ev-ramen',
    placeName: '이스트빌리지 라멘',
    latitude: 40.7265,
    longitude: -73.9815,
  }),
  post({
    id: 'mock-food-6b',
    categoryId: 'food',
    title: '이스트빌리지 라멘 — 미소 추천',
    description: '쇼유보다 미소가 더 깊었어요. 계란 추가 강추.',
    contentHtml: `<p>두 번째 방문, 미소 라멘으로 정착했습니다.</p>`,
    location: '이스트빌리지',
    detail: '일식',
    authorUid: 'mock-user-19',
    authorEmail: 'miso@columbia.edu',
    authorNickname: '미소파',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 2 * DAY,
    viewCount: 22,
    beenThereCount: 3,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&q=80',
    partySize: 1,
    totalSpend: 19,
    waitMinutes: 10,
    foodCategory: 'vibe',
    placeId: 'mock-place-ev-ramen',
    placeName: '이스트빌리지 라멘',
    latitude: 40.7265,
    longitude: -73.9815,
  }),
  post({
    id: 'mock-food-7',
    categoryId: 'food',
    title: '웨스트빌리지 파스타',
    description: '수제 파스타가 쫄깃하고 트러플 오일 파스타가 인기예요.',
    contentHtml: `<p>데이트하기 좋은 이탈리안입니다.</p>`,
    location: '웨스트빌리지',
    detail: '이탈리안',
    authorUid: 'mock-user-20',
    authorEmail: 'pasta@newschool.edu',
    authorNickname: '파스타러버',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 9 * HOUR,
    viewCount: 47,
    beenThereCount: 5,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80',
    partySize: 2,
    totalSpend: 72,
    waitMinutes: 15,
    foodCategory: 'vibe',
    placeId: 'mock-place-wv-pasta',
    placeName: '웨스트빌리지 파스타',
    latitude: 40.7359,
    longitude: -74.003,
  }),
  post({
    id: 'mock-food-8',
    categoryId: 'food',
    title: '퀸즈 타코',
    description: '알 파스토르가 불향 좋고 가격도 착해요. 2–3개면 충분.',
    contentHtml: `<p>가성비 좋은 멕시칸 타코 트럭/샵 후기.</p>`,
    location: '퀸즈',
    detail: '멕시칸',
    authorUid: 'mock-user-21',
    authorEmail: 'taco@hunter.cuny.edu',
    authorNickname: '타코데이',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 15 * HOUR,
    viewCount: 35,
    beenThereCount: 7,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
    partySize: 2,
    totalSpend: 24,
    waitMinutes: 0,
    foodCategory: 'value',
    placeId: 'mock-place-queens-taco',
    placeName: '퀸즈 타코',
    latitude: 40.7421,
    longitude: -73.9187,
  }),
  post({
    id: 'mock-market-1',
    categoryId: 'marketplace',
    title: 'IKEA 책장 — 맨해튼 픽업',
    description:
      '이사해서 급처분합니다. 사용감 있으나 안정적이에요. 직접 픽업만 가능.',
    contentHtml: `
      <p>이사 때문에 책장을 정리합니다.</p>
      <ul>
        <li>가로 약 80cm / 높이 약 150cm</li>
        <li>스크래치 약간 있음</li>
        <li>조립된 상태 그대로 가져가시면 됩니다</li>
      </ul>
      <p><strong>희망가 $40</strong> · 어퍼웨스트 픽업만 가능합니다. DM 주세요.</p>
    `,
    location: '어퍼웨스트',
    detail: '40',
    authorUid: 'mock-user-4',
    authorEmail: 'moveout@baruch.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 5 * HOUR,
  }),
  post({
    id: 'mock-market-2',
    categoryId: 'marketplace',
    title: '모니터 27인치 — 상태 좋음',
    description:
      '재택 줄어서 팝니다. HDMI 케이블 포함. 퀸즈 미팅 가능.',
    contentHtml: `
      <p>재택 빈도 줄어서 여분 모니터를 정리합니다.</p>
      <h2>스펙</h2>
      <ul>
        <li>27인치 IPS</li>
        <li>HDMI / DP</li>
        <li>스탠드 포함</li>
      </ul>
      <p>박스 없지만 화면/외관 이상 없습니다. <strong>$90</strong>에 드려요.</p>
    `,
    location: '퀸즈',
    detail: '90',
    authorUid: 'mock-user-5',
    authorEmail: 'desk@nyu.edu',
    authorSchoolId: 'nyu',
    authorSchoolName: 'New York University',
    createdAt: NOW - 20 * HOUR,
  }),
  post({
    id: 'mock-market-3',
    categoryId: 'marketplace',
    title: '겨울 패딩 나눔 — S/M',
    description: '사이즈가 안 맞아서 나눔합니다. 깨끗하게 세탁했어요.',
    contentHtml: `
      <p>작년에 산 패딩인데 사이즈가 커서 나눔합니다.</p>
      <p>세탁 완료했고, 냄새 거의 없어요. 원하시면 사진 더 보내드릴게요.</p>
      <p>브루클린 미팅 선호합니다.</p>
    `,
    location: '브루클린',
    detail: '0',
    authorUid: 'mock-user-6',
    authorEmail: 'share@newschool.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 3 * DAY,
  }),
  post({
    id: 'mock-cpt-1',
    categoryId: 'status',
    title: 'CPT 신청 타임라인 — 내가 겪은 순서',
    description:
      '학교 ISS / 회사 offer / I-20 순서만 정리해도 훨씬 수월해졌어요.',
    contentHtml: `
      <p>CPT 처음 신청할 때 헷갈렸던 부분을 순서대로 남깁니다.</p>
      <h2>제가 한 순서</h2>
      <ol>
        <li>오퍼레터 수령</li>
        <li>학교 CPT 신청서 제출</li>
        <li>어드바이저 미팅</li>
        <li>새 I-20 수령 후 근무 시작</li>
      </ol>
      <p>회사 시작일보다 <strong>최소 2–3주 전</strong>에 서류 넣는 걸 추천합니다.</p>
      <blockquote>학교마다 포털/양식이 다르니 ISS 체크리스트를 먼저 보세요.</blockquote>
    `,
    location: 'NYU',
    detail: 'CPT',
    cptOptType: 'cpt',
    cptOptTips:
      '회사 시작일보다 최소 2–3주 전에 학교에 서류를 넣으세요. 학교마다 포털/양식이 달라 ISS 체크리스트를 먼저 확인하는 게 좋아요.',
    cptOptTimeline: [
      {
        id: 't1',
        date: '2025-01-10',
        prepared: '오퍼레터, CPT 신청서 초안',
        submitted: '',
        resultReceived: '',
        nextStep: '어드바이저 서명 받고 ISS에 제출',
      },
      {
        id: 't2',
        date: '2025-01-18',
        prepared: '어드바이저 서명',
        submitted: 'ISS 포털에 PDF 업로드',
        resultReceived: '',
        nextStep: '새 I-20 이메일 수령 대기',
      },
      {
        id: 't3',
        date: '2025-01-28',
        prepared: '',
        submitted: '',
        resultReceived: '새 I-20 PDF 이메일 수령',
        nextStep: '서명 후 근무 시작일 맞추기',
      },
    ],
    authorUid: 'mock-user-7',
    authorEmail: 'cpt@nyu.edu',
    authorSchoolId: 'nyu',
    authorSchoolName: 'New York University',
    createdAt: NOW - 8 * HOUR,
    updatedAt: NOW - 25 * MINUTE,
  }),
  post({
    id: 'mock-cpt-2',
    categoryId: 'status',
    title: 'OPT 카드 수령까지 — 대기 팁',
    description:
      'EAD 카드 기다리는 동안 이력서/네트워킹을 미리 해두면 좋아요.',
    contentHtml: `
      <p>OPT 신청 후 카드 오기까지 시간이 꽤 걸렸습니다.</p>
      <h2>도움이 된 것</h2>
      <ul>
        <li>USCIS 계정에서 case status 주기적으로 확인</li>
        <li>카드 오기 전에도 인터뷰는 진행</li>
        <li>졸업 전 STEM OPT 요건도 같이 체크</li>
      </ul>
      <p>대기 기간에 포트폴리오를 정리해 둔 게 가장 도움이 됐어요.</p>
    `,
    location: '테크 스타트업',
    detail: 'OPT',
    cptOptType: 'opt',
    cptOptTips:
      '카드 오기 전에도 네트워킹·포트폴리오 정리는 미리 시작하세요. USCIS 계정에서 case status를 주기적으로 확인하면 마음이 편해요.',
    cptOptTimeline: [
      {
        id: 't4',
        date: '2024-11-05',
        prepared: 'I-765, 사진, 수수료',
        submitted: 'USCIS 온라인 제출',
        resultReceived: '',
        nextStep: '케이스 상태 주기적으로 확인',
      },
      {
        id: 't5',
        date: '2025-02-14',
        prepared: '',
        submitted: '',
        resultReceived: 'EAD 카드 우편 수령',
        nextStep: '근무 시작·STEM 연장 요건 확인',
      },
    ],
    authorUid: 'mock-user-8',
    authorEmail: 'opt@columbia.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 2 * DAY,
  }),
  post({
    id: 'mock-cpt-3',
    categoryId: 'status',
    title: 'STEM OPT — 보고서 일정 메모',
    description:
      '6/12/18개월 보고 일정을 캘린더에 미리 넣어두세요. 놓치면 골치 아픕니다.',
    contentHtml: `
      <p>STEM OPT 연장 후 보고 일정을 정리해 둡니다.</p>
      <h2>체크할 것</h2>
      <ul>
        <li>Validation report due dates</li>
        <li>회사 주소/직함 변경 시 즉시 업데이트</li>
        <li>DSO 연락처 저장</li>
      </ul>
      <p>저는 Google Calendar에 알림 3개를 걸어두고 있습니다. 추천해요.</p>
    `,
    location: '핀테크',
    detail: 'STEM OPT',
    cptOptType: 'stem-opt',
    cptOptTips:
      'Validation report 마감일을 캘린더에 3번 알림 걸어두세요. 회사 주소·직함 변경 시 즉시 SEVP 포털 업데이트가 필요합니다.',
    cptOptTimeline: [
      {
        id: 't6',
        date: '2024-06-01',
        prepared: 'I-983, 회사 정보',
        submitted: 'STEM OPT 연장 신청',
        resultReceived: '',
        nextStep: '승인 통지·validation report 일정 확인',
      },
      {
        id: 't7',
        date: '2024-08-20',
        prepared: '',
        submitted: '',
        resultReceived: 'I-797 승인 통지',
        nextStep: '6·12·18개월 보고 알림 설정',
      },
    ],
    authorUid: 'mock-user-9',
    authorEmail: 'stem@baruch.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 4 * DAY,
  }),
  post({
    id: 'mock-job-1',
    categoryId: 'job-review',
    title: 'Google SWE Intern — 3라운드 면접 후기',
    description:
      'Handshake로 지원 → OA → Phone → Virtual onsite. 총 3주 걸렸어요.',
    contentHtml: `
      <p>2024 Summer SWE Intern 전형 후기입니다.</p>
      <ul>
        <li>OA는 LC medium 2문제, 90분</li>
        <li>Phone은 resume deep dive + behavioral</li>
        <li>Onsite는 coding 2 + Googleyness 1</li>
      </ul>
      <p>Referral 없이 Handshake cold apply로 시작했어요.</p>
    `,
    location: 'Google',
    detail: '인턴',
    jobReviewType: 'intern',
    jobReviewIndustry: '테크',
    jobReviewTips:
      'OA 전에 LC medium 타이머 연습 2주 추천. Handshake보다 LinkedIn referral 응답률이 더 좋았다는 후기도 많아요.',
    jobReviewTimeline: [
      {
        id: 'jr1',
        date: '2024-01-10',
        stageLabel: '서류 지원',
        platform: 'Handshake',
        documentsSubmitted: 'Resume, Transcript',
        interviewRound: '',
        stageReviewHtml:
          '<p>Cold apply로 시작했고, 3일 후 OA 초대 메일을 받았어요.</p>',
        outcome: 'Pass',
      },
      {
        id: 'jr2',
        date: '2024-01-15',
        stageLabel: 'Online Assessment',
        platform: 'HackerRank',
        documentsSubmitted: '',
        interviewRound: 'OA',
        stageReviewHtml:
          '<p>LC medium 2문제, 90분 제한이었어요. 타이머 연습이 도움이 됐습니다.</p>',
        outcome: 'Pass',
      },
      {
        id: 'jr3',
        date: '2024-01-25',
        stageLabel: 'Virtual Onsite',
        platform: 'Google Meet',
        documentsSubmitted: '',
        interviewRound: 'Final (3 rounds)',
        stageReviewHtml:
          '<p>Coding 2라운드 + Googleyness 1라운드. 카메라 ON, 노트 필기 허용.</p>',
        outcome: 'Offer',
      },
    ],
    authorUid: 'mock-user-10',
    authorEmail: 'intern@nyu.edu',
    authorSchoolId: 'nyu',
    authorSchoolName: 'NYU',
    createdAt: NOW - 3 * DAY,
    updatedAt: NOW - 2 * HOUR,
  }),
  post({
    id: 'mock-job-2',
    categoryId: 'job-review',
    title: 'JP Morgan Analyst — Superday 후기',
    description: 'Campus recruiting, 1차 networking → Superday까지 6주.',
    contentHtml: `
      <p>금융 Analyst 신입 전형 후기입니다.</p>
      <p>Behavioral + Case + Fit interview가 Superday에서 연속으로 진행됐어요.</p>
    `,
    location: 'JP Morgan',
    detail: '신입',
    jobReviewType: 'new-grad',
    jobReviewIndustry: '금융',
    jobReviewTips:
      'Superday 전날은 질문 리스트만 보고 새로운 걸 외우지 마세요. Why JPM, Why NYC는 꼭 준비.',
    jobReviewTimeline: [
      {
        id: 'jr4',
        date: '2023-09-01',
        stageLabel: 'Campus Info Session',
        platform: '학교 Career Fair',
        documentsSubmitted: 'Resume',
        interviewRound: 'Networking',
        stageReviewHtml:
          '<p>Recruiter 1:1 후 follow-up email을 같은 날 보냈어요.</p>',
        outcome: 'Pass',
      },
      {
        id: 'jr5',
        date: '2023-10-15',
        stageLabel: 'Superday',
        platform: 'In-person NYC',
        documentsSubmitted: '',
        interviewRound: '4 rounds',
        stageReviewHtml:
          '<p>Behavioral, Case, Fit, Senior MD 인터뷰가 하루에 연속으로 진행됐어요.</p>',
        outcome: 'Offer',
      },
    ],
    authorUid: 'mock-user-11',
    authorEmail: 'finance@columbia.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 6 * DAY,
  }),
  post({
    id: 'mock-anon-1',
    categoryId: 'anonymous',
    title: 'OPT 없이 남은 기간, 어떻게 보내고 계세요?',
    description:
      '졸업 후 카드 오기 전까지 시간이 길어서 불안해요. 비슷한 경험 있으신 분 조언 부탁드려요.',
    contentHtml: `
      <p>졸업은 했는데 EAD 카드가 아직 안 와서 마음이 조급합니다.</p>
      <p>그동안 네트워킹·포트폴리오 정리는 하고 있는데, 합법적으로 할 수 있는 일이 더 있는지 궁금해요.</p>
    `,
    location: '고민 · 질문',
    detail: '',
    authorUid: 'mock-user-12',
    authorEmail: 'anon@example.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 5 * HOUR,
    viewCount: 42,
  }),
  post({
    id: 'mock-anon-2',
    categoryId: 'anonymous',
    title: '맨해튼에서 혼밥하기 좋은 곳 추천해 주세요',
    description: '바에 앉아서 혼자 밥 먹기 편한 곳 있으면 알려주세요.',
    contentHtml: `
      <p>퇴근 후 혼자 식사할 때 부담 없는 분위기의 식당을 찾고 있어요.</p>
      <p>가격대는 $15–25 정도면 좋겠습니다.</p>
    `,
    location: '일상',
    detail: '',
    authorUid: 'mock-user-13',
    authorEmail: 'anon2@example.com',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 1 * DAY,
    viewCount: 67,
  }),
  post({
    id: 'mock-roommate-1',
    categoryId: 'roommate',
    title: '브루클린에서 룸메이트 구해요',
    description:
      '조용한 생활 패턴, 주말 외에는 재택 위주입니다. 예산은 $1,400까지 가능해요.',
    contentHtml: `
      <p>Bushwick / Williamsburg 쪽 2bed에서 룸메이트를 구합니다.</p>
      <ul>
        <li>조용한 편, 주중 재택</li>
        <li>반려동물 없음</li>
        <li>보증금·유틸 협의 가능</li>
      </ul>
    `,
    location: '브루클린',
    detail: '룸메이트 구해요',
    roommateLookingFor: 'roommate',
    roommateBudgetMax: 1400,
    roommateMoveInDate: '2026-09-01',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    galleryPhotos: [
      {
        id: 'g1',
        imageUrl:
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        caption: '',
      },
      {
        id: 'g2',
        imageUrl:
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
        caption: '',
      },
    ],
    authorUid: 'mock-user-20',
    authorEmail: 'roommate@nyu.edu',
    authorSchoolId: 'nyu',
    authorSchoolName: 'NYU',
    createdAt: NOW - 10 * HOUR,
    viewCount: 31,
  }),
  post({
    id: 'mock-roommate-2',
    categoryId: 'roommate',
    title: '맨해튼 서블렛 — 9~11월',
    description: '유학 중 잠시 비는 방 서블렛합니다. 가구 포함, 지하철 5분.',
    contentHtml: `
      <p>Upper East Side studio를 9월~11월 서블렛합니다.</p>
      <p>침대·책상·주방용품 포함이고, 6 train 도보 5분입니다.</p>
    `,
    location: '맨해튼 UES',
    detail: '서블렛',
    roommateLookingFor: 'sublet',
    roommateBudgetMax: 2200,
    roommateMoveInDate: '2026-09-15',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    galleryPhotos: [
      {
        id: 'g3',
        imageUrl:
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        caption: '',
      },
    ],
    authorUid: 'mock-user-21',
    authorEmail: 'sublet@columbia.edu',
    authorSchoolId: null,
    authorSchoolName: null,
    createdAt: NOW - 2 * DAY,
    viewCount: 54,
  }),
]

export function listMockCommunityPosts(
  boardId?: NycCommunityBoardId,
): CommunityPost[] {
  const items = COMMUNITY_MOCK_POSTS.filter(
    (item) => !boardId || item.categoryId === boardId,
  )
  if (boardId === 'status' || boardId === 'job-review') {
    return items.sort(
      (a, b) =>
        b.updatedAt - a.updatedAt || b.createdAt - a.createdAt,
    )
  }
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

export function getMockCommunityPost(id: string): CommunityPost | null {
  return COMMUNITY_MOCK_POSTS.find((item) => item.id === id) ?? null
}

export function extractFirstImageSrc(html: string | null | undefined) {
  if (!html) return null
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1]?.trim() || null
}

export function formatCommunityCount(value: number) {
  const n = Math.max(0, Math.floor(Number(value) || 0))
  if (n >= 10_000) return `${Math.floor(n / 1000)}천+`
  return n.toLocaleString('ko-KR')
}

export function formatCommunityRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '방금'
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  })
}
