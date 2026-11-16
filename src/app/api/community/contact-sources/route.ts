import { NextResponse } from 'next/server'

import { BRAND_CONFIG } from '@lib/brand'
import { CITIES, isCityId } from '@lib/constants/cities'
import { listContactSourceCategories, listContactSourceOptions } from '@lib/community/contactSources'
import { getRequestLocale, getT } from '@lib/i18n/server'
import { getContactSourceConfig } from '@lib/supabase/contactSources.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 면접/취업 · 비자 글쓰기의 연락 경로 (웹·앱 공용). 이 브랜드에 보이는 활성 항목만.
 * `?v=2` → `{ categories }` (ERP에서 관리하는 카테고리 + 조직: 웹 · 앱 1.0.4+)
 * 없으면 → `{ options }` 예전 앱(1.0.3 이하)용 평평한 목록 (listContactSourceOptions)
 * `?city=boston` → 조직을 지역별로 묶을 때 그 도시를 먼저
 */
export async function GET(request: Request) {
  const [config, locale] = await Promise.all([getContactSourceConfig(), getRequestLocale(request)])
  const tPartners = await getT(locale, 'partners')
  const params = new URL(request.url).searchParams
  const list = {
    city: params.get('city'),
    areaLabel: (area: string) => {
      const key = `orgGroups.${area}`
      const label = tPartners(key)
      if (label !== key) return label
      return isCityId(area) ? CITIES[area].name : tPartners('orgGroups.other')
    },
  }
  if (params.get('v') === '2') {
    return NextResponse.json({
      categories: listContactSourceCategories(config, BRAND_CONFIG.id, locale, list),
    })
  }
  return NextResponse.json({ options: listContactSourceOptions(config, BRAND_CONFIG.id, locale, list) })
}
