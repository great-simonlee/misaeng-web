import { NextResponse } from 'next/server'
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
    if (!company) return NextResponse.json({ postings: await listPublicPostings() })
    const [postings, found] = await Promise.all([listPublicPostingsForCompany(company), getActiveCompanyBySlug(company)])
    const moreUrl = found ? await getCompanyMoreUrl(found.id) : null
    return NextResponse.json({ postings, moreUrl })
  } catch (error) {
    console.error('Postings list error:', error)
    return NextResponse.json({ postings: [], error: '공고를 불러오지 못했어요.' }, { status: 500 })
  }
}
