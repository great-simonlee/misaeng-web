import { NextResponse } from 'next/server'
import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { COMPANY_CLICK_KINDS, type CompanyClickKind } from '@lib/constants/company'
import { getActiveCompanyBySlug, recordCompanyClick } from '@lib/supabase/companies.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

/** POST /api/companies/{slug}/click  { kind: 'careers' | 'students' } */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params
    const body = (await request.json().catch(() => null)) as { kind?: string } | null
    const kind = (COMPANY_CLICK_KINDS as readonly string[]).includes(String(body?.kind))
      ? (body!.kind as CompanyClickKind)
      : null
    if (!kind) return NextResponse.json({ error: 'Invalid kind.' }, { status: 400 })

    const company = await getActiveCompanyBySlug(slug)
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const user = await resolveAuthenticatedUser().catch(() => null)
    const ok = await recordCompanyClick({ companyId: company.id, kind, userId: user?.uid ?? null })
    return NextResponse.json({ ok })
  } catch (error) {
    console.error('Company click error:', error)
    // 클릭 기록 실패가 링크 이동을 막지 않도록 200
    return NextResponse.json({ ok: false })
  }
}
