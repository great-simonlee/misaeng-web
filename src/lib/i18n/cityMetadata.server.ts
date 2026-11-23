import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isCityId } from '@lib/constants/cities'

import { isLocale, OG_LOCALES, type Locale } from './locales'
import { getT } from './server'

/**
 * Per-page title/description for the city pages ("하우징 · 보스턴 | Misaeng"). Without it every page inherited the
 * root "{brand} | 뉴욕 유학생·직장인 커뮤니티", Boston included. og/twitter are set in full because a child's
 * openGraph replaces the root one (images included).
 */

export function metadataLocale(locale: string): Locale {
  return isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale
}

export async function cityName(locale: string, city: string): Promise<string> {
  const t = await getT(metadataLocale(locale), 'common')
  return t(`meta.cities.${isCityId(city) ? city : 'nyc'}`)
}

export async function cityPageMetadata(input: {
  locale: string
  city: string
  /** Page name (already translated); omitted = the city hub title */
  page?: string
  description?: string
  /** Title without the city (legal pages, account pages) */
  withoutCity?: boolean
  noindex?: boolean
}): Promise<Metadata> {
  const locale = metadataLocale(input.locale)
  const t = await getT(locale, 'common')
  const city = await cityName(locale, input.city)
  const brand = BRAND_CONFIG.name
  const title = !input.page
    ? t('meta.hubTitle', { brand, city })
    : input.withoutCity
      ? t('meta.pageOnly', { page: input.page, brand })
      : t('meta.page', { page: input.page, city, brand })
  const description = input.description
  return {
    title,
    ...(description ? { description } : {}),
    openGraph: {
      title,
      ...(description ? { description } : {}),
      siteName: brand,
      locale: OG_LOCALES[locale],
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      images: ['/twitter-image.png'],
    },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  }
}

/** Shorthand for a page named by a `common.meta.pages.*` key */
export async function namedCityPageMetadata(
  locale: string,
  city: string,
  page: string,
  options: { description?: string; params?: Record<string, string>; withoutCity?: boolean; noindex?: boolean } = {},
): Promise<Metadata> {
  const t = await getT(metadataLocale(locale), 'common')
  return cityPageMetadata({
    locale,
    city,
    page: t(`meta.pages.${page}`, options.params),
    description: options.description,
    withoutCity: options.withoutCity,
    noindex: options.noindex,
  })
}

/** `common.meta.descriptions.*` with the city filled in */
export async function cityDescription(locale: string, city: string, key: string): Promise<string> {
  const t = await getT(metadataLocale(locale), 'common')
  return t(`meta.descriptions.${key}`, { city: await cityName(locale, city) })
}

/** Tab title only, for pages whose link preview (openGraph) already comes from shareMetadata */
export async function cityPageTitle(locale: string, city: string, page: string, withoutCity = false): Promise<string> {
  const t = await getT(metadataLocale(locale), 'common')
  const brand = BRAND_CONFIG.name
  return withoutCity
    ? t('meta.pageOnly', { page, brand })
    : t('meta.page', { page, city: await cityName(locale, city), brand })
}

/** `common.meta.pages.*` name, translated */
export async function pageName(locale: string, key: string, params?: Record<string, string>): Promise<string> {
  const t = await getT(metadataLocale(locale), 'common')
  return t(`meta.pages.${key}`, params)
}
