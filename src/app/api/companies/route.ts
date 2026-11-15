import { NextResponse } from 'next/server'
import { getRequestT } from '@lib/i18n/server'
import { resolveCityId } from '@lib/constants/cities'
import { companyMatchesQuery } from '@lib/company/companyRules'
import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'
import {
  countReviewsByCompany,
  findOrProposeCompany,
  industryLabelFrom,
  isCompanyStorageConfigured,
  listActiveCompanies,
  listIndustries,
} from '@lib/supabase/companies.server'
import { forClientLevels, listPublicPostings } from '@lib/supabase/jobPostings.server'
import { daysUntil, todayInNewYork } from '@lib/company/postings'

/** "신규 공고": 이 시간 안에 등록된 공고 */
const NEW_POSTING_MS = 48 * 60 * 60 * 1000
/** "마감 임박": 마감일이 오늘부터 이 날수 안 */
const CLOSING_SOON_DAYS = 7

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

    const [companies, counts, industries, postings] = await Promise.all([
      listActiveCompanies(),
      countReviewsByCompany(city),
      listIndustries(),
      listPublicPostings().catch(() => []),
    ])
    const postingCounts: Record<string, number> = {}
    const newCounts: Record<string, number> = {}
    const closingCounts: Record<string, number> = {}
    const now = Date.now()
    const today = todayInNewYork()
    // 공고 수: 이 클라이언트가 보는 공고만 (?levels=all)
    for (const p of forClientLevels(postings, request)) {
      const id = p.company.id
      postingCounts[id] = (postingCounts[id] || 0) + 1
      if (now - p.postedAt <= NEW_POSTING_MS) newCounts[id] = (newCounts[id] || 0) + 1
      if (p.applyBy) {
        const left = daysUntil(p.applyBy, today)
        if (left >= 0 && left <= CLOSING_SOON_DAYS) closingCounts[id] = (closingCounts[id] || 0) + 1
      }
    }
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
        aliases: c.aliases,
        industry: c.industry,
        industryLabel: industryLabelFrom(industries, c.industry),
        logoUrl: c.logoUrl,
        careersUrl: c.careersUrl,
        studentsUrl: c.studentsUrl,
        isFeatured: c.isFeatured,
        country: c.country,
        reviewCount: counts[c.id] || 0,
        postingCount: postingCounts[c.id] || 0,
        // 앱 회사 목록 배지: 48시간 안에 올라온 공고 수, 7일 안에 마감되는 공고 수 (예전 앱은 무시)
        newPostingCount: newCounts[c.id] || 0,
        closingSoonCount: closingCounts[c.id] || 0,
      })),
    })
  } catch (error) {
    console.error('Companies list error:', error)
    return NextResponse.json({ companies: [], error: 'Failed to load companies.' }, { status: 500 })
  }
}

/**
 * POST /api/companies { name, industry? } — 후기 작성 화면 "'<이름>' 회사 등록하기" (로그인 필요).
 * 같은 이름의 회사가 있으면 그 회사, 없으면 검토 대기 회사(Misaeng에 안 보임)를 만들어 돌려준다.
 * → { company: { id, slug, name, industry, pending } | null, created }
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  if (!isCompanyStorageConfigured()) {
    return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
  }
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { name?: unknown; industry?: unknown } | null
  const result = await findOrProposeCompany({ name: body?.name, industry: body?.industry, uid: user.uid })
  if (!result.ok) {
    if (result.reason === 'invalid') return NextResponse.json({ error: t('companies.nameInvalid') }, { status: 400 })
    if (result.reason === 'tooMany') return NextResponse.json({ error: t('companies.tooMany') }, { status: 429 })
    return NextResponse.json({ error: t('common.requestFailed') }, { status: 500 })
  }
  return NextResponse.json({ company: result.company, created: result.created })
}
