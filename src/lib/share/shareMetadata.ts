import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getT } from '@lib/i18n/server'

/** Misaeng iOS app (com.misaeng.nyc) on the App Store. */
export const MISAENG_APP_STORE_ID = '6826454902'

export type ShareKind = 'housing' | 'visa' | 'review' | 'company' | 'postings' | 'posting' | 'marketplace' | 'parentInvite'

/** Bumped when an image changes: KakaoTalk and others cache previews by image URL. */
const DEFAULT_IMAGE = '/og/share-default.png?v=2'

const SHARE_IMAGE: Record<ShareKind, string> = {
  housing: '/og/share-housing.png',
  visa: DEFAULT_IMAGE,
  review: DEFAULT_IMAGE,
  company: DEFAULT_IMAGE,
  postings: DEFAULT_IMAGE,
  posting: DEFAULT_IMAGE,
  marketplace: DEFAULT_IMAGE,
  // 학부모 초대 링크 (scripts/og-share-parent.html → public/og/share-parent.png)
  parentInvite: '/og/share-parent.png',
}

/**
 * Link preview for pages shared from the app (KakaoTalk, iMessage …): a "shared from Misaeng" title per kind,
 * one unified preview image, and the App Store smart banner that opens the same page in the app.
 * `description` is a short summary for open pages; member-only pages pass nothing and get the members-only line.
 * `title` replaces the per-kind title (a single posting: "Google · Associate Customer Engineer"); the per-kind line then
 * becomes the description. `logoUrl` (a square company logo) replaces the wide preview image with a small-card preview.
 * Misaeng only — Ellieo keeps its own metadata.
 */
export async function shareMetadata(
  kind: ShareKind,
  locale: string,
  {
    path,
    description,
    memberOnly = false,
    title: customTitle,
    logoUrl,
  }: { path: string; description?: string; memberOnly?: boolean; title?: string; logoUrl?: string | null },
): Promise<Metadata> {
  if (BRAND_CONFIG.id !== 'misaeng') return {}
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'common')
  const kindLine = t(`share.${kind}`)
  const title = customTitle?.trim() || kindLine
  const summary = memberOnly
    ? t('share.memberOnly')
    : description?.trim() || (title !== kindLine ? kindLine : undefined)
  // `path` is the page path without the language prefix (`/nyc/housing/<id>`)
  const url = `${BRAND_CONFIG.siteUrl}${isLocale(locale) ? localePath(locale, path) : path}`
  // absolute: the root layout has no metadataBase. SVG logos aren't shown by most link previews (KakaoTalk, iMessage).
  const logo = logoUrl && /^https:\/\//.test(logoUrl) && !/\.svg(\?|$)/i.test(logoUrl) ? logoUrl : null
  const image = logo
    ? { url: logo, alt: title }
    : { url: `${BRAND_CONFIG.siteUrl}${SHARE_IMAGE[kind]}`, width: 1200, height: 630, alt: title }
  return {
    openGraph: {
      title,
      ...(summary ? { description: summary } : {}),
      siteName: BRAND_CONFIG.name,
      type: 'website',
      url,
      images: [image],
    },
    twitter: {
      card: logo ? 'summary' : 'summary_large_image',
      title,
      ...(summary ? { description: summary } : {}),
      images: [image.url],
    },
    itunes: { appId: MISAENG_APP_STORE_ID, appArgument: url },
  }
}
