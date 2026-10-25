/** 모든 도시가 같은 목록을 보는 파트너 학생회·인플루언서 */

/** 문구 키 `orgs.<id>.name` (partners 네임스페이스) */
export const PARTNER_ORGS = [
  {
    id: 'nyu-kiso',
    shortName: 'NYU',
    handle: 'nyu_kiso',
    logoSrc: '/img/school/kiso.png',
  },
  {
    id: 'fit-ksof',
    shortName: 'FIT',
    handle: 'ksof_fit',
    logoSrc: '/img/school/fit.png',
  },
  {
    id: 'baruch-ksa',
    shortName: 'BC',
    handle: 'ksabaruch',
    logoSrc: '/img/school/baruch.png',
  },
  {
    id: 'parsons-ksa',
    shortName: 'PAR',
    handle: 'parsons.kisp',
    logoSrc: '/img/school/parsons.png',
  },
] as const

/** 문구 키 `influencerPlatforms.<id>.title` / `.description` (partners 네임스페이스) */
export const INFLUENCER_PLATFORMS = [
  { id: 'instagram' },
  { id: 'youtube' },
  { id: 'tiktok' },
] as const

export type InfluencerPlatformId =
  (typeof INFLUENCER_PLATFORMS)[number]['id']

/**
 * 협력 인플루언서. handle이 있으면 플랫폼 프로필로 연결.
 * 모집 중 자리는 `nameKey` 문구(`influencers.<nameKey>`, partners 네임스페이스)를 보여 준다.
 */
export const PARTNER_INFLUENCERS = [
  {
    id: 'ig-recruiting-1',
    nameKey: 'recruitingTitle',
    shortName: 'IG',
    handle: null,
    platform: 'instagram',
  },
  {
    id: 'ig-recruiting-2',
    nameKey: 'searching',
    shortName: 'IG',
    handle: null,
    platform: 'instagram',
  },
  {
    id: 'yt-recruiting-1',
    nameKey: 'recruitingTitle',
    shortName: 'YT',
    handle: null,
    platform: 'youtube',
  },
  {
    id: 'yt-recruiting-2',
    nameKey: 'searching',
    shortName: 'YT',
    handle: null,
    platform: 'youtube',
  },
  {
    id: 'tt-recruiting-1',
    nameKey: 'recruitingTitle',
    shortName: 'TT',
    handle: null,
    platform: 'tiktok',
  },
  {
    id: 'tt-recruiting-2',
    nameKey: 'searching',
    shortName: 'TT',
    handle: null,
    platform: 'tiktok',
  },
] as const satisfies ReadonlyArray<{
  id: string
  nameKey: 'recruitingTitle' | 'searching'
  shortName: string
  handle: string | null
  platform: InfluencerPlatformId
}>
