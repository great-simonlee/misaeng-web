import type { CityId } from '@lib/constants/cities'
import { HOUSING_NEIGHBORHOODS } from '@lib/constants/housingMock'

/**
 * 하우징 지역 필터 순서. 중심 도시 동네가 먼저, 주변 주(NJ·CT / RI / MD·VA)는 맨 뒤에 묶는다.
 * 매물의 area는 ERP에서 자유 입력("LIC - Queensborough")이라 고정 목록과 실제 값을 합쳐서 보여 준다.
 * 앱 misaeng-app `HousingAreas.swift`와 같은 규칙이다.
 */
const CITY_AREAS: Record<CityId, readonly string[]> = {
  nyc: HOUSING_NEIGHBORHOODS,
  boston: ['Boston', 'Back Bay', 'Fenway', 'Allston', 'Brighton', 'Cambridge', 'Somerville', 'Brookline'],
  dc: ['Washington DC', 'Georgetown', 'Dupont Circle', 'Capitol Hill', 'Navy Yard', 'Foggy Bottom', 'Columbia Heights'],
}

const OUTER_AREAS: Record<CityId, RegExp> = {
  nyc: /\b(nj|new jersey|jersey city|hoboken|fort lee|edgewater|weehawken|palisades park|englewood|ct|connecticut|stamford|greenwich, ct|norwalk|new haven|hartford|bridgeport)\b/i,
  boston: /\b(ri|rhode island|providence|newport, ri)\b/i,
  dc: /\b(md|maryland|bethesda|silver spring|rockville|college park|gaithersburg|chevy chase|va|virginia|arlington|alexandria|fairfax|mclean|tysons|reston|falls church|annandale)\b/i,
}

export function isOuterHousingArea(city: CityId, area: string): boolean {
  return OUTER_AREAS[city].test(area)
}

/** 매물이 있는 지역(중심 → 주변) 다음에 매물이 없는 중심 동네 */
export function orderHousingAreas(city: CityId, counts: Record<string, number>): string[] {
  const known = CITY_AREAS[city]
  const rank = (area: string) => {
    const index = known.indexOf(area)
    return index === -1 ? known.length : index
  }
  const withPosts = Object.keys(counts)
    .filter((area) => area && counts[area] > 0)
    .sort((a, b) => {
      const outer = Number(isOuterHousingArea(city, a)) - Number(isOuterHousingArea(city, b))
      return outer || rank(a) - rank(b) || a.localeCompare(b)
    })
  const withoutPosts = known.filter((area) => !counts[area])
  return [...withPosts, ...withoutPosts]
}
