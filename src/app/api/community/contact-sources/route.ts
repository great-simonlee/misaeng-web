import { NextResponse } from 'next/server'

import { BRAND_CONFIG } from '@lib/brand'
import { CITIES, isCityId } from '@lib/constants/cities'
import { listContactSourceOptions } from '@lib/community/contactSources'
import { getRequestLocale, getT } from '@lib/i18n/server'
import { getContactSourceConfig } from '@lib/supabase/contactSources.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 면접/취업 · 비자 글쓰기의 연락 경로 선택지 (웹·앱 공용). 이 브랜드에 보이는 활성 옵션만.
 * `?city=boston` → 학생회 중 그 도시 묶음을 먼저
 */
export async function GET(request: Request) {
  const [config, locale] = await Promise.all([getContactSourceConfig(), getRequestLocale(request)])
  const tPartners = await getT(locale, 'partners')
  const city = new URL(request.url).searchParams.get('city')
  return NextResponse.json({
    options: listContactSourceOptions(config, BRAND_CONFIG.id, locale, {
      city,
      areaLabel: (area) => {
        const key = `orgGroups.${area}`
        const label = tPartners(key)
        if (label !== key) return label
        return isCityId(area) ? CITIES[area].name : tPartners('orgGroups.other')
      },
    }),
  })
}
