import { NextResponse } from 'next/server'
import { getRequestLocale, getRequestT } from '@lib/i18n/server'
import { localizePosting } from '@lib/translations/postings'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import {
  getCompanyMoreUrl,
  listPublicPostings,
  listPublicPostingsForCompany,
} from '@lib/supabase/jobPostings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/postings?company=goldman-sachs — 승인된 인턴·신입 공고 (company 없으면 전체) */
export async function GET(request: Request) {
  try {
    const company = new URL(request.url).searchParams.get('company')?.trim() || ''
    const locale = await getRequestLocale(request)
    if (!company) {
      const postings = await listPublicPostings()
      return NextResponse.json({ postings: postings.map((p) => localizePosting(p, locale)) })
    }
    const [postings, found] = await Promise.all([listPublicPostingsForCompany(company), getActiveCompanyBySlug(company)])
    const moreUrl = found ? await getCompanyMoreUrl(found.id) : null
    return NextResponse.json({ postings: postings.map((p) => localizePosting(p, locale)), moreUrl })
  } catch (error) {
    console.error('Postings list error:', error)
    const t = await getRequestT(request, 'api')
    return NextResponse.json({ postings: [], error: t('postings.loadFailed') }, { status: 500 })
  }
}
