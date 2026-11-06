import { BRAND } from '@lib/brand'
import { NextResponse } from 'next/server'
import { getRequestLocale, getRequestT, getT } from '@lib/i18n/server'
import { resolveCityId } from '@lib/constants/cities'
import { companyMatchesQuery } from '@lib/company/companyRules'
import {
  countReviewsByCompany,
  industryLabelFrom,
  isCompanyStorageConfigured,
  listActiveCompanies,
  listIndustries,
  localizeIndustries,
} from '@lib/supabase/companies.server'
import { listPublicPostings } from '@lib/supabase/jobPostings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/companies?industry=tech&q=aws&city=nyc */
export async function GET(request: Request) {
  try {
    if (!isCompanyStorageConfigured()) {
      const t = await getRequestT(request, 'api')
      return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
    }
    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')?.trim() || ''
    const q = searchParams.get('q')?.trim() || ''
    const city = searchParams.get('city') ? resolveCityId(searchParams.get('city')) : undefined
    const locale = await getRequestLocale(request)

    const [companies, counts, industries, postings] = await Promise.all([
      listActiveCompanies(),
      countReviewsByCompany(city, locale),
      listIndustries().then(async (rows) => localizeIndustries(rows, await getT(locale, 'companies'))),
      listPublicPostings().catch(() => []),
    ])
    const postingCounts: Record<string, number> = {}
    for (const p of postings) postingCounts[p.company.id] = (postingCounts[p.company.id] || 0) + 1
    const knownIndustry = industries.some((i) => i.code === industry)
    const filtered = companies.filter(
      (c) => (!knownIndustry || c.industry === industry) && companyMatchesQuery(c, q),
    )
    return NextResponse.json({
      industries,
      companies: filtered.map((c) => ({
        // 후기(post.companyId)와 회사를 이름이 아닌 ID로 잇기 위해 앱이 사용
        id: c.id,
        slug: c.slug,
        name: c.name,
        // Ellieo: Korean aliases are search keywords only — not sent (no Korean on Ellieo)
        aliases: BRAND === 'ellieo' ? c.aliases.filter((a) => !/[\uac00-\ud7a3]/.test(a)) : c.aliases,
        industry: c.industry,
        industryLabel: industryLabelFrom(industries, c.industry),
        logoUrl: c.logoUrl,
        careersUrl: c.careersUrl,
        studentsUrl: c.studentsUrl,
        isFeatured: c.isFeatured,
        country: c.country,
        reviewCount: counts[c.id] || 0,
        postingCount: postingCounts[c.id] || 0,
      })),
    })
  } catch (error) {
    console.error('Companies list error:', error)
    return NextResponse.json({ companies: [], error: 'Failed to load companies.' }, { status: 500 })
  }
}
