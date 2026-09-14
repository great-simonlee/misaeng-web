/** 모든 도시가 같은 목록을 보는 파트너 학생회·인플루언서 */

export const PARTNER_ORGS = [
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

export const INFLUENCER_PLATFORMS = [
  {
    id: 'instagram',
    title: '인스타그램',
    description: '라이프·로컬 인스타그램',
  },
  {
    id: 'youtube',
    title: '유튜버',
    description: '브이로그·정보 유튜브',
  },
  {
    id: 'tiktok',
    title: '틱토커',
    description: '숏폼으로 보는 로컬 소식',
  },
] as const

export type InfluencerPlatformId =
  (typeof INFLUENCER_PLATFORMS)[number]['id']

/** 협력 인플루언서. handle이 있으면 플랫폼 프로필로 연결. */
export const PARTNER_INFLUENCERS = [
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
  platform: InfluencerPlatformId
}>
