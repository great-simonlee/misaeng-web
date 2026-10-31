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
  /** Logo circle color */
  color: string
  instagram?: string
}

export type EllieoCreator = {
  id: string
  name: string
  platform: 'instagram' | 'youtube' | 'tiktok'
  followers: number
  color: string
  handle?: string
}

export type EllieoCommunityPost = {
  id: string
  board: NycCategoryId
  title: Localized
  excerpt: Localized
  /** Display nickname (members post under a nickname; the school badge is the verification) */
  nickname: string
  school: string
  hoursAgo: number
  likes: number
  comments: number
}

/** Real partners go here (empty until agreements are signed) */
export const ELLIEO_PARTNER_ORGS: readonly EllieoPartnerOrg[] = []
export const ELLIEO_CREATORS: readonly EllieoCreator[] = []

const MOCK_PARTNER_ORGS: readonly EllieoPartnerOrg[] = [
  { id: 'mock-nyu', mark: 'NYU', name: 'NYU VSA', school: 'New York University', color: '#57068c' },
  { id: 'mock-columbia', mark: 'CU', name: 'Columbia VSA', school: 'Columbia University', color: '#1d4f91' },
  { id: 'mock-baruch', mark: 'BC', name: 'Baruch VSA', school: 'Baruch College', color: '#0e7c86' },
  { id: 'mock-pace', mark: 'PU', name: 'Pace VSA', school: 'Pace University', color: '#c8102e' },
  { id: 'mock-sbu', mark: 'SBU', name: 'SBU VSA', school: 'Stony Brook University', color: '#990000' },
]

const MOCK_CREATORS: readonly EllieoCreator[] = [
  {
    id: 'mock-linh',
    name: 'Linh Nguyễn',
    platform: 'youtube',
    followers: 48_000,
    color: '#f2a516',
  },
  {
    id: 'mock-minh',
    name: 'Minh Trần',
    platform: 'tiktok',
    followers: 120_000,
    color: '#1f5eff',
  },
  {
    id: 'mock-thao',
    name: 'Thảo Phạm',
    platform: 'instagram',
    followers: 35_000,
    color: '#0b8f6a',
  },
  {
    id: 'mock-huy',
    name: 'Huy Lê',
    platform: 'youtube',
    followers: 22_000,
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
    nickname: 'minh.opt',
    school: 'Baruch College',
    hoursAgo: 3,
    likes: 24,
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
    nickname: 'linhh_nyc',
    school: 'New York University',
    hoursAgo: 6,
    likes: 9,
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
    nickname: 'phoholic',
    school: 'Columbia University',
    hoursAgo: 20,
    likes: 57,
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
    nickname: 'an.audits',
    school: 'Pace University',
    hoursAgo: 28,
    likes: 18,
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
    nickname: 'newinqueens',
    school: 'Stony Brook University',
    hoursAgo: 40,
    likes: 33,
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
    nickname: 'tet.nyc',
    school: 'Hunter College',
    hoursAgo: 52,
    likes: 46,
    comments: 31,
  },
]

export type EllieoRoommatePost = {
  id: string
  kind: 'roommate' | 'sublet'
  title: Localized
  area: string
  /** Monthly rent in USD */
  rent: number
  /** ISO date (move-in or sublet start) */
  from: string
  school: string
}

const MOCK_ROOMMATES: readonly EllieoRoommatePost[] = [
  {
    id: 'mock-r1',
    kind: 'roommate',
    title: { en: 'Female roommate wanted, 2BR near NYU', vi: 'Tìm bạn nữ ở ghép, căn 2PN gần NYU' },
    area: 'East Village',
    rent: 1450,
    from: '2027-01-01',
    school: 'New York University',
  },
  {
    id: 'mock-r2',
    kind: 'sublet',
    title: { en: 'Winter break sublet, private room', vi: 'Cho thuê lại phòng riêng dịp nghỉ đông' },
    area: 'Long Island City',
    rent: 1200,
    from: '2026-12-15',
    school: 'Baruch College',
  },
  {
    id: 'mock-r3',
    kind: 'roommate',
    title: { en: 'Looking for 1 more for a 3BR in Astoria', vi: 'Cần thêm 1 người cho căn 3PN ở Astoria' },
    area: 'Astoria',
    rent: 1100,
    from: '2027-02-01',
    school: 'Columbia University',
  },
  {
    id: 'mock-r4',
    kind: 'sublet',
    title: { en: 'Spring semester sublet, 5 min to Pace', vi: 'Cho thuê lại học kỳ xuân, 5 phút tới Pace' },
    area: 'Financial District',
    rent: 1650,
    from: '2027-01-20',
    school: 'Pace University',
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

/** Vietnamese roommate/sublet posts don't exist yet (real ones are Misaeng's, in Korean) */
export function getRoommateHighlights(): readonly EllieoRoommatePost[] {
  return ELLIEO_MOCK_CONTENT ? MOCK_ROOMMATES : []
}

/** True when the list shown is sample data (labels the section so nobody mistakes it for real partners) */
export function isMockList(list: readonly unknown[], real: readonly unknown[]): boolean {
  return list.length > 0 && list !== real
}
