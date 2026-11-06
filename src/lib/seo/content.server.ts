import { cache } from 'react'

import type { Locale } from '@lib/i18n/locales'
import { getStoredCommunityPost } from '@lib/supabase/community.server'
import { getStoredHousingListing } from '@lib/supabase/housing.server'
import { localizeListing, localizePost } from '@lib/translations/localize.server'

/**
 * Server reads for page metadata (one Storage read per request: generateMetadata and the page share it).
 * Posts come back in the page language; on Ellieo a post with no en/vi version is null (the page 404s).
 */
export const loadPagePost = cache(async (id: string, locale: Locale) => {
  const post = await getStoredCommunityPost(id).catch(() => null)
  if (!post) return { exists: false as const, post: null }
  return { exists: true as const, post: localizePost(post, locale) }
})

export const loadPageListing = cache(async (id: string, locale: Locale) => {
  const listing = await getStoredHousingListing(id).catch(() => null)
  if (!listing || listing.status === 'closed') return null
  return localizeListing(listing, locale)
})
