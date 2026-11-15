import { CITY_IDS, type CityId } from '@lib/constants/cities'
import { getPointsConfig } from '@lib/points/config.server'
import { SUPER_ADMIN_EMAIL } from '@lib/support/staffPush.server'

/**
 * 공개 중인 도시. nyc·boston은 항상 열려 있고, dc는 point setting `cities.dc.enabled`로 켜고 끈다
 * (법무 검토 전에는 닫아 둔다). 설정은 30초 캐시라 바꾼 뒤 반영까지 최대 30초 걸린다.
 */
export async function enabledCityIds(): Promise<CityId[]> {
  const config = await getPointsConfig()
  return CITY_IDS.filter((id) => id !== 'dc' || config.settings['cities.dc.enabled'])
}

/** 닫힌 도시도 미리 보는 계정 (Super Admin). DC를 열기 전 TestFlight·웹에서 확인용 */
export function seesClosedCities(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL
}

/** 이 사용자에게 보이는 도시: 공개 도시 + Super Admin이면 닫힌 도시까지 */
export async function visibleCityIds(email: string | null | undefined): Promise<CityId[]> {
  return seesClosedCities(email) ? [...CITY_IDS] : enabledCityIds()
}

export async function isCityEnabled(city: CityId): Promise<boolean> {
  return (await enabledCityIds()).includes(city)
}
