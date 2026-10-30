import type { NycCategoryId } from '@lib/constants/nyc'

/**
 * Ellieo home content that doesn't exist yet (partner VSAs, creators, Vietnamese community posts).
 * MOCK DATA: all names, numbers and posts below are made up for design review.
 * Shown only when NEXT_PUBLIC_ELLIEO_MOCK_CONTENT=1 (set in .env.local, never in production),
 * so a production build shows only real partners/posts and hides empty sections.
 * Replace with real partners (later managed from the ERP) once agreements are signed.
 */
export const ELLIEO_MOCK_CONTENT = process.env.NEXT_PUBLIC_ELLIEO_MOCK_CONTENT === '1'

type Localized = { en: string; vi: string }

export type EllieoPartnerOrg = {
  id: string
  /** Short mark shown in the logo circle */
  mark: string
  name: string
  school: string
  members: number
  /** Logo circle color */
  color: string
  instagram?: string
}

export type EllieoCreator = {
  id: string
  name: string
  platform: 'instagram' | 'youtube' | 'tiktok'
  followers: number
  topic: Localized
  color: string
  handle?: string
}

export type EllieoCommunityPost = {
  id: string
  board: NycCategoryId
  title: Localized
  excerpt: Localized
  school: string
  hoursAgo: number
  comments: number
}

/** Real partners go here (empty until agreements are signed) */
export const ELLIEO_PARTNER_ORGS: readonly EllieoPartnerOrg[] = []
export const ELLIEO_CREATORS: readonly EllieoCreator[] = []

const MOCK_PARTNER_ORGS: readonly EllieoPartnerOrg[] = [
  { id: 'mock-nyu', mark: 'NYU', name: 'NYU Vietnamese Student Association', school: 'New York University', members: 240, color: '#57068c' },
  { id: 'mock-columbia', mark: 'CU', name: 'Columbia Vietnamese Students Association', school: 'Columbia University', members: 180, color: '#1d4f91' },
  { id: 'mock-baruch', mark: 'BC', name: 'Baruch Vietnamese Student Association', school: 'Baruch College', members: 150, color: '#0e7c86' },
  { id: 'mock-pace', mark: 'PACE', name: 'Pace Vietnamese Student Association', school: 'Pace University', members: 95, color: '#c8102e' },
  { id: 'mock-sbu', mark: 'SBU', name: 'Stony Brook Vietnamese Student Association', school: 'Stony Brook University', members: 210, color: '#990000' },
]

const MOCK_CREATORS: readonly EllieoCreator[] = [
  {
    id: 'mock-linh',
    name: 'Linh Nguyễn',
    platform: 'youtube',
    followers: 48_000,
    topic: { en: 'Student life vlogs in Manhattan', vi: 'Vlog đời sống du học sinh ở Manhattan' },
    color: '#f2a516',
  },
  {
    id: 'mock-minh',
    name: 'Minh Trần',
    platform: 'tiktok',
    followers: 120_000,
    topic: { en: 'OPT, H-1B and first-job tips', vi: 'Mẹo OPT, H-1B và công việc đầu tiên' },
    color: '#1f5eff',
  },
  {
    id: 'mock-thao',
    name: 'Thảo Phạm',
    platform: 'instagram',
    followers: 35_000,
    topic: { en: 'Vietnamese food spots in NYC', vi: 'Quán ăn Việt ở New York' },
    color: '#0b8f6a',
  },
  {
    id: 'mock-huy',
    name: 'Huy Lê',
    platform: 'youtube',
    followers: 22_000,
    topic: { en: 'Renting and budgeting as a student', vi: 'Thuê nhà và quản lý chi tiêu khi đi học' },
    color: '#7a4cff',
  },
]

