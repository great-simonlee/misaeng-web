import type { MetadataRoute } from 'next'

import { BRAND_CONFIG, brandLocalePath } from '@lib/brand'
import { communityPostMatchesCity, isSharedCommunityBoard, type CityId } from '@lib/constants/cities'
import { NYC_CATEGORIES, resolveMergedCommunityBoardId } from '@lib/constants/nyc'
import type { Locale } from '@lib/i18n/locales'
import { listStoredCommunityPosts } from '@lib/supabase/community.server'
import { listStoredHousingListings } from '@lib/supabase/housing.server'
import { localizePosts } from '@lib/translations/localize.server'

/**
 * /sitemap.xml per brand.
 * - Ellieo: ellieo.com URLs in en (no prefix) and /vi only (ko lives on misaeng.com). City pages, boards,
 *   posts that have a version in that language (src/lib/translations/localize.server.ts) and open listings.
 * - Misaeng: empty — misaeng.com had no sitemap before; add one there separately if wanted.
 */
export const revalidate = 3600

/** Cities with Ellieo content today */
const SITEMAP_CITIES: CityId[] = ['nyc']

const STATIC_PAGES = ['', '/housing', '/companies', '/companies/postings', '/partners', '/about', '/terms-of-use', '/privacy-policy']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (BRAND_CONFIG.id !== 'ellieo') return []
  const base = BRAND_CONFIG.productionUrl
  const locales = BRAND_CONFIG.serviceLocales
  const url = (locale: Locale, path: string) => `${base}${brandLocalePath(BRAND_CONFIG, locale, path)}`
  /** One entry per language, each listing the others as hreflang alternates */
  const entry = (path: string, lastModified?: number, onlyLocales: readonly Locale[] = locales) =>
    onlyLocales.map((locale) => ({
      url: url(locale, path),
      ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
      alternates: { languages: Object.fromEntries(onlyLocales.map((alt) => [alt, url(alt, path)])) },
    }))

  const out: MetadataRoute.Sitemap = []
  const boards = NYC_CATEGORIES.filter((category) => category.available && category.id !== 'housing')

  const [posts, listings] = await Promise.all([
    listStoredCommunityPosts().catch(() => []),
    listStoredHousingListings().catch(() => []),
  ])

  for (const city of SITEMAP_CITIES) {
    for (const page of STATIC_PAGES) out.push(...entry(`/${city}${page}`))
    for (const board of boards) out.push(...entry(`/${city}${board.href}`))

    // Posts: only in the languages they are shown in on Ellieo
    const shownIn = new Map<string, Locale[]>()
    for (const locale of locales) {
      for (const post of localizePosts(posts, locale)) shownIn.set(post.id, [...(shownIn.get(post.id) ?? []), locale])
    }
    for (const post of posts) {
      const inLocales = shownIn.get(post.id)
      if (!inLocales?.length) continue
      if (!isSharedCommunityBoard(post.categoryId) && !communityPostMatchesCity(post, city)) continue
      const boardId = resolveMergedCommunityBoardId(post.categoryId) ?? post.categoryId
      const board = NYC_CATEGORIES.find((category) => category.id === boardId)
      if (!board?.available) continue
      out.push(...entry(`/${city}${board.href}/${encodeURIComponent(post.id)}`, post.updatedAt, inLocales))
    }

    for (const listing of listings) {
      if (listing.status === 'closed') continue
      if (listing.city && listing.city !== city) continue
      out.push(...entry(`/${city}/housing/${encodeURIComponent(listing.id)}`, listing.updatedAt))
    }
  }
  return out
}
