import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { isCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { localePath } from '@lib/i18n/paths'
import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityDetailScreen } from '@screens/nyc/CommunityDetailScreen'
import { BRAND_CONFIG } from '@lib/brand'
import { loadPagePost } from '@lib/seo/content.server'
import { PER_PAGE_METADATA, pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'

interface CommunityDetailPageProps {
  params: Promise<{ locale: string; city: string; board: string; id: string }>
}

export async function generateMetadata({ params }: CommunityDetailPageProps): Promise<Metadata> {
  if (!PER_PAGE_METADATA) return {}
  const { locale, city, board, id } = await params
  const category = isCommunityBoardId(board) ? getNycCategory(board) : null
  if (!category || !isCityId(city)) return {}
  const viewLocale = serviceLocale(locale)
  const { post } = await loadPagePost(id, viewLocale)
  if (!post || post.status !== 'open' || post.moderation?.hidden) return { robots: { index: false, follow: false } }
  const t = await getT(viewLocale, 'common.seo')
  // Job review bodies are for members only (reviewAccess.ts): never in the page description
  const description =
    post.categoryId === 'job-review'
      ? t('jobReviewDescription', {
          company: post.location || '',
          type: post.jobReviewType || '',
          brand: BRAND_CONFIG.name,
        })
      : post.description
  return pageMetadata({
    locale,
    path: `/${city}${category.href}/${encodeURIComponent(id)}`,
    title: post.title || t('postFallback'),
    description,
    image: post.categoryId === 'job-review' ? null : post.thumbnailUrl,
    type: 'article',
  })
}

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { locale, city, board, id } = await params
  if (!isLocale(locale) || !isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(localePath(locale, `${redirectTo}/${id}`))

  const category = getNycCategory(board)
  if (!category) notFound()

  const t = await getT(locale, 'community')
  const title = t(`categories.${category.id}.title`)

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={title} />
  }

  // Ellieo: a post with no en/vi version (Korean only) does not exist there — real 404
  if (PER_PAGE_METADATA) {
    const found = await loadPagePost(id, serviceLocale(locale))
    if (found.exists && !found.post) notFound()
  }

  return (
    <CommunityDetailScreen
      boardId={board}
      title={title}
      postId={id}
    />
  )
}
