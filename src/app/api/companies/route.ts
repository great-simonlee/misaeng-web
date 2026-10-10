import { NextResponse } from 'next/server'
import { resolveCityId } from '@lib/constants/cities'
import { isCompanyIndustry } from '@lib/constants/company'
import { companyMatchesQuery } from '@lib/company/companyRules'
import {
  countReviewsByCompany,
  isCompanyStorageConfigured,
  listActiveCompanies,
} from '@lib/supabase/companies.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/companies?industry=tech&q=aws&city=nyc */
export async function GET(request: Request) {
  try {
    if (!isCompanyStorageConfigured()) {
      return NextResponse.json({ error: 'Supabase 설정이 필요해요.' }, { status: 503 })
    }
    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')?.trim() || ''
    const q = searchParams.get('q')?.trim() || ''
    const city = searchParams.get('city') ? resolveCityId(searchParams.get('city')) : undefined

    const [companies, counts] = await Promise.all([
      listActiveCompanies(),
      countReviewsByCompany(city),
    ])
    const filtered = companies.filter(
      (c) =>
        (!isCompanyIndustry(industry) || c.industry === industry) && companyMatchesQuery(c, q),
    )
    return NextResponse.json({
      companies: filtered.map((c) => ({
        slug: c.slug,
        name: c.name,
        aliases: c.aliases,
        industry: c.industry,
        logoUrl: c.logoUrl,
        careersUrl: c.careersUrl,
        studentsUrl: c.studentsUrl,
        isFeatured: c.isFeatured,
        country: c.country,
        reviewCount: counts[c.id] || 0,
      })),
    })
  } catch (error) {
    console.error('Companies list error:', error)
    return NextResponse.json({ companies: [], error: 'Failed to load companies.' }, { status: 500 })
  }
}
