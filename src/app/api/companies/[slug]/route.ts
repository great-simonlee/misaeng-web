import { NextResponse } from 'next/server'
import { resolveCityId } from '@lib/constants/cities'
import {
  countReviewsByCompany,
  getActiveCompanyBySlug,
  industryLabelFrom,
  isCompanyStorageConfigured,
  listActiveCompanies,
  listIndustries,
  type CompanyIndustryItem,
  type PublicCompany,
} from '@lib/supabase/companies.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

function summary(
  company: PublicCompany,
  counts: Record<string, number>,
  industries: CompanyIndustryItem[],
) {
  return {
    slug: company.slug,
    name: company.name,
    industry: company.industry,
    industryLabel: industryLabelFrom(industries, company.industry),
    logoUrl: company.logoUrl,
    reviewCount: counts[company.id] || 0,
  }
}

/** GET /api/companies/{slug} — 회사 + 모회사 + 자회사 */
export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isCompanyStorageConfigured()) {
      return NextResponse.json({ error: 'Supabase 설정이 필요해요.' }, { status: 503 })
    }
    const { slug } = await context.params
    const company = await getActiveCompanyBySlug(slug)
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city') ? resolveCityId(searchParams.get('city')) : undefined
    const [companies, counts, industries] = await Promise.all([
      listActiveCompanies(),
      countReviewsByCompany(city),
      listIndustries(),
    ])
    const parent = companies.find((c) => c.id === company.parentCompanyId) ?? null
    const children = companies.filter((c) => c.parentCompanyId === company.id)

    return NextResponse.json({
      company: {
        ...summary(company, counts, industries),
        aliases: company.aliases,
        careersUrl: company.careersUrl,
        studentsUrl: company.studentsUrl,
        isFeatured: company.isFeatured,
        websiteDomain: company.websiteDomain,
        country: company.country,
        atsType: company.atsType,
        visa: {
          h1bSponsor: company.h1bSponsor,
          eVerify: company.eVerify,
          optCpt: company.optCpt,
          summary: company.visaSummary,
          notice: company.visaNotice,
          sourceUrl: company.visaSourceUrl,
          checkedAt: company.visaCheckedAt,
        },
      },
      parent: parent ? summary(parent, counts, industries) : null,
      children: children.map((c) => summary(c, counts, industries)),
    })
  } catch (error) {
    console.error('Company detail error:', error)
    return NextResponse.json({ error: 'Failed to load company.' }, { status: 500 })
  }
}
