import { NextResponse } from 'next/server'
import { getRequestLocale, getRequestT } from '@lib/i18n/server'
import { localizePosting } from '@lib/translations/postings'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import {
  getCompanyMoreUrl,
  listPublicPostings,
  forClientLevels,
  listPublicPostingsForCompany,
  listClosedPostingsForCompany,
} from '@lib/supabase/jobPostings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/postings?company=goldman-sachs&levels=all — 승인된 공고 (company 없으면 전체). levels=all 이 없으면 인턴·신입만 (예전 앱)
 * &closed=1 — 그 회사의 마감된 공고
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const company = params.get('company')?.trim() || ''
    const locale = await getRequestLocale(request)
    // 회사 페이지 "마감된 공고": ?company=…&closed=1
    if (company && params.get('closed') === '1') {
      const closed = forClientLevels(await listClosedPostingsForCompany(company), request)
      return NextResponse.json({ postings: closed.map((p) => localizePosting(p, locale)) })
    }
    if (!company) {
      const postings = forClientLevels(await listPublicPostings(), request)
      return NextResponse.json({ postings: postings.map((p) => localizePosting(p, locale)) })
    }
    const [all, found] = await Promise.all([listPublicPostingsForCompany(company), getActiveCompanyBySlug(company)])
    const postings = forClientLevels(all, request)
    const moreUrl = found ? await getCompanyMoreUrl(found.id) : null
    return NextResponse.json({ postings: postings.map((p) => localizePosting(p, locale)), moreUrl })
  } catch (error) {
    console.error('Postings list error:', error)
    const t = await getRequestT(request, 'api')
    return NextResponse.json({ postings: [], error: t('postings.loadFailed') }, { status: 500 })
  }
}
