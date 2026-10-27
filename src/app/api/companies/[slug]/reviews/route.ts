import { NextResponse } from 'next/server'
import { getRequestLocale, getRequestT } from '@lib/i18n/server'
import { localizePosts } from '@lib/translations/localize.server'
import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { resolveCityId } from '@lib/constants/cities'
import { sanitizeAnonymousCommunityPost } from '@lib/community/anonymous'
import { getViewerBlockedUids, withoutBlockedAuthors } from '@lib/community/blocks.server'
import { withoutModeratedPosts } from '@lib/community/moderation'
import { getViewerReportedKeys } from '@lib/community/reports.server'
import { splitReviewForViewer } from '@lib/community/reviewAccess'
import {
  getActiveCompanyBySlug,
  isCompanyStorageConfigured,
  listActiveCompanies,
  listCompanyReviewPosts,
} from '@lib/supabase/companies.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * GET /api/companies/{slug}/reviews?includeSubsidiaries=1&type=intern&city=nyc
 * 각 후기는 { meta, body, canViewBody } — 본문 열람 판단은 canViewReviewBody 한 곳에서.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isCompanyStorageConfigured()) {
      const t = await getRequestT(request, 'api')
      return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
    }
    const { slug } = await context.params
    const company = await getActiveCompanyBySlug(slug)
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const includeSubsidiaries = searchParams.get('includeSubsidiaries') === '1'
    const type = searchParams.get('type')?.trim() || ''
    const city = searchParams.get('city') ? resolveCityId(searchParams.get('city')) : undefined

    const ids = new Set([company.id])
    if (includeSubsidiaries) {
      for (const c of await listActiveCompanies()) {
        if (c.parentCompanyId === company.id) ids.add(c.id)
      }
    }

    const [viewer, posts] = await Promise.all([
      resolveAuthenticatedUser(),
      listCompanyReviewPosts(city),
    ])
    const [blocked, reported] = await Promise.all([
      getViewerBlockedUids(viewer?.uid),
      getViewerReportedKeys(viewer?.uid),
    ])
    const locale = await getRequestLocale(request)
    // 신고로 숨겨진 후기·내가 신고한 후기는 뺀다
    const reviews = localizePosts(withoutModeratedPosts(withoutBlockedAuthors(posts, blocked), reported), locale)
      .filter((post) => post.companyId && ids.has(post.companyId))
      .filter((post) => !type || post.jobReviewType === type)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((post) =>
        splitReviewForViewer(sanitizeAnonymousCommunityPost(post, viewer?.uid), viewer),
      )

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Company reviews error:', error)
    return NextResponse.json({ reviews: [], error: 'Failed to load reviews.' }, { status: 500 })
  }
}