const MOCK_POSTS: readonly EllieoCommunityPost[] = [
  {
    id: 'mock-p1',
    board: 'status',
    title: { en: 'OPT approved in 62 days: my timeline', vi: 'OPT được duyệt sau 62 ngày: mốc thời gian của mình' },
    excerpt: {
      en: 'Filed online in March, no RFE. Sharing every date from I-20 to the EAD card in my mailbox.',
      vi: 'Nộp online tháng 3, không bị RFE. Chia sẻ từng mốc từ I-20 đến lúc nhận thẻ EAD.',
    },
    school: 'Baruch College',
    hoursAgo: 3,
    comments: 14,
  },
  {
    id: 'mock-p2',
    board: 'roommate',
    title: { en: 'Looking for a roommate near NYU for January', vi: 'Tìm bạn ở ghép gần NYU từ tháng 1' },
    excerpt: {
      en: 'Private room in a 2BR, $1,450/month, no broker fee. Quiet, non-smoker, cooks Vietnamese food a lot.',
      vi: 'Phòng riêng trong căn 2PN, $1,450/tháng, không phí môi giới. Mình yên tĩnh, không hút thuốc, hay nấu đồ Việt.',
    },
    school: 'New York University',
    hoursAgo: 6,
    comments: 8,
  },
  {
    id: 'mock-p3',
    board: 'food',
    title: { en: 'Best phở in Manhattan? My top 5 after a semester', vi: 'Phở ngon nhất Manhattan? Top 5 của mình sau một học kỳ' },
    excerpt: {
      en: 'Ranked by broth, price and how close they are to the subway. Number one surprised me.',
      vi: 'Xếp theo nước dùng, giá và độ gần ga tàu điện ngầm. Quán số 1 làm mình bất ngờ.',
    },
    school: 'Columbia University',
    hoursAgo: 20,
    comments: 23,
  },
  {
    id: 'mock-p4',
    board: 'job-review',
    title: { en: 'Big 4 audit intern interview: questions I got', vi: 'Phỏng vấn thực tập kiểm toán Big 4: các câu hỏi mình gặp' },
    excerpt: {
      en: 'Two rounds, behavioral plus a short case. They asked about sponsorship in the first call.',
      vi: 'Hai vòng, phỏng vấn hành vi và một case ngắn. Họ hỏi về bảo lãnh visa ngay cuộc gọi đầu.',
    },
    school: 'Pace University',
    hoursAgo: 28,
    comments: 11,
  },
  {
    id: 'mock-p5',
    board: 'housing',
    title: { en: 'Is a $500 "holding fee" before a viewing normal?', vi: 'Phí giữ chỗ $500 trước khi xem nhà có bình thường không?' },
    excerpt: {
      en: 'A landlord on Facebook wants Zelle before showing the room. Feels off. Has anyone seen this?',
      vi: 'Chủ nhà trên Facebook muốn chuyển Zelle trước khi cho xem phòng. Thấy không ổn, có ai gặp chưa?',
    },
    school: 'Stony Brook University',
    hoursAgo: 40,
    comments: 19,
  },
  {
    id: 'mock-p6',
    board: 'events',
    title: { en: 'Tết 2027 gathering: who is in?', vi: 'Họp mặt Tết 2027: ai tham gia không?' },
    excerpt: {
      en: 'Thinking of a potluck in Queens in February. Bring one dish from your hometown.',
      vi: 'Dự định tổ chức potluck ở Queens vào tháng 2. Mỗi người mang một món quê nhà.',
    },
    school: 'Hunter College',
    hoursAgo: 52,
    comments: 31,
  },
]

export function getPartnerOrgs(): readonly EllieoPartnerOrg[] {
  return ELLIEO_PARTNER_ORGS.length > 0 || !ELLIEO_MOCK_CONTENT ? ELLIEO_PARTNER_ORGS : MOCK_PARTNER_ORGS
}

export function getCreators(): readonly EllieoCreator[] {
  return ELLIEO_CREATORS.length > 0 || !ELLIEO_MOCK_CONTENT ? ELLIEO_CREATORS : MOCK_CREATORS
}

/** Vietnamese community posts don't exist yet; real Misaeng posts are Korean, so the home doesn't show them */
export function getCommunityHighlights(): readonly EllieoCommunityPost[] {
  return ELLIEO_MOCK_CONTENT ? MOCK_POSTS : []
}

/** True when the list shown is sample data (labels the section so nobody mistakes it for real partners) */
export function isMockList(list: readonly unknown[], real: readonly unknown[]): boolean {
  return list.length > 0 && list !== real
}
