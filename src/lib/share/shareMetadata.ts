import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getT } from '@lib/i18n/server'

/** Misaeng iOS app (com.misaeng.nyc) on the App Store. */
export const MISAENG_APP_STORE_ID = '6826454902'

export type ShareKind = 'housing' | 'visa' | 'review' | 'company' | 'postings'

const SHARE_IMAGE: Record<ShareKind, string> = {
  housing: '/og/share-housing.png',
  visa: '/og/share-default.png',
  review: '/og/share-default.png',
  company: '/og/share-default.png',
  postings: '/og/share-default.png',
}

/**
 * Link preview for pages shared from the app (KakaoTalk, iMessage …): a "shared from Misaeng" title per kind,
 * one unified preview image, and the App Store smart banner that opens the same page in the app.
 * `description` is a short summary for open pages; member-only pages pass nothing and get the members-only line.
 * Misaeng only — Ellieo keeps its own metadata.
 */
export async function shareMetadata(
  kind: ShareKind,
  locale: string,
  { path, description, memberOnly = false }: { path: string; description?: string; memberOnly?: boolean },
): Promise<Metadata> {
  if (BRAND_CONFIG.id !== 'misaeng') return {}
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'common')
  const title = t(`share.${kind}`)
  const summary = memberOnly ? t('share.memberOnly') : description?.trim() || undefined
  // `path` is the page path without the language prefix (`/nyc/housing/<id>`)
  const url = `${BRAND_CONFIG.siteUrl}${isLocale(locale) ? localePath(locale, path) : path}`
  // absolute: the root layout has no metadataBase
  const image = { url: `${BRAND_CONFIG.siteUrl}${SHARE_IMAGE[kind]}`, width: 1200, height: 630, alt: title }
  return {
    openGraph: {
      title,
      ...(summary ? { description: summary } : {}),
      siteName: BRAND_CONFIG.name,
      type: 'website',
      url,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, ...(summary ? { description: summary } : {}), images: [image.url] },
    itunes: { appId: MISAENG_APP_STORE_ID, appArgument: url },
  }
}
