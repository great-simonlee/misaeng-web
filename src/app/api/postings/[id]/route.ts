import { NextResponse } from 'next/server'
import { getRequestLocale, getRequestT } from '@lib/i18n/server'
import { localizePosting } from '@lib/translations/postings'
import { getPublicPosting } from '@lib/supabase/jobPostings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/postings/{id} — 공고 하나 (공유 링크로 앱이 열 때). 목록 항목과 같은 모양. 숨겨진·마감된 공고는 404 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const [posting, locale] = await Promise.all([getPublicPosting(id), getRequestLocale(request)])
    if (!posting) {
      const t = await getRequestT(request, 'api')
      return NextResponse.json({ error: t('postings.notFound') }, { status: 404 })
    }
    return NextResponse.json({ posting: localizePosting(posting, locale) })
  } catch (error) {
    console.error('Posting detail error:', error)
    const t = await getRequestT(request, 'api')
    return NextResponse.json({ error: t('postings.loadFailed') }, { status: 500 })
  }
}
