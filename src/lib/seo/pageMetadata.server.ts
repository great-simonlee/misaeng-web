import type { Metadata } from 'next'

import { BRAND_CONFIG, brandLocalePath } from '@lib/brand'
import { isLocale, OG_LOCALES, type Locale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'

/**
 * Per-page metadata on Ellieo: title, description, Open Graph, canonical and hreflang (en + /vi).
 * Misaeng keeps the layout's metadata (returns {}), so misaeng.com pages are unchanged.
 */
export const PER_PAGE_METADATA = BRAND_CONFIG.id === 'ellieo'

export function serviceLocale(value: string): Locale {
  return isLocale(value) && BRAND_CONFIG.serviceLocales.includes(value) ? value : BRAND_CONFIG.serviceDefaultLocale
}

/** `/nyc/housing` → https://ellieo.com/vi/nyc/housing */
export function pageUrl(locale: Locale, path: string) {
  return `${BRAND_CONFIG.siteUrl}${brandLocalePath(BRAND_CONFIG, locale, path)}`
}

export async function pageMetadata(input: {
  locale: string
  /** Service path without the language prefix (`/nyc/housing/123`) */
  path: string
  /** Page name; becomes "<title> | Ellieo NYC" */
  title: string
  description?: string
  image?: string | null
  type?: 'website' | 'article'
  /** Languages the page exists in (default: all Ellieo languages) */
  locales?: readonly Locale[]
  noindex?: boolean
}): Promise<Metadata> {
  if (!PER_PAGE_METADATA) return {}
  const locale = serviceLocale(input.locale)
  const t = await getT(locale, 'common.seo')
  const title = t('titleTemplate', { title: input.title, brand: BRAND_CONFIG.name })
  const description = input.description?.replace(/\s+/g, ' ').trim().slice(0, 180) || undefined
  const locales = input.locales?.length ? input.locales : BRAND_CONFIG.serviceLocales
  const url = pageUrl(locale, input.path)
  const images = [
    input.image
      ? { url: input.image, alt: input.title }
      : { url: '/opengraph-image.png', width: 1200, height: 630, alt: title },
  ]
  return {
    title,
    ...(description ? { description } : {}),
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((code) => [code, pageUrl(code, input.path)])),
        'x-default': pageUrl(locales.includes(BRAND_CONFIG.serviceDefaultLocale) ? BRAND_CONFIG.serviceDefaultLocale : locales[0], input.path),
      },
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url,
      siteName: BRAND_CONFIG.name,
      locale: OG_LOCALES[locale],
      type: input.type ?? 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      images: images.map((image) => image.url),
    },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  }
}
